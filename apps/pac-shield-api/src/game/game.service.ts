import { Injectable, NotFoundException, Logger, BadRequestException, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { TeamType, RunwayStatus, MOGLevel, AccessStatus, Country } from '.prisma/client';
import { CreateGameDto, Game } from '../app/generated';
import { GameGateway } from './game.gateway';
import { JoinGameDto } from './dto/join-game.dto';
import { PlayerService } from '../app/player/player.service';

/**
 * Domain service handling game lifecycle operations: creation, retrieval, room-code validation, and join orchestration.
 * Coordinates:
 * - PrismaService for database IO
 * - AuthService to mint JWTs for sessions
 * - PlayerService to create players
 * - GameGateway to broadcast real-time events (e.g., playerJoined)
 */
@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private gameGateway: GameGateway,
    private playerService: PlayerService
  ) { }

  /**
   * Creates a new multiplayer game session with unique room code and team structure.
   * Generates collision-resistant 6-character alphanumeric room codes for player joining.
   * Initializes all team types (BLUE_TEAM, RED_TEAM, etc.) from Prisma enum for balanced gameplay.
   */
  async createGame(createGameDto: CreateGameDto): Promise<Game> {
    const { victoryConditionMP } = createGameDto;
    let roomCode: string;

    try {
      do {
        roomCode = this.generateRoomCode();
      } while (await this.prisma.game.findUnique({ where: { roomCode } }));
    } catch (error) {
      this.logger.error('Database connection error while checking room code:', error);
      throw new Error('Database connection failed. Please ensure the database is running and properly configured.');
    }

    const game = await this.prisma.game.create({
      data: {
        roomCode,
        victoryConditionMP,
      },
    });

    // Create teams according to OPS User Guide specifications
    const teams = [
      { type: TeamType.CAOC, name: 'CAOC Team' },
      { type: TeamType.CSPOC, name: 'CSpOC Team' },
      { type: TeamType.MOB_KADENA, name: 'MOB Kadena, Japan' },
      { type: TeamType.MOB_ANDERSEN, name: 'MOB Andersen, Guam' },
      { type: TeamType.MOB_YOKOTA, name: 'MOB Yokota, Japan' },
      { type: TeamType.MOB_OSAN, name: 'MOB Osan, RoK' },
      { type: TeamType.MOB_JBPHH, name: 'JBPHH, Hawaii' },
      { type: TeamType.MEDCOM, name: 'MEDCOM Team' },
      { type: TeamType.GM, name: 'Game Master' },
    ];

    for (const teamData of teams) {
      await this.prisma.team.create({
        data: {
          gameId: game.id,
          type: teamData.type,
          name: teamData.name,
        },
      });
    }

    return game;
  }

  /**
   * Fetch a game by id including teams and players.
   * Used by lobby UI to render current roster.
   * Throws NotFoundException if game doesn't exist.
   */
  async getGameById(id: number): Promise<Game> {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            players: true,
          },
        },
        players: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID "${id}" not found`);
    }

    return game;
  }

  /**
   * Validate a 6-character room code without loading full game details.
   * @returns { valid: boolean, gameId?: number } to support client-side routing.
   */
  async validateRoomCode(roomCode: string): Promise<{ valid: boolean; gameId?: number }> {
    const game = await this.prisma.game.findUnique({
      where: { roomCode },
      select: { id: true }
    });

    return {
      valid: !!game,
      gameId: game?.id
    };
  }

  /**
   * Handles player joining existing game session via room code.
   * Creates player record, broadcasts join event to other players in real-time,
   * and returns JWT token for authenticated game participation and API access.
   */
  async joinGame(joinGameDto: JoinGameDto) {
    const { roomCode, playerName } = joinGameDto;

    const game = await this.prisma.game.findUnique({
      where: { roomCode },
    });

    if (!game) {
      throw new NotFoundException('Invalid room code');
    }

    const player = await this.playerService.createPlayerInGame(
      playerName,
      game.id
    );

    this.gameGateway.server.to(roomCode).emit('playerJoined', player);

    return this.authService.login(game.id, player.id);
  }

  // =============================================================================
  // Country Access - Optimistic Concurrency Helpers and Operations
  // =============================================================================

  /**
   * Build ETag string for country access payload
   * Format: W/"country-access:{gameId}:{version}"
   */
  public buildETag(gameId: number, version: number): string {
    return `W/"country-access:${gameId}:${version}"`;
  }

  /**
   * Parse If-Match header and return version if valid for this gameId, otherwise null.
   * Supports multiple comma-separated ETags per RFC semantics.
   */
  public parseIfMatch(gameId: number, ifMatchETag?: string): number | null {
    if (!ifMatchETag) return null;
    const candidates = ifMatchETag.split(',').map(s => s.trim());
    for (const tag of candidates) {
      const m = /^W\/"country-access:(\d+):(\d+)"$/.exec(tag);
      if (m) {
        const gid = Number(m[1]);
        const ver = Number(m[2]);
        if (gid === gameId) return ver;
      }
    }
    return null;
  }

  /**
   * Return current snapshot of country access for a game.
   * - Validates game existence (404 if missing)
   * - Reads all PoliticalAccess rows for the game's board
   * - Maps AccessStatus -> boolean (FULL_ACCESS = true, others = false)
   * - Version is sourced from GameCountryAccessState (0 if absent)
   */
  public async getCountryAccessSnapshot(
    gameId: number
  ): Promise<{ version: number; countries: Record<string, boolean> }> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true },
    });
    if (!game) {
      throw new NotFoundException(`Game with ID "${gameId}" not found`);
    }

    const board = await this.prisma.gameBoard.findUnique({
      where: { gameId },
      select: { id: true },
    });

    let countries: Record<string, boolean> = {};
    if (board) {
      const rows = await this.prisma.politicalAccess.findMany({
        where: { boardId: board.id },
        select: { country: true, access: true },
      });
      countries = rows.reduce((acc, row) => {
        acc[row.country] = row.access === AccessStatus.FULL_ACCESS;
        return acc;
      }, {} as Record<string, boolean>);
    }

    const state = await (this.prisma as any).gameCountryAccessState.findUnique({
      where: { gameId },
      select: { version: true },
    });

    const version = state?.version ?? 0;
    return { version, countries };
  }

  /**
   * Apply changes with optimistic concurrency controlled by If-Match ETag.
   * - Validates game existence (404)
   * - Validates If-Match (428 if missing, 412 if mismatch with latest version)
   * - Ensures GameBoard exists (create if missing)
   * - Validates countries against Country enum (400 on unknown)
   * - Applies changes:
   *   - null -> delete row
   *   - boolean -> upsert PoliticalAccess.access (FULL_ACCESS if true, NO_ACCESS if false)
   *   - overflight defaults to NO_ACCESS on create
   * - Bumps version if any effective change; lazy-init state at version=1
   * - Returns latest snapshot
   */
  public async applyCountryAccessChanges(
    gameId: number,
    changes: Record<string, boolean | null>,
    ifMatchETag: string
  ): Promise<{ version: number; countries: Record<string, boolean> }> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Ensure game exists
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: { id: true },
      });
      if (!game) {
        throw new NotFoundException(`Game with ID "${gameId}" not found`);
      }

      // Read current state/version
      const state = await (tx as any).gameCountryAccessState.findUnique({
        where: { gameId },
        select: { version: true },
      });
      const currentVersion = state?.version ?? 0;

      // Validate If-Match
      if (!ifMatchETag) {
        throw new HttpException({ message: 'If-Match header required' }, 428);
      }
      const ifMatchVersion = this.parseIfMatch(gameId, ifMatchETag);
      if (ifMatchVersion === null || ifMatchVersion !== currentVersion) {
        // 412 Precondition Failed with latest version in body
        throw new HttpException({ version: currentVersion }, 412);
      }

      // Ensure GameBoard exists
      let board = await tx.gameBoard.findUnique({
        where: { gameId },
        select: { id: true },
      });
      if (!board) {
        board = await tx.gameBoard.create({
          data: { gameId },
          select: { id: true },
        });
      }

      // Validate payload
      if (changes == null || typeof changes !== 'object') {
        throw new BadRequestException('Invalid payload: "changes" must be an object of { [country]: boolean | null }');
      }
      const keys = Object.keys(changes);
      const validCountryValues = new Set(Object.values(Country) as string[]);
      for (const key of keys) {
        if (!validCountryValues.has(key)) {
          throw new BadRequestException(`Unknown country: ${key}`);
        }
        const v = (changes as any)[key];
        if (!(v === true || v === false || v === null)) {
          throw new BadRequestException(`Invalid value for ${key}: must be true, false, or null`);
        }
      }

      // Read existing rows for changed countries
      const existing = await tx.politicalAccess.findMany({
        where: {
          boardId: board.id,
          country: { in: keys as any },
        },
        select: { id: true, country: true, access: true },
      });
      const existingMap = new Map<string, { id: number; country: Country; access: AccessStatus }>(
        existing.map((r) => [r.country as unknown as string, r])
      );
      let modified = 0;

      for (const key of keys) {
        const value = (changes as any)[key] as boolean | null;
        const existingRow = existingMap.get(key);

        if (value === null) {
          if (existingRow) {
            await tx.politicalAccess.delete({ where: { id: existingRow.id } });
            modified++;
          }
          continue;
        }

        const desiredAccess = value ? AccessStatus.FULL_ACCESS : AccessStatus.NO_ACCESS;

        if (!existingRow) {
          await tx.politicalAccess.create({
            data: {
              boardId: board.id,
              country: key as any,
              access: desiredAccess,
              overflight: AccessStatus.NO_ACCESS,
            },
          });
          modified++;
        } else if (existingRow.access !== desiredAccess) {
          await tx.politicalAccess.update({
            where: { id: existingRow.id },
            data: { access: desiredAccess },
          });
          modified++;
        }
      }

      // Version bump if any effective change
      let newVersion = currentVersion;
      if (modified > 0) {
        if (state) {
          const updated = await (tx as any).gameCountryAccessState.update({
            where: { gameId },
            data: { version: currentVersion + 1 },
            select: { version: true },
          });
          newVersion = updated.version;
        } else {
          const created = await (tx as any).gameCountryAccessState.create({
            data: { gameId, version: 1 },
            select: { version: true },
          });
          newVersion = created.version;
        }
      }

      // Load latest snapshot to return
      const allRows = await tx.politicalAccess.findMany({
        where: { boardId: board.id },
        select: { country: true, access: true },
      });
      const countries: Record<string, boolean> = {};
      for (const row of allRows) {
        countries[row.country] = row.access === AccessStatus.FULL_ACCESS;
      }

      return { version: newVersion, countries };
    });

    // Best-effort broadcast (non-blocking)
    try {
      (this.gameGateway as any)?.publishCountryAccessUpdated?.(gameId, {
        version: result.version,
        changes,
      });
    } catch (err) {
      this.logger.warn(`Broadcast country access update failed for game ${gameId}: ${err}`);
    }

    return result;
  }

  /**
   * Generate a collision-resistant 6-char uppercase alphanumeric room code.
   * Uses Math.random; acceptable for human-friendly codes, not cryptographic.
   */
  private generateRoomCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  }
}

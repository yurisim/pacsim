import { Injectable, NotFoundException, Logger, BadRequestException, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { TeamType, RunwayStatus, MOGLevel, AccessStatus, Country } from '.prisma/client';
import { CreateGameDto, Game } from '../app/generated';
import { GameGateway } from './game.gateway';
import { JoinGameDto } from './dto/join-game.dto';
import { PlayerService } from '../app/player/player.service';
import { EventsGateway } from '../app/events.gateway';
import { UpdateDiceRollDto, BulkDiceRollDto, BulkAccessUpdateDto } from './dto/dice-roll.dto';

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
    private playerService: PlayerService,
    private eventsGateway: EventsGateway
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
  // Country Access - Database Operations (Database → Local Storage Pattern)
  // =============================================================================

  /**
   * Return current snapshot of country access for a game using CountryAccess table.
   * Database → Local Storage pattern: reads from database, cached on frontend.
   */
  public async getCountryAccessSnapshot(
    gameId: number
  ): Promise<{ countries: Record<string, boolean> }> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true },
    });
    if (!game) {
      throw new NotFoundException(`Game with ID "${gameId}" not found`);
    }

    const countryAccessRows = await this.prisma.countryAccess.findMany({
      where: { gameId },
      select: { country: true, accessLevel: true },
    });

    const countries: Record<string, boolean> = {};
    for (const row of countryAccessRows) {
      countries[row.country] = row.accessLevel === AccessStatus.FULL_ACCESS;
    }

    return { countries };
  }

  /**
   * Apply country access changes using CountryAccess table.
   * Database → Local Storage pattern: persists to database, frontend will sync via cache.
   */
  public async applyCountryAccessChanges(
    gameId: number,
    changes: Record<string, boolean | null>
  ): Promise<{ countries: Record<string, boolean> }> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Ensure game exists
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: { id: true },
      });
      if (!game) {
        throw new NotFoundException(`Game with ID "${gameId}" not found`);
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

      // Apply changes to CountryAccess table
      for (const key of keys) {
        const value = (changes as any)[key] as boolean | null;
        const country = key as Country;

        if (value === null) {
          // Delete country access entry
          await tx.countryAccess.deleteMany({
            where: { gameId, country }
          });
        } else {
          // Upsert country access entry
          const accessLevel = value ? AccessStatus.FULL_ACCESS : AccessStatus.NO_ACCESS;
          await tx.countryAccess.upsert({
            where: {
              gameId_country: { gameId, country }
            },
            update: {
              accessLevel,
              diceRoll: value ? 10 : 1, // High roll = access, low roll = no access
            },
            create: {
              gameId,
              country,
              accessLevel,
              diceRoll: value ? 10 : 1,
            },
          });
        }
      }

      // Load latest snapshot to return
      const allRows = await tx.countryAccess.findMany({
        where: { gameId },
        select: { country: true, accessLevel: true },
      });
      const countries: Record<string, boolean> = {};
      for (const row of allRows) {
        countries[row.country] = row.accessLevel === AccessStatus.FULL_ACCESS;
      }

      return { countries };
    });

    // Broadcast changes for real-time updates
    try {
      (this.gameGateway as any)?.publishCountryAccessUpdated?.(gameId, {
        changes,
      });
    } catch (err) {
      this.logger.warn(`Broadcast country access update failed for game ${gameId}: ${err}`);
    }

    return result;
  }

  /**
   * Update dice roll for a specific country.
   * Database → Local Storage pattern: persists to database, frontend will sync via cache.
   */
  public async updateCountryDiceRoll(
    gameId: number,
    country: Country,
    updateDto: UpdateDiceRollDto
  ): Promise<{ country: Country; diceRoll: number; accessLevel: AccessStatus }> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Ensure game exists
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: { id: true },
      });
      if (!game) {
        throw new NotFoundException(`Game with ID "${gameId}" not found`);
      }

      // Calculate access level based on dice roll (standard ACE rules)
      const accessLevel = this.calculateAccessLevel(updateDto.diceRoll);

      // Upsert country access with new dice roll
      const countryAccess = await tx.countryAccess.upsert({
        where: {
          gameId_country: { gameId, country }
        },
        update: {
          diceRoll: updateDto.diceRoll,
          accessLevel,
          notes: updateDto.notes || null,
        },
        create: {
          gameId,
          country,
          diceRoll: updateDto.diceRoll,
          accessLevel,
          notes: updateDto.notes || null,
        },
        select: { country: true, diceRoll: true, accessLevel: true },
      });

      return countryAccess;
    });

    // Broadcast dice roll update
    try {
      (this.gameGateway as any)?.publishDiceRollUpdated?.(gameId, {
        country: result.country,
        diceRoll: result.diceRoll,
        accessLevel: result.accessLevel,
      });
    } catch (err) {
      this.logger.warn(`Broadcast dice roll update failed for game ${gameId}: ${err}`);
    }

    return result;
  }

  /**
   * Update dice rolls for multiple countries.
   * Database → Local Storage pattern: persists to database, frontend will sync via cache.
   */
  public async updateBulkDiceRolls(
    gameId: number,
    bulkDto: BulkDiceRollDto
  ): Promise<{ countries: Array<{ country: Country; diceRoll: number; accessLevel: AccessStatus }> }> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Ensure game exists
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: { id: true },
      });
      if (!game) {
        throw new NotFoundException(`Game with ID "${gameId}" not found`);
      }

      // Validate dice rolls
      for (const { diceRoll } of bulkDto.diceRolls) {
        if (diceRoll < 1 || diceRoll > 20) {
          throw new BadRequestException(`Invalid dice roll: ${diceRoll}. Must be between 1 and 20.`);
        }
      }

      // Update all country dice rolls
      const countries = [];
      for (const { country, diceRoll } of bulkDto.diceRolls) {
        const accessLevel = this.calculateAccessLevel(diceRoll);

        const countryAccess = await tx.countryAccess.upsert({
          where: {
            gameId_country: { gameId, country }
          },
          update: {
            diceRoll,
            accessLevel,
            notes: bulkDto.notes || null,
          },
          create: {
            gameId,
            country,
            diceRoll,
            accessLevel,
            notes: bulkDto.notes || null,
          },
          select: { country: true, diceRoll: true, accessLevel: true },
        });

        countries.push(countryAccess);
      }

      return { countries };
    });

    // Broadcast bulk dice roll update
    try {
      (this.gameGateway as any)?.publishBulkDiceRollUpdated?.(gameId, {
        countries: result.countries,
      });
    } catch (err) {
      this.logger.warn(`Broadcast bulk dice roll update failed for game ${gameId}: ${err}`);
    }

    return result;
  }

  /**
   * Update access level for multiple countries (bulk operation).
   * Database → Local Storage pattern: persists to database, frontend will sync via cache.
   */
  public async updateBulkCountryAccess(
    gameId: number,
    bulkDto: BulkAccessUpdateDto
  ): Promise<{ countries: Array<{ country: Country; accessLevel: AccessStatus }> }> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Ensure game exists
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: { id: true },
      });
      if (!game) {
        throw new NotFoundException(`Game with ID "${gameId}" not found`);
      }

      // Determine which countries to update
      const targetCountries = bulkDto.countries || Object.values(Country);

      // Update access level for all target countries
      const countries = [];
      for (const country of targetCountries) {
        const countryAccess = await tx.countryAccess.upsert({
          where: {
            gameId_country: { gameId, country }
          },
          update: {
            accessLevel: bulkDto.accessLevel,
            notes: bulkDto.notes || null,
          },
          create: {
            gameId,
            country,
            accessLevel: bulkDto.accessLevel,
            diceRoll: 1, // Default low roll for restricted access
            notes: bulkDto.notes || null,
          },
          select: { country: true, accessLevel: true },
        });

        countries.push(countryAccess);
      }

      return { countries };
    });

    // Broadcast bulk access update
    try {
      if (this.gameGateway && typeof this.gameGateway.publishBulkAccessUpdated === 'function') {
        this.gameGateway.publishBulkAccessUpdated(gameId, {
          accessLevel: bulkDto.accessLevel,
          countries: result.countries.map(c => c.country),
        });
        this.logger.log(`Bulk access update broadcast sent for game ${gameId}: ${result.countries.length} countries to ${bulkDto.accessLevel}`);
      } else {
        this.logger.warn(`GameGateway not available or publishBulkAccessUpdated method missing for game ${gameId}`);
      }
    } catch (err) {
      this.logger.error(`Broadcast bulk access update failed for game ${gameId}: ${err}`, err instanceof Error ? err.stack : undefined);
    }

    return result;
  }

  /**
   * Calculate access level based on dice roll using standard ACE rules.
   * Dice Roll 1-5: NO_ACCESS
   * Dice Roll 6-15: OVERFLIGHT_ONLY
   * Dice Roll 16-20: FULL_ACCESS
   */
  private calculateAccessLevel(diceRoll: number): AccessStatus {
    if (diceRoll >= 16) return AccessStatus.FULL_ACCESS;
    if (diceRoll >= 6) return AccessStatus.OVERFLIGHT_ONLY;
    return AccessStatus.NO_ACCESS;
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

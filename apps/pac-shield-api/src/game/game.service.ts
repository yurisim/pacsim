import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { TeamType, RunwayStatus, MOGLevel } from '.prisma/client';
import { CreateGameDto, Game } from '../app/generated';
import { GameGateway } from './game.gateway';
import { JoinGameDto } from './dto/join-game.dto';
import { PlayerService } from '../app/player/player.service';
import { EventsGateway } from '../app/events.gateway';
import { PoliticalAccessLevel, PoliticalAccessType } from './dto/update-country-access.dto';

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
  private countryAccessByGame = new Map<number, Map<string, { access: PoliticalAccessLevel; overflight: PoliticalAccessLevel; updatedAt: string; version: number }>>();

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

  // ---------------- Political Access (in-memory) ----------------
  private getCountryMap(gameId: number) {
    let m = this.countryAccessByGame.get(gameId);
    if (!m) {
      m = new Map<
        string,
        {
          access: PoliticalAccessLevel;
          overflight: PoliticalAccessLevel;
          updatedAt: string;
          version: number;
        }
      >();
      this.countryAccessByGame.set(gameId, m);
    }
    return m;
  }

  getCountryAccess(
    gameId: number,
    country: string
  ): {
    access: PoliticalAccessLevel;
    overflight: PoliticalAccessLevel;
    updatedAt: string;
    version: number;
  } {
    const map = this.getCountryMap(gameId);
    const key = country.trim();
    if (!map.has(key)) {
      const now = new Date().toISOString();
      map.set(key, {
        access: PoliticalAccessLevel.NO_ACCESS,
        overflight: PoliticalAccessLevel.NO_ACCESS,
        updatedAt: now,
        version: 0,
      });
    }
    return map.get(key)!;
  }

  setCountryAccess(
    gameId: number,
    country: string,
    accessType: PoliticalAccessType,
    accessLevel: PoliticalAccessLevel,
    _updatedBy: { playerId: number }
  ): {
    access: PoliticalAccessLevel;
    overflight: PoliticalAccessLevel;
    updatedAt: string;
    version: number;
  } {
    const state = this.getCountryAccess(gameId, country);
    if (accessType === PoliticalAccessType.ACCESS) {
      state.access = accessLevel;
    } else {
      state.overflight = accessLevel;
    }
    state.version = (state.version ?? 0) + 1;
    state.updatedAt = new Date().toISOString();
    // persist back
    const map = this.getCountryMap(gameId);
    map.set(country.trim(), state);
    return state;
  }

  async resolveRoomCode(gameId: number): Promise<string> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: { roomCode: true },
    });
    if (!game?.roomCode) {
      throw new NotFoundException('Game not found');
    }
    return game.roomCode;
  }

  broadcastCountryAccessChanged(roomCode: string, payload: any) {
    this.eventsGateway.sendToLobby(roomCode, 'countryAccessChanged', {
      type: 'countryAccessChanged',
      payload,
    });
  }

  broadcastBulkCountryAccessChanged(roomCode: string, payload: any) {
    this.eventsGateway.sendToLobby(roomCode, 'bulkCountryAccessChanged', {
      type: 'bulkCountryAccessChanged',
      payload,
    });
  }

  bulkSetCountryAccess(
    gameId: number,
    accessLevel: PoliticalAccessLevel,
    countries?: string[],
    _updatedBy?: { playerId: number }
  ): { countries: string[]; updatedAt: string } {
    const map = this.getCountryMap(gameId);
    const now = new Date().toISOString();
    const targets =
      countries?.map((c) => c.trim()).filter(Boolean) ?? Array.from(map.keys());

    for (const c of targets) {
      const state = this.getCountryAccess(gameId, c);
      state.access = accessLevel;
      state.overflight = accessLevel;
      state.version = (state.version ?? 0) + 1;
      state.updatedAt = now;
      map.set(c, state);
    }

    return { countries: targets, updatedAt: now };
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

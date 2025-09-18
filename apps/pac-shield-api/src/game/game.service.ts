import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { TeamType, RunwayStatus, MOGLevel } from '.prisma/client';
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

    // Initialize Forward Operating Sites (FOSs) for the game
    // Creating 30 FOSs as per the game design
    const fosCount = 30;
    const fosList = [];

    for (let i = 1; i <= fosCount; i++) {
      fosList.push({
        gameId: game.id,
        fosIdNumber: i,
        isActive: false,
        parkingRampMOG: MOGLevel.TWO_C17_SEVEN_FIGHTERS, // Default MOG level
        runwayStatus: RunwayStatus.OPERATIONAL,
      });
    }

    // Create all FOSs in batch
    await this.prisma.forwardOperatingSite.createMany({
      data: fosList,
    });

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

  /**
   * Compute and return minimal game status for Top Bar/Scoreboard display.
   * Response model fields:
   * - block: number
   * - day: number
   * - turn: number
   * - phase: 'CRISIS' | 'CONFLICT'
   * - victoryProgress: number // 0..100
   * - missionPoints: number
   * - demoralizationPoints: number
   * - resourcePoints: number
   * - victoryTarget: number
   *
   * TODO(team-scoped): If needed, derive requesting player's team from JWT (req.user)
   * and return team-specific metrics instead of global totals.
   */
  async getGameStatus(gameId: number): Promise<{
    block: number;
    day: number;
    turn: number;
    phase: 'CRISIS' | 'CONFLICT';
    victoryProgress: number;
    missionPoints: number;
    demoralizationPoints: number;
    resourcePoints: number;
    victoryTarget: number;
  }> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        teams: {
          select: {
            missionPoints: true,
            demoralizationPoints: true,
            resourcePoints: true,
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID "${gameId}" not found`);
    }

    // Aggregate totals across teams (global metrics). See TODO above for team-scoped alternative.
    const totalMissionPoints =
      (game.teams || []).reduce((sum, t: any) => sum + (t.missionPoints ?? 0), 0) || 0;
    const totalDemoralizationPoints =
      (game.teams || []).reduce((sum, t: any) => sum + (t.demoralizationPoints ?? 0), 0) || 0;
    const totalResourcePoints =
      (game.teams || []).reduce((sum, t: any) => sum + (t.resourcePoints ?? 0), 0) || 0;

    const target = game.victoryConditionMP || 100;
    const victoryProgress =
      target > 0 ? Math.max(0, Math.min(100, Math.round((totalMissionPoints / target) * 100))) : 0;

    return {
      block: game.executionBlock,
      day: game.day,
      turn: game.turn,
      phase: game.phase as any,
      victoryProgress,
      missionPoints: totalMissionPoints,
      demoralizationPoints: totalDemoralizationPoints,
      resourcePoints: totalResourcePoints,
      victoryTarget: target,
    };
  }

  /**
   * Broadcast the current game status to all clients in the game's room.
   * Intended to be called whenever Block/Day/Turn/Phase/Victory points change.
   */
  async broadcastCurrentGameStatus(gameId: number): Promise<void> {
    const status = await this.getGameStatus(gameId);
    this.gameGateway.broadcastGameStateUpdated(gameId.toString(), status);
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

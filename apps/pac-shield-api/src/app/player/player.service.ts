import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlayerDto, UpdatePlayerDto, Player } from '../generated';
import { JwtService } from '@nestjs/jwt';
import { EventsGateway } from '../events.gateway';
import { JoinGameDto } from '../../game/dto/join-game.dto';
import { ClsService } from 'nestjs-cls';
import { UpdatePlayerWithRoleDto } from './dto/update-player-with-role.dto';

/**
 * PlayerService coordinates player lifecycle and session logic:
 * - Join/resume flows with PIN/name-conflict handling
 * - CRUD operations against Prisma models
 * - JWT minting for session-scoped auth (via JwtService)
 * - Real-time roster broadcasts to lobby rooms (via EventsGateway)
 * Also leverages request-scoped CLS for structured, correlated logging.
 */
@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly eventsGateway: EventsGateway,
    private readonly cls: ClsService,
  ) {}

  /**
   * Check if a proposed player name is available within a specific game (by roomCode).
   * Case-insensitive comparison to prevent duplicate identities within the same session.
   * Throws NotFoundException if roomCode is invalid.
   */
  async checkPlayerNameAvailability(roomCode: string, playerName: string): Promise<{ isAvailable: boolean }> {
    const game = await this.prisma.game.findUnique({ where: { roomCode } });
    if (!game) {
      throw new NotFoundException('Invalid room code');
    }

    const existingPlayer = await this.prisma.player.findFirst({
      where: {
        gameId: game.id,
        name: {
          equals: playerName,
          mode: 'insensitive',
        },
      },
    });

    return { isAvailable: !existingPlayer };
  }

  /**
   * Complex player authentication flow supporting both new and returning players.
   * Handles name collision detection, PIN-based player resumption, and session management.
   * Creates unique sessionIds for tracking and broadcasts player list updates via WebSocket.
   */
  async joinGame(joinGameDto: JoinGameDto): Promise<{ token: string; player: Player }> {
    const game = await this.prisma.game.findUnique({
      where: { roomCode: joinGameDto.roomCode },
    });

    if (!game) {
      throw new NotFoundException('Invalid room code');
    }

    // Check if a player with this name already exists in the game
    const existingPlayer = await this.prisma.player.findFirst({
      where: {
        gameId: game.id,
        name: joinGameDto.playerName,
      },
    });

    if (existingPlayer) {
      // If no PIN provided, throw name conflict error
      if (!joinGameDto.pin) {
        throw new BadRequestException({
          message: 'A player with this name already exists. Please provide your PIN or choose "I\'m a new person".',
          code: 'NAME_CONFLICT',
          existingPlayer: true,
        });
      }

      // If PIN provided, verify it
      if (!existingPlayer.pin) {
        throw new BadRequestException({
          message: 'This player name exists but has no PIN set. Please choose "I\'m a new person" to create a new player.',
          code: 'NO_PIN_SET',
        });
      }

      if (existingPlayer.pin !== joinGameDto.pin) {
        throw new BadRequestException({
          message: 'Invalid PIN for this player name.',
          code: 'INVALID_PIN',
        });
      }

      // PIN is correct, return existing player's token
      const payload = { gameId: game.id, playerId: existingPlayer.id };
      const token = this.jwtService.sign(payload);

      return { token, player: existingPlayer };
    }

    // Create new player
    const role = joinGameDto.role || 'PLAYER';

    // If role is GM, assign the player to the GM team for this game
    let teamId: number | undefined = undefined;
    if (role === 'GM') {
      const gmTeam = await this.prisma.team.findFirst({
        where: { gameId: game.id, type: 'GM' },
        select: { id: true },
      });
      if (gmTeam) {
        teamId = gmTeam.id;
      }
    }

    const player = await this.prisma.player.create({
      data: {
        name: joinGameDto.playerName,
        role,
        pin: joinGameDto.pin || null,
        sessionId: `${joinGameDto.playerName}-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`,
        gameId: game.id,
        teamId: teamId,
      },
    });

    // Safety: ensure GM is actually attached to GM team even if the prefetch missed
    if (role === 'GM' && !player.teamId) {
      const gmTeam2 = await this.prisma.team.findFirst({
        where: { gameId: game.id, type: 'GM' },
        select: { id: true },
      });
      if (gmTeam2) {
        await this.prisma.player.update({
          where: { id: player.id },
          data: { teamId: gmTeam2.id },
        });
      }
    }

    const payload = { gameId: game.id, playerId: player.id };
    const token = this.jwtService.sign(payload);

    const players = await this.prisma.player.findMany({
      where: { gameId: game.id },
    });

    this.eventsGateway.sendToLobby(game.roomCode, 'playerListUpdate', players);

    return { token, player };
  }

  create(createPlayerDto: CreatePlayerDto) {
    return this.prisma.player.create({ data: createPlayerDto });
  }

  /**
   * Create a minimal Player record within an existing game.
   * Used by GameService.joinGame() when no PIN/name conflict logic is required.
   */
  async createPlayerInGame(playerName: string, gameId: number) {
    return this.prisma.player.create({
      data: {
        name: playerName,
        sessionId: `${playerName}-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`,
        gameId: gameId,
      },
    });
  }

  findAll() {
    return this.prisma.player.findMany();
  }

  findOne(id: number) {
    return this.prisma.player.findUnique({ where: { id } });
  }

  async update(id: number, updatePlayerDto: UpdatePlayerDto) {
    return this.prisma.player.update({ where: { id }, data: updatePlayerDto });
  }

  /**
   * Update player fields (name, role) with validation and correlated logging.
   * - Trims and validates non-empty name if provided
   * - Ensures role is one of the allowed uppercase enum values
   * - Emits lobby roster updates on success
   * Throws NotFoundException for missing players (P2025) and BadRequest for invalid input.
   */
  async updateWithRole(id: number, updatePlayerDto: UpdatePlayerWithRoleDto) {
    const requestId = this.cls.getId();
    this.logger.log(`[${requestId}] Updating player ${id} with data: ${JSON.stringify(updatePlayerDto)}`);

    // Validate input
    if (updatePlayerDto.name !== undefined) {
      const trimmedName = updatePlayerDto.name?.trim();
      if (!trimmedName || trimmedName.length === 0) {
        throw new BadRequestException('Name cannot be empty');
      }
      updatePlayerDto.name = trimmedName;
    }

    // Validate role if provided
    if (updatePlayerDto.role !== undefined) {
      const validRoles = ['PLAYER', 'COMMANDER', 'DEPUTY', 'STRATEGIST', 'GM'];
      if (!validRoles.includes(updatePlayerDto.role as string)) {
        throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Auto-assign to GM team when role is set to GM
      if (updatePlayerDto.role === 'GM') {
        const current = await this.prisma.player.findUnique({
          where: { id },
          include: { team: true, game: true },
        });
        if (!current) {
          throw new NotFoundException('Player not found');
        }
        
        // If not already on GM team, find and assign to GM team
        if (!current.team || current.team.type !== 'GM') {
          if (current.gameId) {
            const gmTeam = await this.prisma.team.findFirst({
              where: { gameId: current.gameId, type: 'GM' },
              select: { id: true },
            });
            if (gmTeam) {
              // We'll update the teamId in the main update below
              updatePlayerDto = { ...updatePlayerDto, teamId: gmTeam.id } as any;
            }
          }
        }
      }
    }

    try {
      const result = await this.prisma.player.update({
        where: { id },
        data: updatePlayerDto,
        include: { game: true }
      });

      // Emit WebSocket event to notify other players
      if (result.game) {
        const players = await this.prisma.player.findMany({
          where: { gameId: result.gameId },
        });
        this.eventsGateway.sendToLobby(result.game.roomCode, 'playerListUpdate', players);
      }

      this.logger.log(`[${requestId}] Successfully updated player ${id}`);
      return result;
    } catch (error) {
      // Use debug level for expected test failures to reduce noise
      if (this.isExpectedTestFailure(id, error)) {
        this.logger.debug(`[${requestId}] Expected test failure - Player ${id} not found`);
      } else {
        this.logger.error(`[${requestId}] Failed to update player ${id}: ${error.message}`, error.stack);
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Player not found');
      }
      throw error;
    }
  }

  /**
   * Update only the player's name with strict non-empty validation.
   * Emits lobby roster updates on success.
   * Throws NotFoundException when player doesn't exist.
   */
  async updatePlayerName(id: number, newName: string) {
    const requestId = this.cls.getId();
    this.logger.log(`[${requestId}] Updating player ${id} name to: ${newName}`);

    // Validate name
    const trimmedName = newName?.trim();
    if (!trimmedName || trimmedName.length === 0) {
      throw new BadRequestException('Name cannot be empty');
    }

    try {
      const updatedPlayer = await this.prisma.player.update({
        where: { id },
        data: { name: trimmedName },
        include: { game: true },
      });

      if (updatedPlayer.game) {
        const players = await this.prisma.player.findMany({
          where: { gameId: updatedPlayer.gameId },
        });
        this.eventsGateway.sendToLobby(updatedPlayer.game.roomCode, 'playerListUpdate', players);
      }

      this.logger.log(`[${requestId}] Successfully updated player ${id} name`);
      return updatedPlayer;
    } catch (error) {
      // Use debug level for expected test failures to reduce noise
      if (this.isExpectedTestFailure(id, error)) {
        this.logger.debug(`[${requestId}] Expected test failure - Player ${id} not found`);
      } else {
        this.logger.error(`[${requestId}] Failed to update player ${id} name: ${error.message}`, error.stack);
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Player not found');
      }
      throw error;
    }
  }

  /**
   * Determines if a failure is expected during testing to reduce log noise
   */
  private isExpectedTestFailure(id: number, error: any): boolean {
    // Check if it's a "not found" error (P2025 is Prisma's "record not found" error)
    if (error.code !== 'P2025') {
      return false;
    }

    // Only suppress logging for test patterns in non-production environments
    const isTestEnv = process.env.NODE_ENV !== 'production';
    if (!isTestEnv) {
      return false;
    }

    // Common test patterns that indicate intentional failures
    const testPatterns = [
      99999,  // Commonly used fake ID in tests
      -1,     // Another common test pattern
    ];

    return testPatterns.includes(id);
  }

  /**
   * Assign a player to a specific team within their game.
   * Validates that the team exists and belongs to the same game as the player.
   * Emits lobby roster updates on success.
   */
  async joinTeam(playerId: number, teamId: number) {
    const requestId = this.cls.getId();
    this.logger.log(`[${requestId}] Player ${playerId} attempting to join team ${teamId}`);

    // Get player with their current game
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { game: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Validate that the team exists and belongs to the same game
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { game: true },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.gameId !== player.gameId) {
      throw new BadRequestException('Team does not belong to the same game as player');
    }

    // Enforce: team roster lock
    if (team.locked) {
      throw new BadRequestException('Team roster is locked');
    }

    // Enforce: player with GM role can only be on GM team
    if (player.role === 'GM' && team.type !== 'GM') {
      throw new BadRequestException('Players with GM role must be on the GM team');
    }

    try {
      // Update player's team assignment
      const updatedPlayer = await this.prisma.player.update({
        where: { id: playerId },
        data: { teamId: teamId },
        include: {
          game: true,
          team: true,
        },
      });

      // Emit WebSocket event to notify other players
      if (updatedPlayer.game) {
        const players = await this.prisma.player.findMany({
          where: { gameId: updatedPlayer.gameId },
          include: { team: true },
        });
        this.eventsGateway.sendToLobby(updatedPlayer.game.roomCode, 'playerListUpdate', players);
      }

      this.logger.log(`[${requestId}] Successfully assigned player ${playerId} to team ${teamId}`);
      return updatedPlayer;
    } catch (error) {
      this.logger.error(`[${requestId}] Failed to assign player ${playerId} to team ${teamId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove a player from their current team (set teamId to null).
   * Emits lobby roster updates on success.
   */
  async leaveTeam(playerId: number) {
    const requestId = this.cls.getId();
    this.logger.log(`[${requestId}] Player ${playerId} leaving team`);

    try {
      const updatedPlayer = await this.prisma.player.update({
        where: { id: playerId },
        data: { teamId: null },
        include: {
          game: true,
          team: true,
        },
      });

      // Emit WebSocket event to notify other players
      if (updatedPlayer.game) {
        const players = await this.prisma.player.findMany({
          where: { gameId: updatedPlayer.gameId },
          include: { team: true },
        });
        this.eventsGateway.sendToLobby(updatedPlayer.game.roomCode, 'playerListUpdate', players);
      }

      this.logger.log(`[${requestId}] Successfully removed player ${playerId} from team`);
      return updatedPlayer;
    } catch (error) {
      this.logger.error(`[${requestId}] Failed to remove player ${playerId} from team: ${error.message}`, error.stack);
      if (error.code === 'P2025') {
        throw new NotFoundException('Player not found');
      }
      throw error;
    }
  }

  /**
   * Permanently delete a player by id.
   */
  remove(id: number) {
    return this.prisma.player.delete({ where: { id } });
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PlayerService } from './player.service';
import { CreatePlayerDto, Player } from '../generated';
import { JoinGameDto } from '../../game/dto/join-game.dto';
import { UpdatePlayerWithRoleDto } from './dto/update-player-with-role.dto';

/**
 * Player REST API for CRUD and session join flows.
 * Delegates business logic to PlayerService; emits real-time updates via EventsGateway.
 */
@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  /**
   * Creates a new player with the provided data.
   * Generic endpoint for player creation; game-scoped creation typically uses /player/join.
   * @param createPlayerDto - Player creation data including name, role, and game association
   * @returns Promise<Player> - The created player record
   * @example POST /player
   */
  @Post()
  create(@Body() createPlayerDto: CreatePlayerDto) {
    return this.playerService.create(createPlayerDto);
  }

  /**
   * Retrieves all players across all games.
   * Primarily used for diagnostics and administrative purposes.
   * @returns Promise<Player[]> - Array of all player records
   * @example GET /player
   */
  @Get()
  findAll() {
    return this.playerService.findAll();
  }

  /**
   * Retrieves a single player by their unique identifier.
   * @param id - The player's unique ID as a string
   * @returns Promise<Player | null> - The player record or null if not found
   * @example GET /player/123
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playerService.findOne(+id);
  }

  /**
   * Updates player fields including role with validation.
   * Validates role against known enum set and broadcasts updates via WebSocket.
   * @param id - The player's unique ID as a string
   * @param updatePlayerDto - Update data including name and/or role
   * @returns Promise<Player> - The updated player record
   * @throws BadRequestException when role is invalid or name is empty
   * @throws NotFoundException when player does not exist
   * @example PATCH /player/123
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlayerDto: UpdatePlayerWithRoleDto) {
    return this.playerService.updateWithRole(+id, updatePlayerDto);
  }

  /**
   * Updates only the player's display name with strict validation.
   * Validates that the name is non-empty and broadcasts player list updates to the lobby.
   * @param id - The player's unique ID as a string
   * @param body - Request body containing the new name
   * @param body.name - The new display name for the player
   * @returns Promise<Player> - The updated player record
   * @throws BadRequestException when name is empty or invalid
   * @throws NotFoundException when player does not exist
   * @example PATCH /player/123/name
   */
  @Patch(':id/name')
  async updatePlayerName(
    @Param('id') id: string,
    @Body() body: { name: string }
  ): Promise<Player> {
    return this.playerService.updatePlayerName(+id, body.name);
  }

  /**
   * Permanently removes a player record from the system.
   * Broadcasts player list updates to notify other players in the lobby.
   * @param id - The player's unique ID as a string
   * @returns Promise<Player> - The deleted player record
   * @throws NotFoundException when player does not exist
   * @example DELETE /player/123
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.playerService.remove(+id);
  }

  /**
   * Handles the complete game join flow with name conflict resolution.
   * Processes player creation or resumption via PIN validation and returns session JWT.
   * @param joinGameDto - Join request data including room code, player name, and optional PIN
   * @returns Promise<{token: string, player: Player, id: number}> - Session token and player data
   * @throws BadRequestException for name conflicts, invalid PINs, or validation errors
   * @throws NotFoundException when room code is invalid
   * @example POST /player/join
   */
  @Post('join')
  async joinGame(
    @Body() joinGameDto: JoinGameDto,
  ): Promise<{ token: string; player: Player; id: number }> {
    const { token, player } = await this.playerService.joinGame(joinGameDto);
    return { token, player, id: player.id };
  }

  /**
   * Checks if a player name is available within a specific game.
   * Used by the join UI to provide real-time name availability feedback.
   * @param body - Request body containing room code and player name
   * @param body.roomCode - The game's room code to check within
   * @param body.playerName - The proposed player name to check
   * @returns Promise<{isAvailable: boolean}> - Whether the name is available
   * @throws NotFoundException when room code is invalid
   * @example POST /player/check-name-availability
   */
  @Post('check-name-availability')
  async checkPlayerNameAvailability(
    @Body() body: { roomCode: string; playerName: string },
  ): Promise<{ isAvailable: boolean }> {
    return this.playerService.checkPlayerNameAvailability(
      body.roomCode,
      body.playerName,
    );
  }

  /**
   * Assigns a player to a specific team within their game.
   * Validates team exists, belongs to same game, and respects team lock status.
   * @param id - The player's unique ID as a string
   * @param body - Request body containing team assignment
   * @param body.teamId - The ID of the team to join
   * @returns Promise<Player> - The updated player record with team assignment
   * @throws NotFoundException when player or team does not exist
   * @throws BadRequestException when team is locked, belongs to different game, or GM role restrictions
   * @example POST /player/123/join-team
   */
  @Post(':id/join-team')
  async joinTeam(
    @Param('id') id: string,
    @Body() body: { teamId: number },
  ): Promise<Player> {
    return this.playerService.joinTeam(+id, body.teamId);
  }

  /**
   * Removes a player from their current team assignment.
   * Sets the player's teamId to null and broadcasts updates to the lobby.
   * @param id - The player's unique ID as a string
   * @returns Promise<Player> - The updated player record without team assignment
   * @throws NotFoundException when player does not exist
   * @example POST /player/123/leave-team
   */
  @Post(':id/leave-team')
  async leaveTeam(@Param('id') id: string): Promise<Player> {
    return this.playerService.leaveTeam(+id);
  }
}

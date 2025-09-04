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
   * POST /player
   * Create a new player (generic endpoint; game-scoped creation typically uses /player/join).
   */
  @Post()
  create(@Body() createPlayerDto: CreatePlayerDto) {
    return this.playerService.create(createPlayerDto);
  }

  /**
   * GET /player
   * List all players across games (primarily for diagnostics/admin).
   */
  @Get()
  findAll() {
    return this.playerService.findAll();
  }

  /**
   * GET /player/:id
   * Fetch a single player by id.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playerService.findOne(+id);
  }

  /**
   * PATCH /player/:id
   * Update player fields including role. Validates role against known enum set.
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlayerDto: UpdatePlayerWithRoleDto) {
    return this.playerService.updateWithRole(+id, updatePlayerDto);
  }

  /**
   * PATCH /player/:id/name
   * Update only the player's display name with strict non-empty validation.
   * Broadcasts player list update to the lobby on success.
   */
  @Patch(':id/name')
  async updatePlayerName(
    @Param('id') id: string,
    @Body() body: { name: string }
  ): Promise<Player> {
    return this.playerService.updatePlayerName(+id, body.name);
  }

  /**
   * DELETE /player/:id
   * Remove a player record.
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.playerService.remove(+id);
  }

  /**
   * POST /player/join
   * Game-scoped join flow. Handles name conflicts + PIN resume via PlayerService.
   * Returns a JWT and the created/resumed Player.
   */
  @Post('join')
  async joinGame(
    @Body() joinGameDto: JoinGameDto,
  ): Promise<{ token: string; player: Player; id: number }> {
    const { token, player } = await this.playerService.joinGame(joinGameDto);
    return { token, player, id: player.id };
  }

  /**
   * POST /player/check-name-availability
   * Quickly verify if a name is available for a given roomCode to drive the join UI.
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
   * POST /player/:id/join-team
   * Assign a player to a specific team within their game.
   */
  @Post(':id/join-team')
  async joinTeam(
    @Param('id') id: string,
    @Body() body: { teamId: number },
  ): Promise<Player> {
    return this.playerService.joinTeam(+id, body.teamId);
  }

  /**
   * POST /player/:id/leave-team
   * Remove a player from their current team.
   */
  @Post(':id/leave-team')
  async leaveTeam(@Param('id') id: string): Promise<Player> {
    return this.playerService.leaveTeam(+id);
  }
}

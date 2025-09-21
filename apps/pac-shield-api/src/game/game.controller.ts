import { Controller, Post, Body, Get, Param, UseGuards, Req, ParseIntPipe, HttpCode } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from '../app/generated';
import { JoinGameDto } from './dto/join-game.dto';
import { JwtAuthGuard } from '../app/auth/jwt-auth.guard';
import { GameMasterGuard } from '../app/auth/game-master.guard';
import { UpdateCountryAccessDto, BulkCountryAccessDto } from './dto/update-country-access.dto';

/**
 * Game REST API for lifecycle operations (create, fetch, validate, join).
 * Consumed by the Angular join flow and lobby to bootstrap sessions.
 */
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  /**
   * POST /game/create
   * Creates a new game and generates a unique 6-char room code.
   * @param createGameDto Victory conditions and other init params.
   * @returns Persisted Game record with id and roomCode.
   */
  @Post('create')
  async createGame(@Body() createGameDto: CreateGameDto) {
    return this.gameService.createGame(createGameDto);
  }

  /**
   * GET /game/:id
   * Retrieves a game by numeric id (used by lobby/game screens).
   */
  @Get(':id')
  async getGameById(@Param('id') id: string) {
    return this.gameService.getGameById(+id);
  }

  /**
   * GET /game/validate/:roomCode
   * Lightweight existence check before user attempts to join.
   * @returns { valid: boolean, gameId?: number }
   */
  @Get('validate/:roomCode')
  async validateRoomCode(@Param('roomCode') roomCode: string) {
    return this.gameService.validateRoomCode(roomCode);
  }

  /**
   * POST /game/join
   * Creates a player in the specified game and returns a session JWT.
   * Name conflict + PIN resume flow is implemented by the PlayerService.
   * @returns { token: string }
   */
  @Post('join')
  async joinGame(@Body() joinGameDto: JoinGameDto) {
    return this.gameService.joinGame(joinGameDto);
  }

  /**
   * POST /game/:gameId/political-access
   * GM-only endpoint to update a single country's political access state (in-memory).
   */
  @UseGuards(JwtAuthGuard, GameMasterGuard)
  @Post(':gameId/political-access')
  @HttpCode(200)
  async updatePoliticalAccess(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() dto: UpdateCountryAccessDto,
    @Req() req: any
  ) {
    const raw = req?.user?.sub ?? req?.user?.playerId;
    const playerId = Number(typeof raw === 'string' ? parseInt(raw, 10) : raw);

    const state = this.gameService.setCountryAccess(
      gameId,
      dto.country,
      dto.accessType,
      dto.accessLevel,
      { playerId: Number.isFinite(playerId) ? playerId : -1 }
    );

    const roomCode = await this.gameService.resolveRoomCode(gameId);
    const payload = {
      gameId,
      country: dto.country,
      accessType: dto.accessType,
      accessLevel: dto.accessLevel,
      updatedBy: { playerId: Number.isFinite(playerId) ? playerId : -1, role: 'GM' },
      updatedAt: state.updatedAt,
      version: state.version,
    };
    this.gameService.broadcastCountryAccessChanged(roomCode, payload);

    return { success: true, state, updatedAt: state.updatedAt, version: state.version };
  }

  /**
   * POST /game/:gameId/political-access/bulk
   * GM-only bulk update (optional stub for future UI panel).
   */
  @UseGuards(JwtAuthGuard, GameMasterGuard)
  @Post(':gameId/political-access/bulk')
  @HttpCode(200)
  async bulkUpdatePoliticalAccess(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() dto: BulkCountryAccessDto,
    @Req() req: any
  ) {
    const raw = req?.user?.sub ?? req?.user?.playerId;
    const playerId = Number(typeof raw === 'string' ? parseInt(raw, 10) : raw);

    const result = this.gameService.bulkSetCountryAccess(
      gameId,
      dto.accessLevel,
      dto.countries,
      { playerId: Number.isFinite(playerId) ? playerId : -1 }
    );

    const roomCode = await this.gameService.resolveRoomCode(gameId);
    const payload = {
      gameId,
      accessLevel: dto.accessLevel,
      countries: result.countries,
      updatedBy: { playerId: Number.isFinite(playerId) ? playerId : -1, role: 'GM' },
      updatedAt: result.updatedAt,
    };
    this.gameService.broadcastBulkCountryAccessChanged(roomCode, payload);

    return { success: true, ...result };
  }
}


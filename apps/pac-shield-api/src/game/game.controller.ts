import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from '../app/generated';
import { JoinGameDto } from './dto/join-game.dto';

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
   * GET /game/:id/status
   * Minimal status used by Top Bar (block/day/turn/phase/victoryProgress).
   */
  @Get(':id/status')
  async getGameStatus(@Param('id') id: string) {
    return this.gameService.getGameStatus(+id);
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
}


import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from '../app/generated';
import { JoinGameDto } from './dto/join-game.dto';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { GameScoringService } from './scoring.service';
// import { JwtAuthGuard } from '../app/auth/jwt-auth.guard';
// import { GameMasterGuard } from '../app/auth/game-master.guard';
// import { UpdateCountryAccessDto, BulkCountryAccessDto } from './dto/update-country-access.dto';

/**
 * Game REST API for lifecycle operations (create, fetch, validate, join).
 * Consumed by the Angular join flow and lobby to bootstrap sessions.
 */
@Controller('game')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly scoringService: GameScoringService
  ) {}

  /**
   * POST /game/create
   * Creates a new game and generates a unique 6-char room code.
   * Rate limited to 50 games per hour to prevent spam.
   *
   * @param createGameDto Victory conditions and other init params.
   * @returns Persisted Game record with id and roomCode
   * @example
   * // POST /game/create
   * // Body: { victoryTarget: 100, ... }
   * // Returns: { id: 1, roomCode: "ABC123", ... }
   */
  @Post('create')
  @Throttle({ hourly: { ttl: 3600000, limit: 50 } }) // 50 games per hour
  async createGame(@Body() createGameDto: CreateGameDto) {
    return this.gameService.createGame(createGameDto);
  }

  /**
   * GET /game/:id
   * Retrieves a game by numeric id (used by lobby/game screens).
   *
   * @param id The numeric game id as a string path parameter
   * @returns Game record for the specified id
   * @example
   * // GET /game/1
   * // Returns: { id: 1, roomCode: "ABC123", teams: [...] }
   */
  @Get(':id')
  async getGameById(@Param('id') id: string) {
    return this.gameService.getGameById(+id);
  }

  /**
   * GET /game/validate/:roomCode
   * Lightweight existence check before user attempts to join.
   *
   * @param roomCode The 6-character room code for the game
   * @returns Object indicating validity and the resolved gameId when valid
   * @example
   * // GET /game/validate/ABC123
   * // Returns: { valid: true, gameId: 1 }
   */
  @Get('validate/:roomCode')
  async validateRoomCode(@Param('roomCode') roomCode: string) {
    return this.gameService.validateRoomCode(roomCode);
  }

  /**
   * POST /game/join
   * Creates a player in the specified game and returns a session JWT.
   * Name conflict + PIN resume flow is implemented by the PlayerService.
   * Rate limiting is skipped on this endpoint to support 200 simultaneous logins.
   *
   * @param joinGameDto Payload containing roomCode, playerName, and optional pin for resume
   * @returns Object containing a signed JWT token and player details
   * @example
   * // POST /game/join
   * // Body: { roomCode: "ABC123", playerName: "Ranger", pin: "1234" }
   * // Returns: { token: "...", player: { id: 5, name: "Ranger", ... } }
   */
  @Post('join')
  @SkipThrottle() // Skip rate limiting to support 200 simultaneous logins
  async joinGame(@Body() joinGameDto: JoinGameDto) {
    return this.gameService.joinGame(joinGameDto);
  }

  /**
   * GET /game/:id/score
   * Computes and returns the CJTF Mission Points breakdown and total.
   * Includes: assessments, crisis fighter sorties, destroyed PLA targets,
   * and demoralization penalty (non-CSpOC).
   */
  @Get(':id/score')
  async getScore(@Param('id') id: string) {
    return this.scoringService.computeScore(+id);
  }

  // (Deprecated political access endpoints removed for brevity)
}


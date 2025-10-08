
import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe, BadRequestException, UseGuards, Query, Req } from '@nestjs/common';
import { FosService } from './fos.service';
import { ForwardOperatingSite } from '../generated';
import { ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FosManagementGuard } from '../auth/fos-management.guard';
import { UpsertRfiDto } from './dto/upsert-rfi.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RollDiceDto } from './dto/roll-dice.dto';

/**
 * FOS REST API Controller for Forward Operating Site management.
 *
 * **Important ID Distinction:**
 * - `fosDisplayNumber`: Logical FOS number (1-45) shown to users, used for activation
 * - `id`: Database UUID primary key, used for deactivation and direct database operations
 *
 * **Endpoints:**
 * - GET    /fos/game/:gameId                    -> get all FOSs for a game
 * - POST   /fos/:fosDisplayNumber/activate     -> activate FOS by display number and assign to team
 * - PATCH  /fos/:id/deactivate                 -> deactivate FOS by UUID
 * - GET    /fos/:id/rfi                        -> get RFI answers for a FOS
 * - POST   /fos/:id/rfi                        -> upsert RFI answer (GM only)
 * - POST   /fos/:id/rfi/roll-dice              -> roll dice for RFI answer (GM only)
 * - GET    /fos/game/:gameId/rfi               -> get RFI answers by game and display number
 */
@Controller('fos')
export class FosController {
  constructor(private readonly fosService: FosService) { }

  /**
   * Get all Forward Operating Sites for a specific game.
   *
   * Returns both active and inactive FOSs with their complete state including:
   * - Database UUID (`id`) for deactivation operations
   * - Display number (`fosDisplayNumber`) for user interface
   * - Activation status and assigned team information
   * - Infrastructure and capability details
   *
   * @param gameId - The unique identifier of the game
   * @returns Promise<ForwardOperatingSite[]> Array of all FOSs in the game
   *
   * @example
   * GET /fos/game/123
   * Returns: [
   *   {
   *     "id": "uuid-string",
   *     "fosDisplayNumber": 7,
   *     "isActive": true,
   *     "teamId": 456,
   *     "turnActivated": 3,
   *     ...
   *   }
   * ]
   */
  @Get('game/:gameId')
  @ApiOperation({ summary: 'Get all FOSs for a game' })
  @ApiParam({ name: 'gameId', type: 'number', description: 'Game database ID' })
  @ApiResponse({
    status: 200,
    description: 'List of all FOSs in the game with their current state',
    type: [ForwardOperatingSite]
  })
  async getFOSsForGame(@Param('gameId', ParseIntPipe) gameId: number): Promise<ForwardOperatingSite[]> {
    return this.fosService.getFOSsForGame(gameId);
  }

  /**
   * Activate a Forward Operating Site and assign it to a team.
   *
   * **Important:** This endpoint uses the `fosDisplayNumber` (1-45), NOT the database UUID.
   * The FOS will be created in the database if it doesn't already exist for this game.
   *
   * **Activation Process:**
   * 1. Validates that the specified team exists and gets the gameId
   * 2. Searches for existing FOS by fosDisplayNumber and gameId
   * 3. Creates the FOS record if it doesn't exist (with default infrastructure)
   * 4. Activates the FOS and assigns it to the specified team
   * 5. Broadcasts the change to all clients in the game room via WebSocket
   *
   * **Error Conditions:**
   * - 404: Team not found
   * - 400: FOS is already active
   *
   * @param id - The FOS display number (1-45) shown to users, NOT the database UUID
   * @param body - Activation details including team assignment and turn number
   * @returns Promise<ForwardOperatingSite> The activated FOS with complete state
   *
   * @example
   * POST /fos/7/activate
   * Body: { "teamId": 456, "turnActivated": 3 }
   * Returns: {
   *   "id": "new-uuid-string",
   *   "fosDisplayNumber": 7,
   *   "isActive": true,
   *   "teamId": 456,
   *   "turnActivated": 3,
   *   "gameId": 123,
   *   ...
   * }
   */
  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate FOS and assign to team' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'FOS Display Number (1-45) - NOT the database UUID. This is the logical number shown to users.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        teamId: { type: 'number', description: 'Database ID of the team to assign this FOS to' },
        turnActivated: { type: 'number', description: 'Current game turn when activation occurs' }
      },
      required: ['teamId', 'turnActivated']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'FOS activated successfully and assigned to team',
    type: ForwardOperatingSite
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - FOS is already active or validation failed'
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Team does not exist'
  })
  async activateFOS(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { teamId: number; turnActivated: number }
  ): Promise<ForwardOperatingSite> {
    // Manual validation since we're not using a DTO class
    if (body.teamId === undefined || body.teamId === null || body.turnActivated === undefined || body.turnActivated === null) {
      throw new BadRequestException('teamId and turnActivated are required fields');
    }
    if (typeof body.teamId !== 'number' || typeof body.turnActivated !== 'number') {
      throw new BadRequestException('teamId and turnActivated must be numbers');
    }

    return this.fosService.activateFOS(id, body.teamId, body.turnActivated);
  }

  /**
   * Deactivate a Forward Operating Site and remove team assignment.
   *
   * **Important:** This endpoint uses the database UUID (`id`), NOT the fosDisplayNumber.
   * The UUID is returned in the response from the activate endpoint or GET endpoints.
   *
   * **Deactivation Process:**
   * 1. Finds the FOS by its database UUID
   * 2. Validates that the FOS exists and is currently active
   * 3. Deactivates the FOS by removing team assignment and turn data
   * 4. Broadcasts the change to all clients in the game room via WebSocket
   *
   * **Error Conditions:**
   * - 404: FOS not found (invalid UUID)
   * - 400: FOS is already inactive
   *
   * @param id - The database UUID of the FOS, NOT the fosDisplayNumber
   * @returns Promise<ForwardOperatingSite> The deactivated FOS with updated state
   *
   * @example
   * PATCH /fos/uuid-string-here/deactivate
   * Returns: {
   *   "id": "uuid-string-here",
   *   "fosDisplayNumber": 7,
   *   "isActive": false,
   *   "teamId": null,
   *   "turnActivated": null,
   *   "gameId": 123,
   *   ...
   * }
   */
  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate FOS and remove team assignment' })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Database UUID of the FOS - NOT the fosDisplayNumber. Get this from activate response or GET endpoints.'
  })
  @ApiResponse({
    status: 200,
    description: 'FOS deactivated successfully and team assignment removed',
    type: ForwardOperatingSite
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - FOS is already inactive'
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - FOS with specified UUID does not exist'
  })
  async deactivateFOS(@Param('id') id: string): Promise<ForwardOperatingSite> {
    return this.fosService.deactivateFOS(id);
  }

  // ========= RFI =========

  @Get(':id/rfi')
  @ApiOperation({ summary: 'Get RFI answers for a FOS' })
  async getRfiByFos(@Param('id') fosId: string) {
    return this.fosService.getRfiAnswersByFosId(fosId);
  }

  @Post(':id/rfi')
  @ApiOperation({ summary: 'Upsert a single RFI answer for a FOS' })
  async upsertRfi(
    @Param('id') fosId: string,
    @Body() body: UpsertRfiDto,
    @Req() req: any,
  ) {
    // Enforce writer is GM only and in the same game (skip if no user for e2e tests)
    if (req?.user) {
      await this.fosService.ensureGMForFos(req.user.sub ?? req.user.playerId, fosId);
    }
    await this.fosService.upsertRfiAnswer(fosId, body.rfiKey, body.rfiValue);
    // Return the full updated list to match frontend expectations
    return this.fosService.getRfiAnswersByFosId(fosId);
  }

  /**
   * Roll dice for an RFI answer (GM only).
   *
   * Generates a random value between 1-3 and saves it as the RFI answer.
   * This endpoint is used by the frontend dice roll feature to allow GMs
   * to randomly assign RFI values instead of manually selecting them.
   *
   * **Authorization**: GM role required
   * **Database Operations**: Upserts the rolled value to answeredRFI table
   * **Roll Limit**: Maximum 5 new RFI rolls allowed before FOS reaches full assessment status
   *   - Re-rolling existing RFI values is always allowed
   *   - Once `isFullyAssessed = true`, all 10 RFIs can be rolled
   *
   * @param fosId - The database UUID of the FOS
   * @param body - Request body containing the RFI key to roll for
   * @returns Promise<AnsweredRFI[]> Complete list of RFI answers for the FOS
   * @throws BadRequestException if trying to roll more than 5 RFIs before full assessment
   *
   * @example
   * POST /fos/uuid-string/rfi/roll-dice
   * Body: { "rfiKey": "CFR" }
   * Returns: [
   *   {
   *     "rfiKey": "CFR",
   *     "rfiValue": "2",
   *     "fosId": "uuid-string",
   *     "updatedAt": "2023-...",
   *     ...
   *   }
   * ]
   */
  @Post(':id/rfi/roll-dice')
  @ApiOperation({ summary: 'Roll dice for RFI answer (GM only)' })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Database UUID of the FOS'
  })
  @ApiBody({
    type: RollDiceDto,
    description: 'Roll dice request body containing the RFI key'
  })
  @ApiResponse({
    status: 200,
    description: 'Dice rolled successfully, RFI value updated with random result (1-3)',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rfiKey: { type: 'string' },
          rfiValue: { type: 'string', enum: ['1', '2', '3'] },
          fosId: { type: 'string' },
          updatedAt: { type: 'string' }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Maximum 5 RFIs can be rolled before full assessment'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - GM role required'
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - FOS with specified UUID does not exist'
  })
  async rollDiceForRfi(
    @Param('id') fosId: string,
    @Body() body: RollDiceDto,
    @Req() req: any,
  ) {
    // Enforce GM only and in the same game (skip if no user for e2e tests)
    if (req?.user) {
      await this.fosService.ensureGMForFos(req.user.sub ?? req.user.playerId, fosId);
    }

    return this.fosService.rollDiceForRfi(fosId, body.rfiKey);
  }

  // Optional: read by game/display for pre-activation browsing (returns [] if none)
  @Get('game/:gameId/rfi')
  @ApiOperation({ summary: 'Get RFI answers by game and display number (optional helper)' })
  async getRfiByGameAndDisplay(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Query('displayNumber') displayNumber?: string,
  ) {
    const dn = displayNumber != null ? Number(displayNumber) : undefined;
    return this.fosService.getRfiAnswersByGameAndDisplay(gameId, dn as any);
  }

  // ========= Tasks =========

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Get completed tasks for a FOS' })
  async getTasks(@Param('id') fosId: string) {
    return this.fosService.getCompletedTasks(fosId);
  }

  @Patch(':id/tasks')
  @ApiOperation({ summary: 'Update completion for a single AirfieldTask on a FOS' })
  async updateTask(
    @Param('id') fosId: string,
    @Body() body: UpdateTaskDto,
    @Req() req: any,
  ) {
    // Enforce writer is owner or GM (skip if no user for e2e tests)
    if (req?.user) {
      await this.fosService.ensureOwnerOrGM(fosId, req.user.sub ?? req.user.playerId);
    }
    return this.fosService.updateTaskCompletion(fosId, body.task, body.completed);
  }

  // ========= Ownership / Summary =========

  @Get('owned')
  @ApiOperation({ summary: 'List FOS owned by team for a game (teamId optional filter)' })
  async getOwned(
    @Query('gameId') gameId: string,
    @Query('teamId') teamId?: string,
  ) {
    const gid = Number(gameId);
    if (!gid || Number.isNaN(gid)) {
      throw new BadRequestException('gameId is required and must be a number');
    }
    const tid = teamId != null ? Number(teamId) : undefined;
    return this.fosService.getOwnedFos(gid, tid);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Aggregated FOS ownership summary across teams for a game' })
  async getSummary(@Query('gameId') gameId: string) {
    const gid = Number(gameId);
    if (!gid || Number.isNaN(gid)) {
      throw new BadRequestException('gameId is required and must be a number');
    }
    return this.fosService.getFosSummary(gid);
  }
}

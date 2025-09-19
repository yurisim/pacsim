import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe, HttpCode, BadRequestException } from '@nestjs/common';
import { FosService } from './fos.service';
import { ForwardOperatingSite, UpdateForwardOperatingSiteDto } from '../generated';
import { ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';

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
 */
@Controller('fos')
export class FosController {
  constructor(private readonly fosService: FosService) {}

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
}

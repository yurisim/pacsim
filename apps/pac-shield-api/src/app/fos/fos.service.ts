import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events.gateway';
import { ForwardOperatingSite } from '../generated';

/**
 * FOS Service for Forward Operating Site business logic and database operations.
 *
 * **Important ID Distinction:**
 * - `fosDisplayNumber`: Logical FOS number (1-45) shown to users, used for activation
 * - `id`: Database UUID primary key, used for deactivation and direct database operations
 *
 * **Key Responsibilities:**
 * - FOS lifecycle management (creation, activation, deactivation)
 * - Team assignment and validation
 * - Real-time state synchronization via WebSocket
 * - Database CRUD operations with Prisma
 */
@Injectable()
export class FosService {
  private readonly logger = new Logger(FosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway
  ) {}

  /**
   * Retrieve all Forward Operating Sites for a specific game.
   *
   * Returns both active and inactive FOSs with complete relational data.
   * This method is used by the GET /fos/game/:gameId endpoint.
   *
   * **Included Relations:**
   * - `team`: Complete team information if FOS is assigned
   * - `game`: Game metadata and status
   *
   * @param gameId - The database ID of the game
   * @returns Promise<ForwardOperatingSite[]> Array of all FOSs for the game
   *
   * @example
   * const foss = await getFOSsForGame(123);
   * // Returns all FOSs with fosDisplayNumber, activation status, team assignments, etc.
   */
  async getFOSsForGame(gameId: number): Promise<ForwardOperatingSite[]> {
    return this.prisma.forwardOperatingSite.findMany({
      where: { gameId },
      include: {
        team: true,
        game: true,
      },
    });
  }

  /**
   * Activate a Forward Operating Site and assign it to a team.
   *
   * **Important:** This method uses `fosDisplayNumber` (1-45), NOT the database UUID.
   *
   * **Activation Process:**
   * 1. Validates that the specified team exists and retrieves the gameId
   * 2. Searches for existing FOS by fosDisplayNumber within the team's game
   * 3. Creates the FOS record if it doesn't exist (with default infrastructure settings)
   * 4. Validates that the FOS is not already active
   * 5. Activates the FOS and assigns it to the specified team
   * 6. Broadcasts the state change to all clients in the game room
   *
   * **Default Infrastructure (for new FOSs):**
   * - parkingRampMOG: TWO_C17_SEVEN_FIGHTERS
   * - runwayStatus: OPERATIONAL
   * - isActive: false (until activation)
   *
   * @param fosDisplayNumber - The logical FOS number (1-45) shown to users
   * @param teamId - Database ID of the team to assign the FOS to
   * @param turnActivated - Game turn when the activation occurs
   * @returns Promise<ForwardOperatingSite> The activated FOS with complete state
   *
   * @throws {NotFoundException} When the specified team doesn't exist
   * @throws {BadRequestException} When the FOS is already active
   *
   * @example
   * const activatedFos = await activateFOS(7, 456, 3);
   * // Creates/activates FOS 7, assigns to team 456, marks as activated on turn 3
   */
  async activateFOS(fosDisplayNumber: number, teamId: number, turnActivated: number): Promise<ForwardOperatingSite> {
    // Verify the team exists first to get the gameId
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Find existing FOS by fosDisplayNumber and gameId, or create it
    let fos = await this.prisma.forwardOperatingSite.findFirst({
      where: {
        fosDisplayNumber: fosDisplayNumber,
        gameId: team.gameId
      },
      include: { game: true, team: true },
    });

    if (!fos) {
      // Create the FOS if it doesn't exist
      fos = await this.prisma.forwardOperatingSite.create({
        data: {
          gameId: team.gameId,
          fosDisplayNumber: fosDisplayNumber,
          isActive: false,
          parkingRampMOG: 'TWO_C17_SEVEN_FIGHTERS', // Default MOG level
          runwayStatus: 'OPERATIONAL',
        },
        include: { game: true, team: true },
      });
    }

    if (fos.isActive) {
      throw new BadRequestException('FOS is already active');
    }

    const activatedFOS = await this.prisma.forwardOperatingSite.update({
      where: { id: fos.id },
      data: {
        isActive: true,
        teamId: teamId,
        turnActivated: turnActivated,
      },
      include: {
        team: true,
        game: true,
      },
    });

    // Broadcast FOS activation to all clients in the game
    await this.broadcastFOSUpdate(fos.gameId, fos.game?.roomCode);

    this.logger.log(`FOS ${fos.fosDisplayNumber} activated for team ${team.name} in game ${fos.gameId}`);

    return activatedFOS;
  }

  /**
   * Deactivate a Forward Operating Site and remove team assignment.
   *
   * **Important:** This method uses the database UUID (`id`), NOT the fosDisplayNumber.
   *
   * **Deactivation Process:**
   * 1. Finds the FOS by its database UUID
   * 2. Validates that the FOS exists in the database
   * 3. Validates that the FOS is currently active
   * 4. Deactivates the FOS by clearing team assignment and turn data
   * 5. Broadcasts the state change to all clients in the game room
   *
   * **State Changes:**
   * - isActive: true → false
   * - teamId: assigned team → null
   * - turnActivated: turn number → null
   *
   * @param fosId - The database UUID of the FOS, NOT the fosDisplayNumber
   * @returns Promise<ForwardOperatingSite> The deactivated FOS with updated state
   *
   * @throws {NotFoundException} When FOS with the specified UUID doesn't exist
   * @throws {BadRequestException} When the FOS is already inactive
   *
   * @example
   * const deactivatedFos = await deactivateFOS('uuid-string-here');
   * // Deactivates the FOS and removes all team assignments
   */
  async deactivateFOS(fosId: string): Promise<ForwardOperatingSite> {
    const fos = await this.prisma.forwardOperatingSite.findUnique({
      where: { id: fosId },
      include: { game: true, team: true },
    });

    if (!fos) {
      throw new NotFoundException('FOS not found');
    }

    if (!fos.isActive) {
      throw new BadRequestException('FOS is already inactive');
    }

    const deactivatedFOS = await this.prisma.forwardOperatingSite.update({
      where: { id: fosId },
      data: {
        isActive: false,
        teamId: null,
        turnActivated: null,
      },
      include: {
        team: true,
        game: true,
      },
    });

    // Broadcast FOS deactivation to all clients in the game
    await this.broadcastFOSUpdate(fos.gameId, fos.game?.roomCode);

    this.logger.log(`FOS ${fos.fosDisplayNumber} deactivated in game ${fos.gameId}`);

    return deactivatedFOS;
  }

  /**
   * Broadcast FOS state updates to all clients in the game room via WebSocket.
   *
   * This method ensures real-time synchronization of FOS state across all connected
   * clients when FOSs are activated or deactivated. It retrieves the complete current
   * FOS list and broadcasts it to all clients in the game's WebSocket room.
   *
   * **WebSocket Event:** `fosListUpdate`
   * **Payload:** Complete array of ForwardOperatingSite objects for the game
   *
   * @param gameId - Database ID of the game whose FOS state changed
   * @param roomCode - Optional room code for WebSocket room (will be resolved if not provided)
   *
   * @example
   * await broadcastFOSUpdate(123, 'GAME-ABC');
   * // Broadcasts current FOS state to all clients in room 'GAME-ABC'
   */
  private async broadcastFOSUpdate(gameId: number, roomCode?: string) {
    if (!roomCode) {
      // Resolve roomCode if not provided
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: { roomCode: true },
      });
      roomCode = game?.roomCode;
    }

    if (!roomCode) {
      this.logger.warn(`Could not resolve roomCode for gameId=${gameId}; skipping broadcast`);
      return;
    }

    const fossList = await this.getFOSsForGame(gameId);
    this.eventsGateway.sendToLobby(roomCode, 'fosListUpdate', fossList);
  }
}
import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events.gateway';
import { ForwardOperatingSite } from '../generated';
import { AirfieldTask } from '@prisma/client';

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
   * Authorization helper: ensure the caller is GM or the owner (same team) of the specified FOS.
   * Accepts either numeric player id or sessionId via JWT sub.
   * Throws ForbiddenException or NotFoundException as appropriate.
   */
  async ensureOwnerOrGM(fosId: string, candidate: number | string): Promise<void> {
    const fos = await this.prisma.forwardOperatingSite.findUnique({
      where: { id: fosId },
      select: { id: true, teamId: true },
    });
    if (!fos) {
      throw new NotFoundException('FOS not found');
    }

    const candidateStr = String(candidate);
    const isNumeric = /^\d+$/.test(candidateStr);
    const player = await this.prisma.player.findUnique({
      where: isNumeric ? { id: Number(candidateStr) } : { sessionId: candidateStr },
      include: { team: true },
    });

    if (!player) {
      throw new ForbiddenException('Access denied');
    }

    // GM can always write
    if (player.role === 'GM') {
      return;
    }

    // Owner: same team that owns the FOS
    if (fos.teamId != null && player.teamId === fos.teamId) {
      return;
    }

    throw new ForbiddenException('Access denied - not owner or GM');
  }

  /**
   * Authorization helper: ensure the caller is a Game Master.
   * Accepts either numeric player id or sessionId via JWT sub.
   * Throws ForbiddenException if not GM.
   */
  async ensureGM(candidate: number | string): Promise<void> {
    const candidateStr = String(candidate);
    const isNumeric = /^\d+$/.test(candidateStr);
    const player = await this.prisma.player.findUnique({
      where: isNumeric ? { id: Number(candidateStr) } : { sessionId: candidateStr },
      select: { role: true },
    });
    if (!player || player.role !== 'GM') {
      throw new ForbiddenException('Only GMs may perform this action');
    }
  }

  /**
   * Ensure that the requesting user is a GM in the same game as the specified FOS.
   *
   * @param candidate player ID or session ID
   * @param fosId FOS UUID to validate game context
   * @throws ForbiddenException if not a GM or not in the same game
   * @throws NotFoundException if FOS not found
   */
  async ensureGMForFos(candidate: number | string, fosId: string): Promise<void> {
    const candidateStr = String(candidate);
    const isNumeric = /^\d+$/.test(candidateStr);

    // Get player and FOS in parallel
    const [player, fos] = await Promise.all([
      this.prisma.player.findUnique({
        where: isNumeric ? { id: Number(candidateStr) } : { sessionId: candidateStr },
        select: { role: true, gameId: true },
      }),
      this.prisma.forwardOperatingSite.findUnique({
        where: { id: fosId },
        select: { gameId: true },
      })
    ]);

    if (!player || player.role !== 'GM') {
      throw new ForbiddenException('Only GMs may perform this action');
    }

    if (!fos) {
      throw new NotFoundException('FOS not found');
    }

    if (player.gameId !== fos.gameId) {
      throw new ForbiddenException('Access denied to this FOS');
    }
  }

  // ========= RFI =========

  /**
   * Retrieve all RFI answers for a specific Forward Operating Site.
   *
   * Returns all answered RFI entries for the given FOS UUID, ordered by database ID.
   * Used by the GET /fos/:id/rfi endpoint to display current RFI status to users.
   *
   * **Data Structure**: Returns AnsweredRFI objects with rfiKey, rfiValue, fosId, timestamps
   * **Ordering**: Results are ordered by database ID for consistent display
   * **Empty Result**: Returns empty array if no RFI answers exist for the FOS
   *
   * @param fosId - Database UUID of the Forward Operating Site
   * @returns Promise<AnsweredRFI[]> Array of all RFI answers for the FOS
   *
   * @example
   * const rfiAnswers = await getRfiAnswersByFosId('uuid-123');
   * // Returns: [{ rfiKey: 'CFR', rfiValue: '2', fosId: 'uuid-123', ... }]
   */
  async getRfiAnswersByFosId(fosId: string) {
    return this.prisma.answeredRFI.findMany({
      where: { fosId },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Create or update a single RFI answer for a Forward Operating Site.
   *
   * **Upsert Operation**: Creates new answer if none exists, updates existing value otherwise
   * **Validation**: Ensures rfiValue is valid ('1', '2', or '3') and FOS exists
   * **Database Constraint**: Uses compound unique constraint (fosId + rfiKey) for upsert
   * **Authorization**: Should be called only after GM authorization check in controller
   *
   * **RFI Value Meanings:**
   * - '1': Minimal capability/condition
   * - '2': Moderate capability/condition
   * - '3': Satisfactory capability/condition
   *
   * @param fosId - Database UUID of the Forward Operating Site
   * @param rfiKey - RFI category key (e.g., 'CFR', 'Mobility', 'Ramp', 'ATC', 'Equipment', 'Bed Down', 'Fuel', 'Security', 'Community', 'Medical')
   * @param rfiValue - Answer value, must be '1', '2', or '3'
   * @returns Promise<AnsweredRFI> The created or updated RFI answer
   * @throws BadRequestException When rfiValue is not '1', '2', or '3'
   * @throws NotFoundException When FOS with specified UUID does not exist
   *
   * @example
   * const answer = await upsertRfiAnswer('uuid-123', 'CFR', '2');
   * // Creates or updates CFR answer to '2' for the specified FOS
   */
  async upsertRfiAnswer(fosId: string, rfiKey: string, rfiValue: string) {
    if (!['1', '2', '3'].includes(rfiValue)) {
      throw new BadRequestException('rfiValue must be "1", "2", or "3"');
    }
    // Ensure FOS exists (FK will enforce but we give cleaner error)
    const exists = await this.prisma.forwardOperatingSite.findUnique({ where: { id: fosId }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('FOS not found');
    }
    return this.prisma.answeredRFI.upsert({
      where: { fosId_rfiKey: { fosId, rfiKey } },
      create: { fosId, rfiKey, rfiValue },
      update: { rfiValue },
    });
  }

  /**
   * Roll dice for an RFI answer and save the result to the database.
   *
   * Generates a random value between 1-3 and upserts it as the RFI answer.
   * This method provides the backend implementation for the frontend dice roll feature.
   *
   * **Random Generation**: Uses Math.random() to generate values 1, 2, or 3
   * **Database Operations**: Upserts to answeredRFI table, overwriting existing values
   * **Validation**: Ensures FOS exists before attempting to save
   *
   * @param fosId - Database UUID of the Forward Operating Site
   * @param rfiKey - RFI category key (e.g., 'CFR', 'Mobility', 'Ramp')
   * @returns Promise<AnsweredRFI[]> Complete list of RFI answers for the FOS
   * @throws NotFoundException When FOS with specified UUID does not exist
   *
   * @example
   * const rfiAnswers = await rollDiceForRfi('uuid-123', 'CFR');
   * // Returns all RFI answers for the FOS, with 'CFR' set to random value 1-3
   */
  async rollDiceForRfi(fosId: string, rfiKey: string) {
    this.logger.debug(`[DICE DEBUG] Starting dice roll for FOS ${fosId}, RFI key ${rfiKey}`);

    // Validate FOS exists
    const exists = await this.prisma.forwardOperatingSite.findUnique({
      where: { id: fosId },
      select: { id: true, fosDisplayNumber: true }
    });
    if (!exists) {
      this.logger.error(`[DICE DEBUG] FOS not found: ${fosId}`);
      throw new NotFoundException('FOS not found');
    }

    this.logger.debug(`[DICE DEBUG] FOS found: display number ${exists.fosDisplayNumber}`);

    // Generate random value between 1-3
    const mathRandom = Math.random();
    const randomValue = Math.floor(mathRandom * 3) + 1;
    const rfiValue = String(randomValue);

    this.logger.log(`[DICE DEBUG] Rolling dice for FOS ${fosId} (display #${exists.fosDisplayNumber}), RFI key ${rfiKey}: Math.random()=${mathRandom}, rolled ${rfiValue}`);

    try {
      // Upsert the rolled value to database
      const upsertResult = await this.prisma.answeredRFI.upsert({
        where: { fosId_rfiKey: { fosId, rfiKey } },
        create: { fosId, rfiKey, rfiValue },
        update: { rfiValue },
      });

      this.logger.debug(`[DICE DEBUG] Database upsert successful for FOS ${fosId}, RFI ${rfiKey}: ${JSON.stringify(upsertResult)}`);

      // Return all RFI answers for this FOS (consistent with manual upsert)
      const allAnswers = await this.getRfiAnswersByFosId(fosId);
      this.logger.debug(`[DICE DEBUG] Returning ${allAnswers.length} RFI answers for FOS ${fosId}`);

      return allAnswers;
    } catch (error) {
      this.logger.error(`[DICE DEBUG] Database operation failed for FOS ${fosId}, RFI ${rfiKey}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve RFI answers by game ID and FOS display number (helper method).
   *
   * **Purpose**: Allows querying RFI data before FOS activation using display number
   * **Use Case**: Pre-activation browsing of RFI status from game overview
   * **Implementation**: Internally resolves display number to FOS UUID then calls getRfiAnswersByFosId
   * **Graceful Handling**: Returns empty array if displayNumber not provided or FOS not found
   *
   * **Workflow:**
   * 1. Look up FOS by gameId + fosDisplayNumber compound key
   * 2. If found, retrieve all RFI answers using the FOS UUID
   * 3. If not found or displayNumber is null, return empty array
   *
   * @param gameId - Database ID of the game
   * @param displayNumber - Optional FOS display number (1-45). If null/undefined, returns empty array
   * @returns Promise<AnsweredRFI[]> Array of RFI answers, or empty array if FOS not found
   *
   * @example
   * const answers = await getRfiAnswersByGameAndDisplay(123, 7);
   * // Returns RFI answers for FOS display number 7 in game 123, or [] if not found
   */
  async getRfiAnswersByGameAndDisplay(gameId: number, displayNumber?: number) {
    if (displayNumber == null) return [];
    const fos = await this.prisma.forwardOperatingSite.findUnique({
      where: { gameId_fosDisplayNumber: { gameId, fosDisplayNumber: displayNumber } },
      select: { id: true },
    });
    if (!fos) return [];
    return this.getRfiAnswersByFosId(fos.id);
  }

  // ========= Tasks =========

  async getCompletedTasks(fosId: string): Promise<AirfieldTask[]> {
    const fos = await this.prisma.forwardOperatingSite.findUnique({
      where: { id: fosId },
      select: { completedTasks: true },
    });
    if (!fos) {
      throw new NotFoundException('FOS not found');
    }
    return fos.completedTasks ?? [];
  }

  async updateTaskCompletion(fosId: string, task: AirfieldTask, completed: boolean): Promise<AirfieldTask[]> {
    // Validate that task is a valid enum value (runtime check)
    if (!(task in AirfieldTask)) {
      throw new BadRequestException('Invalid task');
    }
    const fos = await this.prisma.forwardOperatingSite.findUnique({
      where: { id: fosId },
      select: { completedTasks: true },
    });
    if (!fos) {
      throw new NotFoundException('FOS not found');
    }
    const current = new Set<AirfieldTask>(fos.completedTasks ?? []);
    if (completed) {
      current.add(task);
    } else {
      current.delete(task);
    }
    const updated = Array.from(current.values());
    const res = await this.prisma.forwardOperatingSite.update({
      where: { id: fosId },
      data: { completedTasks: { set: updated } },
      select: { completedTasks: true, gameId: true },
    });
    // Broadcast updated FOS list to the room
    await this.broadcastFOSUpdate(res.gameId);
    return res.completedTasks;
  }

  // ========= Ownership =========

  async getOwnedFos(gameId: number, teamId?: number) {
    return this.prisma.forwardOperatingSite.findMany({
      where: {
        gameId,
        teamId: teamId ?? undefined,
      },
      select: {
        id: true,
        gameId: true,
        fosDisplayNumber: true,
        isActive: true,
        teamId: true,
        turnActivated: true,
        consecutiveStrikes: true,
        isFullyAssessed: true,
      },
      orderBy: [{ teamId: 'asc' }, { fosDisplayNumber: 'asc' }],
    });
  }

  async getFosSummary(gameId: number) {
    // Fetch teams (id + name)
    const teams = await this.prisma.team.findMany({
      where: { gameId },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });

    // Fetch all FOS for the game
    const foss = await this.prisma.forwardOperatingSite.findMany({
      where: { gameId },
      select: { id: true, teamId: true, isActive: true, consecutiveStrikes: true },
    });

    // Pre-compute RFI counts per FOS
    const fosIds = foss.map(f => f.id);
    const rfiAll = fosIds.length
      ? await this.prisma.answeredRFI.findMany({ where: { fosId: { in: fosIds } }, select: { fosId: true } })
      : [];
    const rfiCountByFos = new Map<string, number>();
    for (const r of rfiAll) {
      rfiCountByFos.set(r.fosId, (rfiCountByFos.get(r.fosId) ?? 0) + 1);
    }

    // Aggregate per team
    const summary = teams.map(t => {
      const owned = foss.filter(f => f.teamId === t.id);
      const totalOwned = owned.length;
      const active = owned.filter(f => f.isActive).length;
      const dormant = owned.filter(f => !f.isActive).length; // typically 0 because we null teamId on deactivate
      const fullyAssessed = owned.filter(f => (rfiCountByFos.get(f.id) ?? 0) >= 10).length;
      const strikesAtRisk = owned.filter(f => (f.consecutiveStrikes ?? 0) >= 2).length;

      return {
        teamId: t.id,
        teamName: t.name,
        totalOwned,
        active,
        dormant,
        fullyAssessed,
        strikesAtRisk,
      };
    });

    return summary;
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

import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateATOLineDto } from '../generated/aTOLine/create-aTOLine.dto';
import { UpdateATOLineDto } from '../generated/aTOLine/update-aTOLine.dto';
import { ATOLine } from '../generated/aTOLine/aTOLine.entity';
import { PPRStatus, AircraftInstance, PlayerRole } from '@prisma/client';
import { GameGateway } from '../../game/game.gateway';

/**
 * Service for managing Air Tasking Order (ATO) lines.
 * Handles CRUD operations, validation, and PPR approval workflow.
 */
@Injectable()
export class AtoService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => GameGateway))
    private gameGateway: GameGateway
  ) {}

  /**
   * Get aircraft available for a specific team
   */
  async getAircraftForTeam(teamId: number, user: any): Promise<AircraftInstance[]> {
    // Verify the user has access to this team
    const player = await this.prisma.player.findUnique({
      where: { id: user?.sub ?? user?.playerId },
      include: { team: true, game: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Check if user has access to this team (either same team or GM)
    if (player.role !== PlayerRole.GM && player.teamId !== teamId) {
      throw new ForbiddenException('Access denied to this team\'s aircraft');
    }

    return this.prisma.aircraftInstance.findMany({
      where: {
        teamId,
      },
      orderBy: [
        { type: 'asc' },
        { callSign: 'asc' },
      ],
    });
  }

  /**
   * Get all aircraft in a game (GM access only)
   */
  async getAllAircraftInGame(gameId: number, user: any): Promise<AircraftInstance[]> {
    // Verify the user is a GM
    const player = await this.prisma.player.findUnique({
      where: { id: user?.sub ?? user?.playerId },
      include: { team: true, game: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.role !== PlayerRole.GM) {
      throw new ForbiddenException('Only Game Masters can access all aircraft');
    }

    // Verify the game exists
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return this.prisma.aircraftInstance.findMany({
      where: {
        team: {
          gameId,
        },
      },
      include: {
        team: true,
      },
      orderBy: [
        { team: { type: 'asc' } },
        { type: 'asc' },
        { callSign: 'asc' },
      ],
    });
  }

  /**
   * Validate aircraft ownership for flight plan
   */
  async validateAircraftOwnership(aircraftCallSign: string, gameId: number, user: any): Promise<void> {
    console.log('validateAircraftOwnership called with user:', JSON.stringify(user, null, 2));


    // Get the player making the request
    const player = await this.prisma.player.findUnique({
      where: { id: user?.sub ?? user?.playerId },
      include: { team: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Find the aircraft
    const aircraft = await this.prisma.aircraftInstance.findUnique({
      where: { callSign: aircraftCallSign },
      include: { team: true },
    });

    if (player.role === PlayerRole.GM) {
      // GM may bypass ownership but aircraft must exist and belong to the same game
      if (!aircraft) {
        throw new NotFoundException(`Aircraft with call sign '${aircraftCallSign}' not found`);
      }
      if (aircraft.team?.gameId !== gameId) {
        throw new ForbiddenException(`Aircraft '${aircraftCallSign}' is not in this game`);
      }
      return;
    }

    if (!aircraft) {
      throw new NotFoundException(`Aircraft with call sign '${aircraftCallSign}' not found`);
    }

    // Verify the aircraft belongs to the player's team
    if (aircraft.teamId !== player.teamId) {
      throw new ForbiddenException(`Aircraft '${aircraftCallSign}' is not apportioned to your team`);
    }

    // Verify the aircraft is in the same game
    if (aircraft.team.gameId !== gameId) {
      throw new ForbiddenException(`Aircraft '${aircraftCallSign}' is not in this game`);
    }
  }

  /**
   * Create a new ATO line (flight plan)
   */
  async createAtoLine(createAtoLineDto: CreateATOLineDto & { gameId: number; riskTokenUsed?: boolean }, user?: any): Promise<ATOLine> {
    console.log('=== ATO Service: createAtoLine START ===');
    console.log('Input DTO:', JSON.stringify(createAtoLineDto, null, 2));
    console.log('User:', JSON.stringify(user, null, 2));

    try {
      console.log('ATO Service: Starting flight plan validation...');
      // Validate business rules including aircraft ownership
      await this.validateFlightPlan(createAtoLineDto, user);
      console.log('ATO Service: Flight plan validation passed');

      console.log('ATO Service: Creating ATO line in database...');
      const atoLine = await this.prisma.aTOLine.create({
        data: {
          gameId: createAtoLineDto.gameId,
          turn: createAtoLineDto.turn,
          aircraftCallSign: createAtoLineDto.aircraftCallSign,
          startLocation: createAtoLineDto.startLocation,
          enRouteDestination: createAtoLineDto.enRouteDestination || null,
          finalDestination: createAtoLineDto.finalDestination,
          alternateDestination: createAtoLineDto.alternateDestination || null,
          intention: createAtoLineDto.intention,
          riskTokenUsed: createAtoLineDto.riskTokenUsed || false,
          configuration: createAtoLineDto.configuration,
          pprStatus: 'PENDING',
          executionResult: null,
        },
        include: {
          game: true,
        },
      });
      console.log('ATO Service: Database creation successful');
      console.log('Created ATO Line:', JSON.stringify(atoLine, null, 2));

      // Broadcast creation event (disabled for debugging)
      // this.gameGateway.broadcastAtoLineCreated(atoLine.gameId.toString(), atoLine);

      console.log('=== ATO Service: createAtoLine SUCCESS ===');
      return atoLine;
    } catch (error) {
      console.error('=== ATO Service: createAtoLine ERROR ===');
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      console.error('=== ATO Service: createAtoLine ERROR END ===');
      throw error;
    }
  }

  /**
   * Get all ATO lines for a specific game and turn
   */
  async getAtoLinesByGameAndTurn(gameId: number, turn?: number): Promise<ATOLine[]> {
    const whereClause: any = { gameId };
    if (turn !== undefined) {
      whereClause.turn = turn;
    }

    return this.prisma.aTOLine.findMany({
      where: whereClause,
      include: {
        game: true,
      },
      orderBy: [
        { turn: 'desc' },
        { aircraftCallSign: 'asc' },
      ],
    });
  }

  /**
   * Get current turn ATO lines for a game
   */
  async getCurrentAtoLines(gameId: number): Promise<ATOLine[]> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: { turn: true },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return this.getAtoLinesByGameAndTurn(gameId, game.turn);
  }

  /**
   * Update an existing ATO line
   */
  async updateAtoLine(id: number, updateAtoLineDto: UpdateATOLineDto, user: any): Promise<ATOLine> {
    const existingLine = await this.prisma.aTOLine.findUnique({
      where: { id },
      include: { game: true },
    });

    if (!existingLine) {
      throw new NotFoundException('ATO line not found');
    }

    // Business rule: Only allow updates to pending PPR status
    if (existingLine.pprStatus !== 'PENDING') {
      throw new ForbiddenException('Cannot modify ATO line after PPR approval/denial');
    }

    // Validate the updated flight plan
    const mergedData = { ...existingLine, ...updateAtoLineDto };
    await this.validateFlightPlan(mergedData, user);

    const updatedLine = await this.prisma.aTOLine.update({
      where: { id },
      data: updateAtoLineDto,
      include: {
        game: true,
      },
    });

    // Broadcast update event
    this.gameGateway.broadcastAtoLineUpdated(updatedLine.gameId.toString(), updatedLine);

    return updatedLine;
  }

  /**
   * Delete an ATO line (only if PPR is pending)
   */
  async deleteAtoLine(id: number, user: any): Promise<void> {
    const existingLine = await this.prisma.aTOLine.findUnique({
      where: { id },
    });

    if (!existingLine) {
      throw new NotFoundException('ATO line not found');
    }

    if (existingLine.pprStatus !== 'PENDING') {
      throw new ForbiddenException('Cannot delete ATO line after PPR approval/denial');
    }

    await this.prisma.aTOLine.delete({
      where: { id },
    });

    // Broadcast deletion event
    this.gameGateway.broadcastAtoLineDeleted(
      existingLine.gameId.toString(),
      existingLine.id,
      existingLine.aircraftCallSign
    );
  }

  /**
   * Approve PPR for a flight plan (CAOC only)
   */
  async approvePpr(id: number, user: any): Promise<ATOLine> {
    const player = await this.prisma.player.findUnique({
      where: { id: user?.sub ?? user?.playerId },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    if (player.role !== PlayerRole.GM) {
      throw new ForbiddenException('Only Game Masters can approve PPR');
    }
    return this.updatePprStatus(id, 'APPROVED');
  }

  /**
   * Deny PPR for a flight plan (CAOC only)
   */
  async denyPpr(id: number, user: any): Promise<ATOLine> {
    const player = await this.prisma.player.findUnique({
      where: { id: user?.sub ?? user?.playerId },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    if (player.role !== PlayerRole.GM) {
      throw new ForbiddenException('Only Game Masters can deny PPR');
    }
    return this.updatePprStatus(id, 'DENIED');
  }

  /**
   * Bulk approve PPR for multiple pending flight plans
   */
  async bulkApprovePpr(gameId: number, atoLineIds: number[] | undefined, user: any): Promise<ATOLine[]> {
    const player = await this.prisma.player.findUnique({
      where: { id: user?.sub ?? user?.playerId },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    if (player.role !== PlayerRole.GM) {
      throw new ForbiddenException('Only Game Masters can bulk approve PPR');
    }

    const whereClause: any = {
      gameId,
      pprStatus: 'PENDING',
    };

    if (atoLineIds && atoLineIds.length > 0) {
      whereClause.id = { in: atoLineIds };
    }

    // Update all matching records
    await this.prisma.aTOLine.updateMany({
      where: whereClause,
      data: { pprStatus: 'APPROVED' },
    });

    // Return the updated records
    const approvedLines = await this.prisma.aTOLine.findMany({
      where: {
        gameId,
        id: atoLineIds ? { in: atoLineIds } : undefined,
        pprStatus: 'APPROVED',
      },
      include: { game: true },
    });

    // Broadcast bulk approval event
    this.gameGateway.broadcastBulkPprApproved(gameId.toString(), approvedLines);

    return approvedLines;
  }

  /**
   * Get PPR queue (pending approvals) for CAOC
   */
  async getPprQueue(gameId: number): Promise<ATOLine[]> {
    return this.prisma.aTOLine.findMany({
      where: {
        gameId,
        pprStatus: 'PENDING',
      },
      include: { game: true },
      orderBy: [
        { turn: 'asc' },
        { aircraftCallSign: 'asc' },
      ],
    });
  }

  /**
   * Update execution results for a flight plan
   */
  async updateExecutionResult(id: number, result: string): Promise<ATOLine> {
    const existingLine = await this.prisma.aTOLine.findUnique({
      where: { id },
    });

    if (!existingLine) {
      throw new NotFoundException('ATO line not found');
    }

    const updatedLine = await this.prisma.aTOLine.update({
      where: { id },
      data: { executionResult: result },
      include: { game: true },
    });

    // Broadcast execution result update
    this.gameGateway.broadcastExecutionResultUpdated(updatedLine.gameId.toString(), updatedLine);

    return updatedLine;
  }

  /**
   * Archive ATO lines for turn advancement
   */
  async archiveAtoLinesForTurn(gameId: number, turn: number): Promise<void> {
    // In a real implementation, you might move these to an archive table
    // For now, we'll just keep them with their turn number
    console.log(`Archiving ATO lines for game ${gameId}, turn ${turn}`);
  }

  private async updatePprStatus(id: number, status: PPRStatus): Promise<ATOLine> {
    const existingLine = await this.prisma.aTOLine.findUnique({
      where: { id },
    });

    if (!existingLine) {
      throw new NotFoundException('ATO line not found');
    }

    if (existingLine.pprStatus !== 'PENDING') {
      throw new ForbiddenException('PPR status has already been determined');
    }

    const updatedLine = await this.prisma.aTOLine.update({
      where: { id },
      data: { pprStatus: status },
      include: { game: true },
    });

    // Broadcast PPR status change
    this.gameGateway.broadcastPprStatusChanged(updatedLine.gameId.toString(), updatedLine);

    return updatedLine;
  }

  private async validateFlightPlan(flightPlan: any, user?: any): Promise<void> {
    console.log('=== ATO Service: validateFlightPlan START ===');
    console.log('Flight plan to validate:', JSON.stringify(flightPlan, null, 2));
    console.log('User for validation:', JSON.stringify(user, null, 2));

    try {
      // Validate aircraft ownership if user is provided
      if (user && flightPlan.aircraftCallSign) {
        console.log('ATO Service: Validating aircraft ownership...');
        await this.validateAircraftOwnership(flightPlan.aircraftCallSign, flightPlan.gameId, user);
        console.log('ATO Service: Aircraft ownership validation passed');
      } else {
        console.log('ATO Service: Skipping aircraft ownership validation - no user or call sign');
      }

      // Validate call sign uniqueness within game/turn
      console.log('ATO Service: Validating call sign uniqueness...');
      const whereClause: any = {
        gameId: flightPlan.gameId,
        turn: flightPlan.turn,
        aircraftCallSign: flightPlan.aircraftCallSign,
      };

      // Exclude current record for updates
      if (flightPlan.id) {
        whereClause.id = { not: flightPlan.id };
      }

      console.log('ATO Service: Checking for existing call sign with query:', JSON.stringify(whereClause, null, 2));
      const existingCallSign = await this.prisma.aTOLine.findFirst({
        where: whereClause,
      });

      if (existingCallSign) {
        console.log('ATO Service: Found existing call sign:', JSON.stringify(existingCallSign, null, 2));
        throw new ForbiddenException(`Aircraft call sign '${flightPlan.aircraftCallSign}' is already in use for this turn`);
      }
      console.log('ATO Service: Call sign uniqueness validation passed');

      // Validate destinations are different
      console.log('ATO Service: Validating destination logic...');
      if (flightPlan.startLocation === flightPlan.finalDestination) {
        console.log('ATO Service: Start and final destinations are the same - validation failed');
        throw new ForbiddenException('Start location and final destination cannot be the same');
      }
      console.log('ATO Service: Destination validation passed');

      console.log('=== ATO Service: validateFlightPlan SUCCESS ===');
      // Additional validation rules would go here:
      // - Aircraft range validation
      // - Political clearance checks
      // - MOG limits at destinations
      // - Resource availability checks
    } catch (error) {
      console.error('=== ATO Service: validateFlightPlan ERROR ===');
      console.error('Validation error:', error);
      console.error('Error message:', error.message);
      console.error('=== ATO Service: validateFlightPlan ERROR END ===');
      throw error;
    }
  }
}

import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateATOLineDto } from '../generated/aTOLine/create-aTOLine.dto';
import { UpdateATOLineDto } from '../generated/aTOLine/update-aTOLine.dto';
import { ATOLine } from '../generated/aTOLine/aTOLine.entity';
import { PPRStatus } from '@prisma/client';
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
   * Create a new ATO line (flight plan)
   */
  async createAtoLine(createAtoLineDto: CreateATOLineDto & { gameId: number; riskTokenUsed?: boolean }): Promise<ATOLine> {
    // Validate business rules
    await this.validateFlightPlan(createAtoLineDto);

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

    // Broadcast creation event
    this.gameGateway.broadcastAtoLineCreated(atoLine.gameId.toString(), atoLine);

    return atoLine;
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
  async updateAtoLine(id: number, updateAtoLineDto: UpdateATOLineDto, userId: string): Promise<ATOLine> {
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
    await this.validateFlightPlan(mergedData);

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
  async deleteAtoLine(id: number, userId: string): Promise<void> {
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
  async approvePpr(id: number): Promise<ATOLine> {
    return this.updatePprStatus(id, 'APPROVED');
  }

  /**
   * Deny PPR for a flight plan (CAOC only)
   */
  async denyPpr(id: number): Promise<ATOLine> {
    return this.updatePprStatus(id, 'DENIED');
  }

  /**
   * Bulk approve PPR for multiple pending flight plans
   */
  async bulkApprovePpr(gameId: number, atoLineIds?: number[]): Promise<ATOLine[]> {
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

  private async validateFlightPlan(flightPlan: any): Promise<void> {
    // Validate call sign uniqueness within game/turn
    const whereClause: any = {
      gameId: flightPlan.gameId,
      turn: flightPlan.turn,
      aircraftCallSign: flightPlan.aircraftCallSign,
    };

    // Exclude current record for updates
    if (flightPlan.id) {
      whereClause.id = { not: flightPlan.id };
    }

    const existingCallSign = await this.prisma.aTOLine.findFirst({
      where: whereClause,
    });

    if (existingCallSign) {
      throw new ForbiddenException(`Aircraft call sign '${flightPlan.aircraftCallSign}' is already in use for this turn`);
    }

    // Validate destinations are different
    if (flightPlan.startLocation === flightPlan.finalDestination) {
      throw new ForbiddenException('Start location and final destination cannot be the same');
    }

    // Additional validation rules would go here:
    // - Aircraft range validation
    // - Political clearance checks
    // - MOG limits at destinations
    // - Resource availability checks
  }
}

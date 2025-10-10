import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AircraftInstance,
  PlayerRole,
  TeamType,
  AircraftType,
  LocationType,
  AircraftStatus
} from '@prisma/client';
import { GameGateway } from '../../game/game.gateway';
import { AircraftPoolService } from './aircraft-pool.service';
import { generateCallSign } from './utils/callsign-generator.util';

/**
 * Service for managing aircraft allocation (simplified workflow).
 * Handles direct allocation to teams and GM spawning.
 */
@Injectable()
export class AllocationService {
  private readonly logger = new Logger(AllocationService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => GameGateway))
    private gameGateway: GameGateway,
    private aircraftPoolService: AircraftPoolService
  ) {}

  // =============================================
  //       SIMPLIFIED ALLOCATION WORKFLOW
  // =============================================

  /**
   * Get allocation table data for CAOC dashboard
   * Returns aircraft grouped by type with allocation status
   */
  async getAllocationTable(gameId: number): Promise<{
    c130Arrow: AllocationTableRow[];
    c17Moose: AllocationTableRow[];
    c5Bosco: AllocationTableRow[];
  }> {
    // Get all mobility aircraft for this game
    const aircraft = await this.prisma.aircraftInstance.findMany({
      where: {
        team: { gameId },
        type: {
          in: [AircraftType.C130, AircraftType.C17, AircraftType.C5]
        }
      },
      include: {
        allocatedToTeam: true,
      },
      orderBy: [
        { type: 'asc' },
        { callSign: 'asc' },
      ],
    });

    // Transform to table row format
    const rows: AllocationTableRow[] = aircraft.map(ac => ({
      id: ac.id,
      callSign: ac.callSign,
      aircraftType: ac.type,
      isAllocated: ac.allocatedToTeamId !== null,
      allocatedToTeamName: ac.allocatedToTeam?.name || null,
      status: ac.status as 'FMC' | 'DESTROYED',
    }));

    // Group by aircraft type
    return {
      c130Arrow: rows.filter(r => r.aircraftType === AircraftType.C130),
      c17Moose: rows.filter(r => r.aircraftType === AircraftType.C17),
      c5Bosco: rows.filter(r => r.aircraftType === AircraftType.C5),
    };
  }

  /**
   * Directly allocate an aircraft to a team (simplified workflow)
   * CAOC/GM only - bypasses request/approval cycle
   */
  async allocateAircraft(
    aircraftId: number,
    teamId: number,
    user: any
  ): Promise<AircraftInstance> {
    // Verify CFACC/GM permissions
    const player = await this.prisma.player.findUnique({
      where: { sessionId: user.sessionId },
      include: { team: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.role !== PlayerRole.GM && player.team?.type !== TeamType.CAOC) {
      throw new ForbiddenException('Only CFACC and GM can allocate aircraft');
    }

    // Verify aircraft exists
    const aircraft = await this.prisma.aircraftInstance.findUnique({
      where: { id: aircraftId },
      include: { team: true },
    });

    if (!aircraft) {
      throw new NotFoundException('Aircraft not found');
    }

    // Check if already allocated
    if (aircraft.allocatedToTeamId !== null) {
      throw new BadRequestException('Aircraft is already allocated to a team');
    }

    // Verify team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Update aircraft with allocation
    const updatedAircraft = await this.prisma.aircraftInstance.update({
      where: { id: aircraftId },
      data: {
        allocatedToTeamId: teamId,
        allocatedAt: new Date(),
      },
      include: {
        team: true,
        allocatedToTeam: true,
      },
    });

    this.logger.log(`Aircraft ${aircraft.callSign} allocated to team ${team.name} by ${player.name}`);

    // Broadcast allocation table update via WebSocket
    const gameId = aircraft.team.gameId;
    const table = await this.getAllocationTable(gameId);
    this.gameGateway.broadcastAllocationTableUpdated(gameId.toString(), table);

    return updatedAircraft;
  }

  /**
   * Remove allocation from an aircraft (simplified workflow)
   * CAOC/GM only - returns aircraft to unallocated pool
   */
  async deallocateAircraft(
    aircraftId: number,
    user: any
  ): Promise<AircraftInstance> {
    // Verify CFACC/GM permissions
    const player = await this.prisma.player.findUnique({
      where: { sessionId: user.sessionId },
      include: { team: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.role !== PlayerRole.GM && player.team?.type !== TeamType.CAOC) {
      throw new ForbiddenException('Only CFACC and GM can deallocate aircraft');
    }

    // Verify aircraft exists
    const aircraft = await this.prisma.aircraftInstance.findUnique({
      where: { id: aircraftId },
      include: {
        team: true,
        allocatedToTeam: true,
      },
    });

    if (!aircraft) {
      throw new NotFoundException('Aircraft not found');
    }

    // Check if allocated
    if (aircraft.allocatedToTeamId === null) {
      throw new BadRequestException('Aircraft is not currently allocated');
    }

    const previousTeamName = aircraft.allocatedToTeam?.name || 'Unknown';

    // Remove allocation
    const updatedAircraft = await this.prisma.aircraftInstance.update({
      where: { id: aircraftId },
      data: {
        allocatedToTeamId: null,
        allocatedAt: null,
      },
      include: {
        team: true,
        allocatedToTeam: true,
      },
    });

    this.logger.log(`Aircraft ${aircraft.callSign} deallocated from team ${previousTeamName} by ${player.name}`);

    // Broadcast allocation table update via WebSocket
    const gameId = aircraft.team.gameId;
    const table = await this.getAllocationTable(gameId);
    this.gameGateway.broadcastAllocationTableUpdated(gameId.toString(), table);

    return updatedAircraft;
  }

  // =============================================
  //            GM AIRCRAFT SPAWNING
  // =============================================

  /**
   * Spawn a new aircraft instance (GM only)
   */
  async spawnAircraft(
    gameId: number,
    type: AircraftType,
    subtype: string | null,
    teamId: number,
    rangeHexes: number | undefined,
    locationFosId?: string,
    locationHex?: string,
    user?: any,
    locationType?: LocationType
  ): Promise<AircraftInstance> {
    // Verify GM permissions
    if (user) {
      const player = await this.prisma.player.findUnique({
        where: { sessionId: user.sessionId },
      });

      if (!player || player.role !== PlayerRole.GM) {
        throw new ForbiddenException('Only GMs can spawn aircraft');
      }
    }

    // Verify game exists
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Verify team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Get existing callsigns for this type/subtype
    const existingAircraft = await this.prisma.aircraftInstance.findMany({
      where: {
        type,
        ...(type === AircraftType.C5 && subtype ? { subtype } : {}),
      },
      select: { callSign: true },
    });

    const existingCallSigns = existingAircraft.map(a => a.callSign);

    // Generate next available callsign
    const callSign = generateCallSign(type, subtype, existingCallSigns);

    // Determine range based on aircraft type if not provided
    const finalRange = rangeHexes ?? (type === AircraftType.C130 ? 3 : 4); // C130=3, C17/C5=4

    // Determine location type - use provided or infer from location data
    let finalLocationType: LocationType;
    if (locationType) {
      finalLocationType = locationType;
    } else if (locationFosId) {
      finalLocationType = LocationType.FOS;
    } else if (locationHex) {
      finalLocationType = LocationType.MOB; // Using MOB for hex locations
    } else {
      finalLocationType = LocationType.MOB; // Default to MOB
    }

    // Create aircraft instance
    const aircraft = await this.prisma.aircraftInstance.create({
      data: {
        callSign,
        type,
        subtype,
        rangeHexes: finalRange,
        status: AircraftStatus.FMC,
        locationType: finalLocationType,
        locationFosId,
        locationHex,
        teamId,
        payloadPersonnelCount: 0,
      },
      include: {
        team: true,
      },
    });

    // Broadcast aircraft spawned event
    this.gameGateway.broadcastAircraftSpawned(gameId.toString(), aircraft);

    // Update aircraft pool counts
    await this.aircraftPoolService.refreshAircraftPool(gameId);

    return aircraft;
  }

  /**
   * Delete an unallocated aircraft (GM only)
   */
  async deleteUnallocatedAircraft(
    aircraftId: number,
    user: any
  ): Promise<void> {
    // Verify GM permissions
    const player = await this.prisma.player.findUnique({
      where: { sessionId: user.sessionId },
    });

    if (!player || player.role !== PlayerRole.GM) {
      throw new ForbiddenException('Only GMs can delete aircraft');
    }

    // Verify aircraft exists and is not allocated
    const aircraft = await this.prisma.aircraftInstance.findUnique({
      where: { id: aircraftId },
      include: { team: true },
    });

    if (!aircraft) {
      throw new NotFoundException('Aircraft not found');
    }

    if (aircraft.allocatedToTeamId !== null) {
      throw new BadRequestException('Cannot delete allocated aircraft. Deallocate it first.');
    }

    // Delete aircraft
    await this.prisma.aircraftInstance.delete({
      where: { id: aircraftId },
    });

    // Broadcast aircraft removed event
    this.gameGateway.broadcastAircraftRemoved(aircraft.team.gameId.toString(), aircraftId);

    // Update aircraft pool counts
    await this.aircraftPoolService.refreshAircraftPool(aircraft.team.gameId);
  }

  /**
   * Get all aircraft for a game (GM view)
   */
  async getAllAircraftForGame(gameId: number): Promise<AircraftInstance[]> {
    return this.prisma.aircraftInstance.findMany({
      where: {
        team: { gameId },
      },
      include: {
        team: true,
        allocatedToTeam: true,
      },
      orderBy: [
        { type: 'asc' },
        { callSign: 'asc' },
      ],
    });
  }
}

/**
 * Interface for allocation table row data
 */
interface AllocationTableRow {
  id: number;
  callSign: string;
  aircraftType: string;
  isAllocated: boolean;
  allocatedToTeamName: string | null;
  status: 'FMC' | 'DESTROYED';
}

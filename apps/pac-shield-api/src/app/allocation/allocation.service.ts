import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AllocationCycle,
  AircraftRequest,
  AircraftAllocation,
  AircraftInstance,
  AllocationCycleStatus,
  AllocationRequestStatus,
  AircraftAllocationStatus,
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
 * Service for managing the CFACC aircraft allocation workflow.
 * Handles allocation cycles, requests, and allocations.
 */
@Injectable()
export class AllocationService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => GameGateway))
    private gameGateway: GameGateway,
    private aircraftPoolService: AircraftPoolService
  ) {}

  // =============================================
  //            ALLOCATION CYCLE MANAGEMENT
  // =============================================

  /**
   * Create a new allocation cycle for a game turn
   */
  async createAllocationCycle(gameId: number, turn: number): Promise<AllocationCycle> {
    // Verify game exists
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Check if cycle already exists for this game/turn
    const existingCycle = await this.prisma.allocationCycle.findUnique({
      where: { gameId_turn: { gameId, turn } },
    });

    if (existingCycle) {
      throw new BadRequestException(`Allocation cycle already exists for game ${gameId}, turn ${turn}`);
    }

    const cycle = await this.prisma.allocationCycle.create({
      data: {
        gameId,
        turn,
        status: AllocationCycleStatus.REQUESTS_OPEN,
      },
      include: {
        game: true,
        requests: {
          include: { team: true }
        },
        allocations: {
          include: {
            aircraftInstance: true,
            allocatedToTeam: true,
            aircraftRequest: true
          }
        }
      },
    });

    // Broadcast cycle created event
    this.gameGateway.broadcastAllocationCycleCreated(gameId.toString(), cycle);

    return cycle;
  }

  /**
   * Get the latest allocation cycle for a game
   */
  async getLatestAllocationCycle(gameId: number): Promise<AllocationCycle | null> {
    return this.prisma.allocationCycle.findFirst({
      where: { gameId },
      orderBy: { turn: 'desc' },
      include: {
        game: true,
        requests: {
          include: { team: true }
        },
        allocations: {
          include: {
            aircraftInstance: true,
            allocatedToTeam: true,
            aircraftRequest: true
          }
        }
      },
    });
  }

  /**
   * Update allocation cycle status
   */
  async updateAllocationCycleStatus(
    cycleId: number,
    status: AllocationCycleStatus,
    user: any
  ): Promise<AllocationCycle> {
    // Verify user has authority (CFACC or GM)
    const player = await this.prisma.player.findUnique({
      where: { sessionId: user.sessionId },
      include: { team: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.role !== PlayerRole.GM && player.team?.type !== TeamType.CAOC) {
      throw new ForbiddenException('Only CFACC and GM can update allocation cycle status');
    }

    const cycle = await this.prisma.allocationCycle.update({
      where: { id: cycleId },
      data: { status },
      include: {
        game: true,
        requests: {
          include: { team: true }
        },
        allocations: {
          include: {
            aircraftInstance: true,
            allocatedToTeam: true,
            aircraftRequest: true
          }
        }
      },
    });

    // Broadcast status change
    this.gameGateway.broadcastAllocationCycleStatusChanged(cycle.gameId.toString(), cycle);

    return cycle;
  }

  // =============================================
  //            AIRCRAFT POOL MANAGEMENT
  // =============================================

  /**
   * Get unallocated aircraft pool for a game/turn
   */
  async getUnallocatedAircraftPool(gameId: number, _turn?: number): Promise<AircraftInstance[]> {
    const whereClause: any = {
      team: { gameId },
      allocationStatus: AircraftAllocationStatus.AVAILABLE,
    };

    // For mobility aircraft only (C-17, C-130, C-5)
    whereClause.type = {
      in: [AircraftType.C17, AircraftType.C130, AircraftType.C5]
    };

    return this.prisma.aircraftInstance.findMany({
      where: whereClause,
      include: { team: true },
      orderBy: [
        { type: 'asc' },
        { callSign: 'asc' },
      ],
    });
  }

  // =============================================
  //            AIRCRAFT REQUEST MANAGEMENT
  // =============================================

  /**
   * Submit a new aircraft request from a MOB
   */
  async createAircraftRequest(
    allocationCycleId: number,
    requestData: {
      teamId: number;
      aircraftType: AircraftType;
      quantityRequested: number;
      missionJustification: string;
      priority: number;
      rationale: string;
    },
    user: any
  ): Promise<AircraftRequest> {
    // Verify the cycle exists and is accepting requests
    const cycle = await this.prisma.allocationCycle.findUnique({
      where: { id: allocationCycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Allocation cycle not found');
    }

    if (cycle.status !== AllocationCycleStatus.REQUESTS_OPEN) {
      throw new BadRequestException('Allocation cycle is not accepting requests');
    }

    // Verify user has authority for this team
    await this.validateTeamAccess(requestData.teamId, user);

    // Validate request data
    if (requestData.quantityRequested <= 0) {
      throw new BadRequestException('Quantity requested must be greater than 0');
    }

    if (requestData.priority < 1 || requestData.priority > 5) {
      throw new BadRequestException('Priority must be between 1 and 5');
    }

    const request = await this.prisma.aircraftRequest.create({
      data: {
        allocationCycleId,
        teamId: requestData.teamId,
        aircraftType: requestData.aircraftType,
        quantityRequested: requestData.quantityRequested,
        missionJustification: requestData.missionJustification,
        priority: requestData.priority,
        rationale: requestData.rationale,
      },
      include: {
        team: true,
        allocationCycle: true,
      },
    });

    // Broadcast request created
    this.gameGateway.broadcastAircraftRequestCreated(cycle.gameId.toString(), request);

    return request;
  }

  /**
   * Get all aircraft requests for a specific allocation cycle
   */
  async getRequestsForCycle(cycleId: number, user: any): Promise<AircraftRequest[]> {
    // Verify user has authority (CFACC or GM)
    const player = await this.prisma.player.findUnique({
      where: { sessionId: user.sessionId },
      include: { team: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.role !== PlayerRole.GM && player.team?.type !== TeamType.CAOC) {
      throw new ForbiddenException('Only CFACC and GM can view all requests');
    }

    return this.prisma.aircraftRequest.findMany({
      where: { allocationCycleId: cycleId },
      include: {
        team: true,
        allocationCycle: true,
        allocations: {
          include: { aircraftInstance: true }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Get aircraft requests for a specific team
   */
  async getRequestsForTeam(teamId: number, user: any): Promise<AircraftRequest[]> {
    // Verify user has access to this team
    await this.validateTeamAccess(teamId, user);

    return this.prisma.aircraftRequest.findMany({
      where: { teamId },
      include: {
        team: true,
        allocationCycle: true,
        allocations: {
          include: { aircraftInstance: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update an aircraft request (MOB can update their own pending requests)
   */
  async updateAircraftRequest(
    requestId: number,
    updateData: {
      quantityRequested?: number;
      missionJustification?: string;
      priority?: number;
      rationale?: string;
    },
    user: any
  ): Promise<AircraftRequest> {
    const existingRequest = await this.prisma.aircraftRequest.findUnique({
      where: { id: requestId },
      include: { allocationCycle: true },
    });

    if (!existingRequest) {
      throw new NotFoundException('Aircraft request not found');
    }

    // Only allow updates to pending requests
    if (existingRequest.status !== AllocationRequestStatus.PENDING) {
      throw new BadRequestException('Cannot update request after CFACC review');
    }

    // Verify user has access to this team
    await this.validateTeamAccess(existingRequest.teamId, user);

    const updatedRequest = await this.prisma.aircraftRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        team: true,
        allocationCycle: true,
        allocations: {
          include: { aircraftInstance: true }
        }
      },
    });

    // Broadcast update
    this.gameGateway.broadcastAircraftRequestUpdated(
      existingRequest.allocationCycle.gameId.toString(),
      updatedRequest
    );

    return updatedRequest;
  }

  /**
   * Delete an aircraft request (withdraw)
   */
  async deleteAircraftRequest(requestId: number, user: any): Promise<void> {
    const existingRequest = await this.prisma.aircraftRequest.findUnique({
      where: { id: requestId },
      include: { allocationCycle: true },
    });

    if (!existingRequest) {
      throw new NotFoundException('Aircraft request not found');
    }

    // Only allow deletion of pending requests
    if (existingRequest.status !== AllocationRequestStatus.PENDING) {
      throw new BadRequestException('Cannot delete request after CFACC review');
    }

    // Verify user has access to this team
    await this.validateTeamAccess(existingRequest.teamId, user);

    await this.prisma.aircraftRequest.delete({
      where: { id: requestId },
    });

    // Broadcast deletion
    this.gameGateway.broadcastAircraftRequestDeleted(
      existingRequest.allocationCycle.gameId.toString(),
      requestId
    );
  }

  // =============================================
  //            CFACC ALLOCATION WORKFLOW
  // =============================================

  /**
   * CFACC reviews and updates a request status
   */
  async reviewAircraftRequest(
    requestId: number,
    reviewData: {
      status: AllocationRequestStatus;
      quantityAllocated?: number;
      cfaccNotes?: string;
    },
    user: any
  ): Promise<AircraftRequest> {
    // Verify user has authority (CFACC or GM)
    const player = await this.prisma.player.findUnique({
      where: { sessionId: user.sessionId },
      include: { team: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.role !== PlayerRole.GM && player.team?.type !== TeamType.CAOC) {
      throw new ForbiddenException('Only CFACC and GM can review requests');
    }

    const request = await this.prisma.aircraftRequest.update({
      where: { id: requestId },
      data: {
        status: reviewData.status,
        quantityAllocated: reviewData.quantityAllocated || 0,
        cfaccNotes: reviewData.cfaccNotes,
      },
      include: {
        team: true,
        allocationCycle: true,
        allocations: {
          include: { aircraftInstance: true }
        }
      },
    });

    // Broadcast review
    this.gameGateway.broadcastAircraftRequestReviewed(
      request.allocationCycle.gameId.toString(),
      request
    );

    return request;
  }

  /**
   * Create an aircraft allocation (assign aircraft to team)
   */
  async createAircraftAllocation(
    allocationData: {
      allocationCycleId: number;
      aircraftRequestId: number;
      aircraftInstanceId: number;
      allocatedToTeamId: number;
    },
    user: any
  ): Promise<AircraftAllocation> {
    // Verify user has authority (CFACC or GM)
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

    // Get allocation cycle and game info
    const cycle = await this.prisma.allocationCycle.findUnique({
      where: { id: allocationData.allocationCycleId },
      include: { game: true },
    });

    if (!cycle) {
      throw new NotFoundException('Allocation cycle not found');
    }

    // Verify aircraft is available
    const aircraft = await this.prisma.aircraftInstance.findUnique({
      where: { id: allocationData.aircraftInstanceId },
    });

    if (!aircraft) {
      throw new NotFoundException('Aircraft not found');
    }

    if (aircraft.allocationStatus !== AircraftAllocationStatus.AVAILABLE) {
      throw new BadRequestException('Aircraft is not available for allocation');
    }

    // Update aircraft pool and create allocation
    const allocation = await this.prisma.$transaction(async (tx) => {
      // Update aircraft status
      await tx.aircraftInstance.update({
        where: { id: allocationData.aircraftInstanceId },
        data: { allocationStatus: AircraftAllocationStatus.ALLOCATED },
      });

      // Create allocation
      const newAllocation = await tx.aircraftAllocation.create({
        data: allocationData,
        include: {
          allocationCycle: true,
          aircraftRequest: { include: { team: true } },
          aircraftInstance: true,
          allocatedToTeam: true,
        },
      });

      // Update aircraft pool counts (outside transaction to avoid deadlock)
      await this.aircraftPoolService.allocateAircraft(
        cycle.gameId,
        cycle.turn,
        cycle.game.executionBlock,
        aircraft.type,
        1
      );

      return newAllocation;
    });

    // Broadcast allocation
    this.gameGateway.broadcastAircraftAllocated(
      allocation.allocationCycle.gameId.toString(),
      allocation
    );

    return allocation;
  }

  /**
   * Delete an aircraft allocation (return to pool)
   */
  async deleteAircraftAllocation(allocationId: number, user: any): Promise<void> {
    // Verify user has authority (CFACC or GM)
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

    const allocation = await this.prisma.aircraftAllocation.findUnique({
      where: { id: allocationId },
      include: {
        allocationCycle: { include: { game: true } },
        aircraftInstance: true,
        allocatedToTeam: true
      },
    });

    if (!allocation) {
      throw new NotFoundException('Aircraft allocation not found');
    }

    // Remove allocation and update aircraft status
    await this.prisma.$transaction(async (tx) => {
      // Update aircraft status back to available
      await tx.aircraftInstance.update({
        where: { id: allocation.aircraftInstanceId },
        data: { allocationStatus: AircraftAllocationStatus.AVAILABLE },
      });

      // Delete allocation
      await tx.aircraftAllocation.delete({
        where: { id: allocationId },
      });
    });

    // Update aircraft pool counts
    await this.aircraftPoolService.deallocateAircraft(
      allocation.allocationCycle.gameId,
      allocation.allocationCycle.turn,
      allocation.allocationCycle.game.executionBlock,
      allocation.aircraftInstance.type,
      1
    );

    // Broadcast deallocation
    this.gameGateway.broadcastAircraftDeallocated(
      allocation.allocationCycle.gameId.toString(),
      allocationId,
      allocation.aircraftInstance.callSign
    );
  }

  /**
   * Get all allocations for a cycle
   */
  async getAllocationsForCycle(cycleId: number): Promise<AircraftAllocation[]> {
    return this.prisma.aircraftAllocation.findMany({
      where: { allocationCycleId: cycleId },
      include: {
        allocationCycle: true,
        aircraftRequest: { include: { team: true } },
        aircraftInstance: true,
        allocatedToTeam: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // =============================================
  //            HELPER METHODS
  // =============================================

  /**
   * Validate that a user has access to a team
   */
  private async validateTeamAccess(teamId: number, user: any): Promise<void> {
    const player = await this.prisma.player.findUnique({
      where: { sessionId: user.sessionId },
      include: { team: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // GMs can access any team
    if (player.role === PlayerRole.GM) {
      return;
    }

    // Players can only access their own team
    if (player.teamId !== teamId) {
      throw new ForbiddenException('Access denied to this team');
    }
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
        allocationStatus: AircraftAllocationStatus.AVAILABLE,
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

    if (aircraft.allocationStatus === AircraftAllocationStatus.ALLOCATED) {
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
        allocation: {
          include: {
            allocatedToTeam: true,
          },
        },
      },
      orderBy: [
        { type: 'asc' },
        { callSign: 'asc' },
      ],
    });
  }

  // =============================================
  //            DIRECT ALLOCATION
  // =============================================

  /**
   * Directly allocate an aircraft to a team (CFACC/GM only)
   * Bypasses the request workflow
   */
  async directAllocateAircraft(
    aircraftInstanceId: number,
    allocatedToTeamId: number,
    allocationCycleId: number,
    user: any
  ): Promise<AircraftAllocation> {
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

    // Verify aircraft exists and is available
    const aircraft = await this.prisma.aircraftInstance.findUnique({
      where: { id: aircraftInstanceId },
    });

    if (!aircraft) {
      throw new NotFoundException('Aircraft not found');
    }

    if (aircraft.allocationStatus === AircraftAllocationStatus.ALLOCATED) {
      throw new BadRequestException('Aircraft is already allocated');
    }

    // Verify allocation cycle exists
    const cycle = await this.prisma.allocationCycle.findUnique({
      where: { id: allocationCycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Allocation cycle not found');
    }

    // Verify team exists
    const team = await this.prisma.team.findUnique({
      where: { id: allocatedToTeamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Create a dummy request for the allocation (or make aircraftRequestId optional)
    // For simplicity, we'll create a minimal request
    const dummyRequest = await this.prisma.aircraftRequest.create({
      data: {
        allocationCycleId,
        teamId: allocatedToTeamId,
        aircraftType: aircraft.type,
        quantityRequested: 1,
        missionJustification: 'Direct allocation by CFACC',
        priority: 3,
        rationale: 'Direct allocation',
        status: AllocationRequestStatus.APPROVED,
        quantityAllocated: 1,
      },
    });

    // Create allocation
    const allocation = await this.prisma.aircraftAllocation.create({
      data: {
        allocationCycleId,
        aircraftRequestId: dummyRequest.id,
        aircraftInstanceId,
        allocatedToTeamId,
      },
      include: {
        aircraftInstance: true,
        allocatedToTeam: true,
        aircraftRequest: true,
        allocationCycle: true,
      },
    });

    // Update aircraft allocation status
    await this.prisma.aircraftInstance.update({
      where: { id: aircraftInstanceId },
      data: { allocationStatus: AircraftAllocationStatus.ALLOCATED },
    });

    // Broadcast allocation event
    this.gameGateway.broadcastAircraftAllocated(cycle.gameId.toString(), allocation);

    // Update aircraft pool counts
    await this.aircraftPoolService.refreshAircraftPool(cycle.gameId);

    return allocation;
  }
}

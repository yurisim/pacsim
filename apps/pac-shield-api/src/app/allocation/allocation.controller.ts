import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AllocationService } from './allocation.service';
import { AircraftPoolService } from './aircraft-pool.service';
import {
  AllocationCycle,
  AircraftRequest,
  AircraftAllocation,
  AircraftInstance,
  AircraftPool,
  AllocationCycleStatus,
  AircraftType
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAircraftRequestDto } from './dto/create-aircraft-request.dto';
import { UpdateAircraftRequestDto } from './dto/update-aircraft-request.dto';
import { ReviewAircraftRequestDto } from './dto/review-aircraft-request.dto';
import { CreateAircraftAllocationDto } from './dto/create-aircraft-allocation.dto';

/**
 * Controller for CFACC aircraft allocation operations.
 * Handles allocation cycles, requests, and allocations.
 */
@Controller('allocation')
@UseGuards(JwtAuthGuard)
export class AllocationController {
  constructor(
    private readonly allocationService: AllocationService,
    private readonly aircraftPoolService: AircraftPoolService
  ) {}

  // =============================================
  //            ALLOCATION CYCLE ENDPOINTS
  // =============================================

  /**
   * Create a new allocation cycle for the current game turn
   * POST /allocation/cycles
   */
  @Post('cycles')
  async createAllocationCycle(
    @Body() body: { gameId: number; turn: number },
    @Request() _req: any
  ): Promise<AllocationCycle> {
    return this.allocationService.createAllocationCycle(body.gameId, body.turn);
  }

  /**
   * Get the latest allocation cycle for a game
   * GET /allocation/cycles/game/:gameId/latest
   */
  @Get('cycles/game/:gameId/latest')
  async getLatestAllocationCycle(
    @Param('gameId', ParseIntPipe) gameId: number
  ): Promise<AllocationCycle | null> {
    return this.allocationService.getLatestAllocationCycle(gameId);
  }

  /**
   * Update allocation cycle status
   * PUT /allocation/cycles/:cycleId
   */
  @Put('cycles/:cycleId')
  async updateAllocationCycleStatus(
    @Param('cycleId', ParseIntPipe) cycleId: number,
    @Body() body: { status: AllocationCycleStatus },
    @Request() req: any
  ): Promise<AllocationCycle> {
    return this.allocationService.updateAllocationCycleStatus(cycleId, body.status, req.user);
  }

  // =============================================
  //            AIRCRAFT POOL ENDPOINTS
  // =============================================

  /**
   * Get current aircraft pool status
   * GET /allocation/aircraft-pool/:gameId
   */
  @Get('aircraft-pool/:gameId')
  async getAircraftPool(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Query('turn') turn?: string,
    @Query('executionBlock') executionBlock?: string
  ): Promise<AircraftPool[]> {
    const turnNumber = turn ? parseInt(turn, 10) : undefined;
    const blockNumber = executionBlock ? parseInt(executionBlock, 10) : undefined;
    return this.aircraftPoolService.getAircraftPool(gameId, turnNumber, blockNumber);
  }

  /**
   * Get aircraft pool statistics
   * GET /allocation/aircraft-pool/:gameId/statistics
   */
  @Get('aircraft-pool/:gameId/statistics')
  async getAircraftStatistics(
    @Param('gameId', ParseIntPipe) gameId: number
  ): Promise<any> {
    return this.aircraftPoolService.getAircraftStatistics(gameId);
  }

  /**
   * Process turn-based aircraft pool refresh
   * POST /allocation/aircraft-pool/:gameId/refresh
   */
  @Post('aircraft-pool/:gameId/refresh')
  async refreshAircraftPool(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Request() _req: any
  ): Promise<AircraftPool[]> {
    return this.aircraftPoolService.refreshAircraftPool(gameId);
  }

  /**
   * Initialize aircraft pool at game start
   * POST /allocation/aircraft-pool/:gameId/initialize
   */
  @Post('aircraft-pool/:gameId/initialize')
  async initializeAircraftPool(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Request() _req: any
  ): Promise<AircraftPool[]> {
    return this.aircraftPoolService.initializeAircraftPool(gameId);
  }

  /**
   * Manual aircraft pool adjustment (GM only)
   * PUT /allocation/aircraft-pool/:gameId/manual-adjust
   */
  @Put('aircraft-pool/:gameId/manual-adjust')
  async manualAdjustPool(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() adjustmentData: {
      turn: number;
      executionBlock: number;
      aircraftType: AircraftType;
      availableCount?: number;
      allocatedCount?: number;
      inTransitCount?: number;
      maintenanceCount?: number;
    },
    @Request() _req: any
  ): Promise<AircraftPool> {
    return this.aircraftPoolService.manualAdjustPool(
      gameId,
      adjustmentData.turn,
      adjustmentData.executionBlock,
      adjustmentData.aircraftType,
      {
        availableCount: adjustmentData.availableCount,
        allocatedCount: adjustmentData.allocatedCount,
        inTransitCount: adjustmentData.inTransitCount,
        maintenanceCount: adjustmentData.maintenanceCount,
      }
    );
  }

  /**
   * Get unallocated aircraft instances (legacy endpoint for compatibility)
   * GET /allocation/pool
   */
  @Get('pool')
  async getUnallocatedAircraftPool(
    @Query('gameId', ParseIntPipe) gameId: number,
    @Query('turn') turn?: string
  ): Promise<AircraftInstance[]> {
    const turnNumber = turn ? parseInt(turn, 10) : undefined;
    return this.allocationService.getUnallocatedAircraftPool(gameId, turnNumber);
  }

  // =============================================
  //            AIRCRAFT REQUEST ENDPOINTS
  // =============================================

  /**
   * Submit a new aircraft request from a MOB
   * POST /allocation/requests
   */
  @Post('requests')
  async createAircraftRequest(
    @Body() createAircraftRequestDto: CreateAircraftRequestDto,
    @Request() req: any
  ): Promise<AircraftRequest> {
    return this.allocationService.createAircraftRequest(
      createAircraftRequestDto.allocationCycleId,
      {
        teamId: createAircraftRequestDto.teamId,
        aircraftType: createAircraftRequestDto.aircraftType,
        quantityRequested: createAircraftRequestDto.quantityRequested,
        missionJustification: createAircraftRequestDto.missionJustification,
        priority: createAircraftRequestDto.priority,
        rationale: createAircraftRequestDto.rationale,
      },
      req.user
    );
  }

  /**
   * Get all aircraft requests for a specific allocation cycle
   * GET /allocation/requests/cycle/:cycleId
   */
  @Get('requests/cycle/:cycleId')
  async getRequestsForCycle(
    @Param('cycleId', ParseIntPipe) cycleId: number,
    @Request() req: any
  ): Promise<AircraftRequest[]> {
    return this.allocationService.getRequestsForCycle(cycleId, req.user);
  }

  /**
   * Get aircraft requests for a specific team
   * GET /allocation/requests/team/:teamId
   */
  @Get('requests/team/:teamId')
  async getRequestsForTeam(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Request() req: any
  ): Promise<AircraftRequest[]> {
    return this.allocationService.getRequestsForTeam(teamId, req.user);
  }

  /**
   * Update an aircraft request
   * PUT /allocation/requests/:requestId
   */
  @Put('requests/:requestId')
  async updateAircraftRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() updateAircraftRequestDto: UpdateAircraftRequestDto,
    @Request() req: any
  ): Promise<AircraftRequest> {
    return this.allocationService.updateAircraftRequest(requestId, updateAircraftRequestDto, req.user);
  }

  /**
   * Delete an aircraft request (withdraw)
   * DELETE /allocation/requests/:requestId
   */
  @Delete('requests/:requestId')
  async deleteAircraftRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Request() req: any
  ): Promise<{ success: boolean }> {
    await this.allocationService.deleteAircraftRequest(requestId, req.user);
    return { success: true };
  }

  // =============================================
  //            CFACC ALLOCATION ENDPOINTS
  // =============================================

  /**
   * CFACC reviews and updates a request status
   * PUT /allocation/requests/:requestId/review
   */
  @Put('requests/:requestId/review')
  async reviewAircraftRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() reviewAircraftRequestDto: ReviewAircraftRequestDto,
    @Request() req: any
  ): Promise<AircraftRequest> {
    return this.allocationService.reviewAircraftRequest(requestId, reviewAircraftRequestDto, req.user);
  }

  /**
   * Create an aircraft allocation
   * POST /allocation/allocations
   */
  @Post('allocations')
  async createAircraftAllocation(
    @Body() createAircraftAllocationDto: CreateAircraftAllocationDto,
    @Request() req: any
  ): Promise<AircraftAllocation> {
    return this.allocationService.createAircraftAllocation(createAircraftAllocationDto, req.user);
  }

  /**
   * Delete an aircraft allocation
   * DELETE /allocation/allocations/:allocationId
   */
  @Delete('allocations/:allocationId')
  async deleteAircraftAllocation(
    @Param('allocationId', ParseIntPipe) allocationId: number,
    @Request() req: any
  ): Promise<{ success: boolean }> {
    await this.allocationService.deleteAircraftAllocation(allocationId, req.user);
    return { success: true };
  }

  /**
   * Get all allocations for a cycle
   * GET /allocation/allocations/cycle/:cycleId
   */
  @Get('allocations/cycle/:cycleId')
  async getAllocationsForCycle(
    @Param('cycleId', ParseIntPipe) cycleId: number
  ): Promise<AircraftAllocation[]> {
    return this.allocationService.getAllocationsForCycle(cycleId);
  }
}

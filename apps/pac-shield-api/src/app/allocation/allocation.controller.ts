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
  AircraftInstance,
  AircraftPool,
  AircraftType
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpawnAircraftDto } from './dto/spawn-aircraft.dto';
import { AllocateAircraftDto } from './dto/allocate-aircraft.dto';

/**
 * Controller for aircraft allocation operations (simplified workflow).
 * Handles aircraft pool management, direct allocation, and GM spawning.
 */
@Controller('allocation')
@UseGuards(JwtAuthGuard)
export class AllocationController {
  constructor(
    private readonly allocationService: AllocationService,
    private readonly aircraftPoolService: AircraftPoolService
  ) {}

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

  // =============================================
  //            GM AIRCRAFT SPAWNING ENDPOINTS
  // =============================================

  /**
   * Spawn a new aircraft instance (GM only)
   * POST /allocation/spawn-aircraft (primary endpoint for tests/compatibility)
   */
  @Post('spawn-aircraft')
  async spawnAircraftCompat(
    @Body() dto: SpawnAircraftDto,
    @Request() req: any
  ): Promise<AircraftInstance> {
    return this.allocationService.spawnAircraft(
      dto.gameId,
      dto.type,
      dto.subtype || null,
      dto.teamId,
      dto.rangeHexes,
      dto.locationFosId,
      dto.locationHex,
      req.user,
      dto.locationType
    );
  }

  /**
   * Spawn a new aircraft instance (GM only)
   * POST /allocation/aircraft/spawn (alternative path)
   */
  @Post('aircraft/spawn')
  async spawnAircraft(
    @Body() dto: SpawnAircraftDto,
    @Request() req: any
  ): Promise<AircraftInstance> {
    return this.allocationService.spawnAircraft(
      dto.gameId,
      dto.type,
      dto.subtype || null,
      dto.teamId,
      dto.rangeHexes,
      dto.locationFosId,
      dto.locationHex,
      req.user,
      dto.locationType
    );
  }

  /**
   * Delete an unallocated aircraft (GM only)
   * DELETE /allocation/aircraft/:id
   */
  @Delete('aircraft/:id')
  async deleteAircraft(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ): Promise<void> {
    return this.allocationService.deleteUnallocatedAircraft(id, req.user);
  }

  /**
   * Get all aircraft for a game (GM view)
   * GET /allocation/aircraft/game/:gameId
   */
  @Get('aircraft/game/:gameId')
  async getAllAircraft(
    @Param('gameId', ParseIntPipe) gameId: number
  ): Promise<AircraftInstance[]> {
    return this.allocationService.getAllAircraftForGame(gameId);
  }

  // =============================================
  //       SIMPLIFIED ALLOCATION ENDPOINTS
  // =============================================

  /**
   * Get allocation table data for CAOC dashboard
   * GET /allocation/table/:gameId
   */
  @Get('table/:gameId')
  async getAllocationTable(
    @Param('gameId', ParseIntPipe) gameId: number
  ): Promise<{
    c130Arrow: any[];
    c17Moose: any[];
    c5Bosco: any[];
  }> {
    return this.allocationService.getAllocationTable(gameId);
  }

  /**
   * Allocate an aircraft to a team (CAOC/GM only)
   * PUT /allocation/aircraft/:id/allocate
   */
  @Put('aircraft/:id/allocate')
  async allocateAircraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AllocateAircraftDto,
    @Request() req: any
  ): Promise<AircraftInstance> {
    return this.allocationService.allocateAircraft(id, dto.teamId, req.user);
  }

  /**
   * Deallocate an aircraft (CAOC/GM only)
   * PUT /allocation/aircraft/:id/deallocate
   */
  @Put('aircraft/:id/deallocate')
  async deallocateAircraft(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ): Promise<AircraftInstance> {
    return this.allocationService.deallocateAircraft(id, req.user);
  }
}

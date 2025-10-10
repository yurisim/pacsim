import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AircraftPool,
  AircraftType
} from '@prisma/client';
import { GameGateway } from '../../game/game.gateway';

/**
 * Service for managing the centralized aircraft pool.
 * Handles aircraft inventory tracking, turn-based apportionment,
 * and USTRANSCOM delivery schedules.
 */
@Injectable()
export class AircraftPoolService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => GameGateway))
    private gameGateway: GameGateway
  ) {}

  // =============================================
  //            POOL INITIALIZATION
  // =============================================

  /**
   * Initialize aircraft pool at game start with USTRANSCOM allocation
   */
  async initializeAircraftPool(gameId: number): Promise<AircraftPool[]> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Initial USTRANSCOM allocation based on game start
    // These numbers should match the user guide specifications
    const initialAllocation = [
      { type: AircraftType.C17, available: 12, allocated: 0, inTransit: 0, maintenance: 2 },
      { type: AircraftType.C130, available: 8, allocated: 0, inTransit: 0, maintenance: 1 },
      { type: AircraftType.C5, available: 0, allocated: 0, inTransit: 2, maintenance: 0 }, // First delivery in transit
    ];

    const pools: AircraftPool[] = [];

    for (const allocation of initialAllocation) {
      const pool = await this.prisma.aircraftPool.create({
        data: {
          gameId,
          turn: game.turn,
          executionBlock: game.executionBlock,
          aircraftType: allocation.type,
          availableCount: allocation.available,
          allocatedCount: allocation.allocated,
          inTransitCount: allocation.inTransit,
          maintenanceCount: allocation.maintenance,
        },
      });
      pools.push(pool);
    }

    return pools;
  }

  // =============================================
  //          TURN-BASED APPORTIONMENT
  // =============================================

  /**
   * Process turn-based aircraft apportionment and USTRANSCOM deliveries
   */
  async processApportionment(gameId: number, turn: number, executionBlock: number): Promise<AircraftPool[]> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Get previous turn's pool state
    const previousPools = await this.getAircraftPool(gameId, turn - 1, executionBlock);
    const newPools: AircraftPool[] = [];

    for (const aircraftType of [AircraftType.C17, AircraftType.C130, AircraftType.C5]) {
      const previousPool = previousPools.find(p => p.aircraftType === aircraftType);
      let newCounts = {
        available: previousPool?.availableCount || 0,
        allocated: 0, // Reset allocations each turn
        inTransit: previousPool?.inTransitCount || 0,
        maintenance: previousPool?.maintenanceCount || 0,
      };

      // Process aircraft returning from missions (simplification - all allocated aircraft return)
      newCounts.available += previousPool?.allocatedCount || 0;

      // Process USTRANSCOM deliveries
      if (aircraftType === AircraftType.C5) {
        newCounts = this.processUSTRANSCOMDelivery(newCounts, turn);
      }

      // Process random events (maintenance, etc.)
      newCounts = this.processRandomEvents(newCounts, aircraftType);

      // Upsert pool entry for this turn (update if exists, create if not)
      const pool = await this.prisma.aircraftPool.upsert({
        where: {
          gameId_turn_executionBlock_aircraftType: {
            gameId,
            turn,
            executionBlock,
            aircraftType,
          },
        },
        update: {
          availableCount: newCounts.available,
          allocatedCount: newCounts.allocated,
          inTransitCount: newCounts.inTransit,
          maintenanceCount: newCounts.maintenance,
        },
        create: {
          gameId,
          turn,
          executionBlock,
          aircraftType,
          availableCount: newCounts.available,
          allocatedCount: newCounts.allocated,
          inTransitCount: newCounts.inTransit,
          maintenanceCount: newCounts.maintenance,
        },
      });
      newPools.push(pool);
    }

    return newPools;
  }

  /**
   * Process USTRANSCOM C-5 delivery schedule (every other turn starting turn 1)
   */
  private processUSTRANSCOMDelivery(
    counts: { available: number; allocated: number; inTransit: number; maintenance: number },
    turn: number
  ): { available: number; allocated: number; inTransit: number; maintenance: number } {
    // C-5 deliveries every other turn starting turn 1
    if (turn % 2 === 1) {
      // Delivery turn - aircraft in transit become available
      counts.available += counts.inTransit;
      counts.inTransit = 0;

      // Check theater limit (maximum 6 C-5s in theater)
      const totalInTheater = counts.available + counts.allocated + counts.maintenance;
      if (totalInTheater < 6) {
        // New delivery starts transit (will arrive next turn)
        const deliverySize = Math.min(2, 6 - totalInTheater);
        counts.inTransit = deliverySize;
      }
    }

    return counts;
  }

  /**
   * Process random maintenance and availability events
   */
  private processRandomEvents(
    counts: { available: number; allocated: number; inTransit: number; maintenance: number },
    aircraftType: AircraftType
  ): { available: number; allocated: number; inTransit: number; maintenance: number } {
    // Simple maintenance model - some aircraft may go into maintenance
    // Aircraft in maintenance may return to service

    // Return some aircraft from maintenance (dice roll simulation)
    const maintenanceReturn = Math.floor(Math.random() * (counts.maintenance + 1));
    counts.available += maintenanceReturn;
    counts.maintenance -= maintenanceReturn;

    // Some available aircraft may go into maintenance (low probability)
    const maintenanceRate = aircraftType === AircraftType.C5 ? 0.1 : 0.05; // C-5s are higher maintenance
    const newMaintenance = Math.floor(counts.available * maintenanceRate * Math.random());
    counts.available -= newMaintenance;
    counts.maintenance += newMaintenance;

    return counts;
  }

  // =============================================
  //          ALLOCATION MANAGEMENT
  // =============================================

  /**
   * Allocate aircraft from pool to team
   */
  async allocateAircraft(
    gameId: number,
    turn: number,
    executionBlock: number,
    aircraftType: AircraftType,
    quantity: number
  ): Promise<AircraftPool> {
    const pool = await this.getAircraftPoolByType(gameId, turn, executionBlock, aircraftType);

    if (!pool) {
      throw new NotFoundException(`Aircraft pool not found for ${aircraftType}`);
    }

    if (pool.availableCount < quantity) {
      throw new BadRequestException(
        `Insufficient ${aircraftType} aircraft available. Requested: ${quantity}, Available: ${pool.availableCount}`
      );
    }

    return this.prisma.aircraftPool.update({
      where: { id: pool.id },
      data: {
        availableCount: pool.availableCount - quantity,
        allocatedCount: pool.allocatedCount + quantity,
      },
    });
  }

  /**
   * Deallocate aircraft back to pool
   */
  async deallocateAircraft(
    gameId: number,
    turn: number,
    executionBlock: number,
    aircraftType: AircraftType,
    quantity: number
  ): Promise<AircraftPool> {
    const pool = await this.getAircraftPoolByType(gameId, turn, executionBlock, aircraftType);

    if (!pool) {
      throw new NotFoundException(`Aircraft pool not found for ${aircraftType}`);
    }

    if (pool.allocatedCount < quantity) {
      throw new BadRequestException(
        `Cannot deallocate more ${aircraftType} aircraft than allocated. Requested: ${quantity}, Allocated: ${pool.allocatedCount}`
      );
    }

    return this.prisma.aircraftPool.update({
      where: { id: pool.id },
      data: {
        availableCount: pool.availableCount + quantity,
        allocatedCount: pool.allocatedCount - quantity,
      },
    });
  }

  // =============================================
  //           POOL STATUS QUERIES
  // =============================================

  /**
   * Get current aircraft pool status for a game
   */
  async getAircraftPool(gameId: number, turn?: number, executionBlock?: number): Promise<AircraftPool[]> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const queryTurn = turn ?? game.turn;
    const queryExecutionBlock = executionBlock ?? game.executionBlock;

    return this.prisma.aircraftPool.findMany({
      where: {
        gameId,
        turn: queryTurn,
        executionBlock: queryExecutionBlock,
      },
      orderBy: { aircraftType: 'asc' },
    });
  }

  /**
   * Get aircraft pool for specific aircraft type
   */
  async getAircraftPoolByType(
    gameId: number,
    turn: number,
    executionBlock: number,
    aircraftType: AircraftType
  ): Promise<AircraftPool | null> {
    return this.prisma.aircraftPool.findUnique({
      where: {
        gameId_turn_executionBlock_aircraftType: {
          gameId,
          turn,
          executionBlock,
          aircraftType,
        },
      },
    });
  }

  /**
   * Get aircraft availability statistics
   */
  async getAircraftStatistics(gameId: number): Promise<{
    [key in AircraftType]?: {
      total: number;
      available: number;
      allocated: number;
      inTransit: number;
      maintenance: number;
      utilizationRate: number;
    };
  }> {
    const pools = await this.getAircraftPool(gameId);
    const stats: any = {};

    for (const pool of pools) {
      const total = pool.availableCount + pool.allocatedCount + pool.inTransitCount + pool.maintenanceCount;
      const utilizationRate = total > 0 ? pool.allocatedCount / total : 0;

      stats[pool.aircraftType] = {
        total,
        available: pool.availableCount,
        allocated: pool.allocatedCount,
        inTransit: pool.inTransitCount,
        maintenance: pool.maintenanceCount,
        utilizationRate,
      };
    }

    return stats;
  }

  // =============================================
  //           MANUAL ADJUSTMENTS
  // =============================================

  /**
   * Manual aircraft pool adjustment for game master
   */
  async manualAdjustPool(
    gameId: number,
    turn: number,
    executionBlock: number,
    aircraftType: AircraftType,
    adjustments: {
      availableCount?: number;
      allocatedCount?: number;
      inTransitCount?: number;
      maintenanceCount?: number;
    }
  ): Promise<AircraftPool> {
    const pool = await this.getAircraftPoolByType(gameId, turn, executionBlock, aircraftType);

    if (!pool) {
      throw new NotFoundException(`Aircraft pool not found for ${aircraftType}`);
    }

    return this.prisma.aircraftPool.update({
      where: { id: pool.id },
      data: {
        ...adjustments,
        lastUpdated: new Date(),
      },
    });
  }

  /**
   * Refresh aircraft pool for new execution block
   */
  async refreshAircraftPool(gameId: number): Promise<AircraftPool[]> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const updatedPools = await this.processApportionment(gameId, game.turn, game.executionBlock);

    // Broadcast pool update
    this.gameGateway.broadcastAircraftPoolUpdated(gameId.toString(), {
      pools: updatedPools,
      turn: game.turn,
      executionBlock: game.executionBlock
    });

    return updatedPools;
  }
}

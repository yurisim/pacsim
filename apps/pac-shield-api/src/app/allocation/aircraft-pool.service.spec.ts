import { Test, TestingModule } from '@nestjs/testing';
import { AircraftPoolService } from './aircraft-pool.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GameGateway } from '../../game/game.gateway';
import { AircraftType } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock the PrismaService
const mockPrismaService = {
  game: {
    findUnique: jest.fn(),
  },
  aircraftPool: {
    create: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as any;

const mockGameGateway = {
  broadcastAllocationCycleCreated: jest.fn(),
  broadcastAllocationCycleStatusChanged: jest.fn(),
  broadcastAircraftRequestCreated: jest.fn(),
  broadcastAircraftRequestUpdated: jest.fn(),
  broadcastAircraftRequestDeleted: jest.fn(),
  broadcastAircraftRequestReviewed: jest.fn(),
  broadcastAircraftAllocated: jest.fn(),
  broadcastAircraftDeallocated: jest.fn(),
};

describe('AircraftPoolService', () => {
  let service: AircraftPoolService;
  let prismaService: any;
  let gameGateway: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AircraftPoolService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GameGateway,
          useValue: mockGameGateway,
        },
      ],
    }).compile();

    service = module.get<AircraftPoolService>(AircraftPoolService);
    prismaService = module.get(PrismaService);
    gameGateway = module.get(GameGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeAircraftPool', () => {
    it('should initialize aircraft pool with correct USTRANSCOM allocation', async () => {
      const gameId = 1;
      const mockGame = { id: gameId, turn: 1, executionBlock: 1 };
      const mockC17Pool = {
        id: 1,
        gameId,
        turn: 1,
        executionBlock: 1,
        aircraftType: AircraftType.C17,
        availableCount: 12,
        allocatedCount: 0,
        inTransitCount: 0,
        maintenanceCount: 2,
      };
      const mockC130Pool = {
        id: 2,
        gameId,
        turn: 1,
        executionBlock: 1,
        aircraftType: AircraftType.C130,
        availableCount: 8,
        allocatedCount: 0,
        inTransitCount: 0,
        maintenanceCount: 1,
      };
      const mockC5Pool = {
        id: 3,
        gameId,
        turn: 1,
        executionBlock: 1,
        aircraftType: AircraftType.C5,
        availableCount: 0,
        allocatedCount: 0,
        inTransitCount: 2,
        maintenanceCount: 0,
      };

      prismaService.game.findUnique.mockResolvedValue(mockGame);
      prismaService.aircraftPool.create
        .mockResolvedValueOnce(mockC17Pool)
        .mockResolvedValueOnce(mockC130Pool)
        .mockResolvedValueOnce(mockC5Pool);

      const result = await service.initializeAircraftPool(gameId);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        aircraftType: AircraftType.C17,
        availableCount: 12,
        maintenanceCount: 2,
      });
      expect(result[1]).toMatchObject({
        aircraftType: AircraftType.C130,
        availableCount: 8,
        maintenanceCount: 1,
      });
      expect(result[2]).toMatchObject({
        aircraftType: AircraftType.C5,
        availableCount: 0,
        inTransitCount: 2,
      });
    });

    it('should throw NotFoundException if game does not exist', async () => {
      const gameId = 999;
      prismaService.game.findUnique.mockResolvedValue(null);

      await expect(service.initializeAircraftPool(gameId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.initializeAircraftPool(gameId)).rejects.toThrow(
        'Game not found'
      );
    });
  });

  describe('processApportionment', () => {
    it('should process turn-based apportionment correctly', async () => {
      const gameId = 1;
      const turn = 2;
      const executionBlock = 1;
      const mockGame = { id: gameId, turn, executionBlock };

      const previousPools = [
        {
          aircraftType: AircraftType.C17,
          availableCount: 10,
          allocatedCount: 2,
          inTransitCount: 0,
          maintenanceCount: 2,
        },
        {
          aircraftType: AircraftType.C130,
          availableCount: 6,
          allocatedCount: 2,
          inTransitCount: 0,
          maintenanceCount: 1,
        },
        {
          aircraftType: AircraftType.C5,
          availableCount: 2,
          allocatedCount: 0,
          inTransitCount: 0,
          maintenanceCount: 0,
        },
      ];

      const newPools = [
        {
          id: 4,
          gameId,
          turn,
          executionBlock,
          aircraftType: AircraftType.C17,
          availableCount: 12, // 10 + 2 (returned from allocation)
          allocatedCount: 0,
          inTransitCount: 0,
          maintenanceCount: 2,
        },
        {
          id: 5,
          gameId,
          turn,
          executionBlock,
          aircraftType: AircraftType.C130,
          availableCount: 8, // 6 + 2 (returned from allocation)
          allocatedCount: 0,
          inTransitCount: 0,
          maintenanceCount: 1,
        },
        {
          id: 6,
          gameId,
          turn,
          executionBlock,
          aircraftType: AircraftType.C5,
          availableCount: 2,
          allocatedCount: 0,
          inTransitCount: 0,
          maintenanceCount: 0,
        },
      ];

      prismaService.game.findUnique.mockResolvedValue(mockGame);

      // Mock getAircraftPool to return previous turn's pools
      jest.spyOn(service, 'getAircraftPool').mockResolvedValue(previousPools as any);

      prismaService.aircraftPool.upsert
        .mockResolvedValueOnce(newPools[0])
        .mockResolvedValueOnce(newPools[1])
        .mockResolvedValueOnce(newPools[2]);

      const result = await service.processApportionment(gameId, turn, executionBlock);

      expect(result).toHaveLength(3);
      expect(prismaService.aircraftPool.upsert).toHaveBeenCalledTimes(3);
    });

    it('should handle USTRANSCOM C-5 delivery schedule correctly', async () => {
      const gameId = 1;
      const turn = 3; // Odd turn for C-5 delivery
      const executionBlock = 1;
      const mockGame = { id: gameId, turn, executionBlock };

      const previousPools = [
        {
          aircraftType: AircraftType.C5,
          availableCount: 2,
          allocatedCount: 0,
          inTransitCount: 2, // Aircraft in transit
          maintenanceCount: 0,
        },
      ];

      prismaService.game.findUnique.mockResolvedValue(mockGame);
      jest.spyOn(service, 'getAircraftPool').mockResolvedValue(previousPools as any);

      const expectedC5Pool = {
        id: 7,
        gameId,
        turn,
        executionBlock,
        aircraftType: AircraftType.C5,
        availableCount: 4, // 2 + 2 (from transit)
        allocatedCount: 0,
        inTransitCount: 2, // New delivery
        maintenanceCount: 0,
      };

      prismaService.aircraftPool.upsert.mockResolvedValue(expectedC5Pool);

      const result = await service.processApportionment(gameId, turn, executionBlock);

      expect(result).toHaveLength(3); // C17, C130, C5
      // The C-5 pool should have aircraft from transit becoming available
      const c5Pool = result.find(p => p.aircraftType === AircraftType.C5);
      expect(c5Pool?.availableCount).toBeGreaterThan(2);
    });
  });

  describe('allocateAircraft', () => {
    it('should allocate aircraft successfully', async () => {
      const gameId = 1;
      const turn = 1;
      const executionBlock = 1;
      const aircraftType = AircraftType.C17;
      const quantity = 2;

      const mockPool = {
        id: 1,
        gameId,
        turn,
        executionBlock,
        aircraftType,
        availableCount: 5,
        allocatedCount: 0,
        inTransitCount: 0,
        maintenanceCount: 2,
      };

      const updatedPool = {
        ...mockPool,
        availableCount: 3,
        allocatedCount: 2,
      };

      jest.spyOn(service, 'getAircraftPoolByType').mockResolvedValue(mockPool as any);
      prismaService.aircraftPool.update.mockResolvedValue(updatedPool);

      const result = await service.allocateAircraft(gameId, turn, executionBlock, aircraftType, quantity);

      expect(result.availableCount).toBe(3);
      expect(result.allocatedCount).toBe(2);
      expect(prismaService.aircraftPool.update).toHaveBeenCalledWith({
        where: { id: mockPool.id },
        data: {
          availableCount: 3,
          allocatedCount: 2,
        },
      });
    });

    it('should throw BadRequestException if insufficient aircraft available', async () => {
      const gameId = 1;
      const turn = 1;
      const executionBlock = 1;
      const aircraftType = AircraftType.C17;
      const quantity = 10;

      const mockPool = {
        id: 1,
        availableCount: 5,
        allocatedCount: 0,
      };

      jest.spyOn(service, 'getAircraftPoolByType').mockResolvedValue(mockPool as any);

      await expect(
        service.allocateAircraft(gameId, turn, executionBlock, aircraftType, quantity)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.allocateAircraft(gameId, turn, executionBlock, aircraftType, quantity)
      ).rejects.toThrow('Insufficient C17 aircraft available');
    });

    it('should throw NotFoundException if pool not found', async () => {
      const gameId = 1;
      const turn = 1;
      const executionBlock = 1;
      const aircraftType = AircraftType.C17;
      const quantity = 2;

      jest.spyOn(service, 'getAircraftPoolByType').mockResolvedValue(null);

      await expect(
        service.allocateAircraft(gameId, turn, executionBlock, aircraftType, quantity)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.allocateAircraft(gameId, turn, executionBlock, aircraftType, quantity)
      ).rejects.toThrow('Aircraft pool not found for C17');
    });
  });

  describe('deallocateAircraft', () => {
    it('should deallocate aircraft successfully', async () => {
      const gameId = 1;
      const turn = 1;
      const executionBlock = 1;
      const aircraftType = AircraftType.C17;
      const quantity = 2;

      const mockPool = {
        id: 1,
        gameId,
        turn,
        executionBlock,
        aircraftType,
        availableCount: 3,
        allocatedCount: 2,
        inTransitCount: 0,
        maintenanceCount: 2,
      };

      const updatedPool = {
        ...mockPool,
        availableCount: 5,
        allocatedCount: 0,
      };

      jest.spyOn(service, 'getAircraftPoolByType').mockResolvedValue(mockPool as any);
      prismaService.aircraftPool.update.mockResolvedValue(updatedPool);

      const result = await service.deallocateAircraft(gameId, turn, executionBlock, aircraftType, quantity);

      expect(result.availableCount).toBe(5);
      expect(result.allocatedCount).toBe(0);
      expect(prismaService.aircraftPool.update).toHaveBeenCalledWith({
        where: { id: mockPool.id },
        data: {
          availableCount: 5,
          allocatedCount: 0,
        },
      });
    });

    it('should throw BadRequestException if trying to deallocate more than allocated', async () => {
      const gameId = 1;
      const turn = 1;
      const executionBlock = 1;
      const aircraftType = AircraftType.C17;
      const quantity = 5;

      const mockPool = {
        id: 1,
        allocatedCount: 2,
      };

      jest.spyOn(service, 'getAircraftPoolByType').mockResolvedValue(mockPool as any);

      await expect(
        service.deallocateAircraft(gameId, turn, executionBlock, aircraftType, quantity)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deallocateAircraft(gameId, turn, executionBlock, aircraftType, quantity)
      ).rejects.toThrow('Cannot deallocate more C17 aircraft than allocated');
    });
  });

  describe('getAircraftPool', () => {
    it('should return aircraft pool for current game state', async () => {
      const gameId = 1;
      const mockGame = { id: gameId, turn: 2, executionBlock: 1 };
      const mockPools = [
        {
          id: 1,
          gameId,
          turn: 2,
          executionBlock: 1,
          aircraftType: AircraftType.C17,
          availableCount: 10,
          allocatedCount: 2,
          inTransitCount: 0,
          maintenanceCount: 2,
        },
        {
          id: 2,
          gameId,
          turn: 2,
          executionBlock: 1,
          aircraftType: AircraftType.C130,
          availableCount: 6,
          allocatedCount: 2,
          inTransitCount: 0,
          maintenanceCount: 1,
        },
      ];

      prismaService.game.findUnique.mockResolvedValue(mockGame);
      prismaService.aircraftPool.findMany.mockResolvedValue(mockPools);

      const result = await service.getAircraftPool(gameId);

      expect(result).toEqual(mockPools);
      expect(prismaService.aircraftPool.findMany).toHaveBeenCalledWith({
        where: {
          gameId,
          turn: 2,
          executionBlock: 1,
        },
        orderBy: { aircraftType: 'asc' },
      });
    });

    it('should use provided turn and execution block parameters', async () => {
      const gameId = 1;
      const turn = 3;
      const executionBlock = 2;
      const mockGame = { id: gameId, turn: 2, executionBlock: 1 };
      const mockPools: any[] = [];

      prismaService.game.findUnique.mockResolvedValue(mockGame);
      prismaService.aircraftPool.findMany.mockResolvedValue(mockPools);

      await service.getAircraftPool(gameId, turn, executionBlock);

      expect(prismaService.aircraftPool.findMany).toHaveBeenCalledWith({
        where: {
          gameId,
          turn: 3,
          executionBlock: 2,
        },
        orderBy: { aircraftType: 'asc' },
      });
    });
  });

  describe('getAircraftStatistics', () => {
    it('should return aircraft utilization statistics', async () => {
      const gameId = 1;
      const mockPools = [
        {
          aircraftType: AircraftType.C17,
          availableCount: 8,
          allocatedCount: 4,
          inTransitCount: 0,
          maintenanceCount: 2,
        },
        {
          aircraftType: AircraftType.C130,
          availableCount: 5,
          allocatedCount: 3,
          inTransitCount: 0,
          maintenanceCount: 1,
        },
      ];

      jest.spyOn(service, 'getAircraftPool').mockResolvedValue(mockPools as any);

      const result = await service.getAircraftStatistics(gameId);

      expect(result[AircraftType.C17]).toEqual({
        total: 14, // 8 + 4 + 0 + 2
        available: 8,
        allocated: 4,
        inTransit: 0,
        maintenance: 2,
        utilizationRate: 4 / 14, // allocated / total
      });

      expect(result[AircraftType.C130]).toEqual({
        total: 9, // 5 + 3 + 0 + 1
        available: 5,
        allocated: 3,
        inTransit: 0,
        maintenance: 1,
        utilizationRate: 3 / 9, // allocated / total
      });
    });
  });

  describe('manualAdjustPool', () => {
    it('should allow manual pool adjustments', async () => {
      const gameId = 1;
      const turn = 1;
      const executionBlock = 1;
      const aircraftType = AircraftType.C17;
      const adjustments = {
        availableCount: 15,
        maintenanceCount: 1,
      };

      const mockPool = {
        id: 1,
        gameId,
        turn,
        executionBlock,
        aircraftType,
        availableCount: 10,
        allocatedCount: 2,
        inTransitCount: 0,
        maintenanceCount: 2,
      };

      const updatedPool = {
        ...mockPool,
        ...adjustments,
        lastUpdated: new Date(),
      };

      jest.spyOn(service, 'getAircraftPoolByType').mockResolvedValue(mockPool as any);
      prismaService.aircraftPool.update.mockResolvedValue(updatedPool);

      const result = await service.manualAdjustPool(
        gameId,
        turn,
        executionBlock,
        aircraftType,
        adjustments
      );

      expect(result.availableCount).toBe(15);
      expect(result.maintenanceCount).toBe(1);
      expect(prismaService.aircraftPool.update).toHaveBeenCalledWith({
        where: { id: mockPool.id },
        data: {
          ...adjustments,
          lastUpdated: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if pool not found for manual adjustment', async () => {
      const gameId = 1;
      const turn = 1;
      const executionBlock = 1;
      const aircraftType = AircraftType.C17;
      const adjustments = { availableCount: 15 };

      jest.spyOn(service, 'getAircraftPoolByType').mockResolvedValue(null);

      await expect(
        service.manualAdjustPool(gameId, turn, executionBlock, aircraftType, adjustments)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.manualAdjustPool(gameId, turn, executionBlock, aircraftType, adjustments)
      ).rejects.toThrow('Aircraft pool not found for C17');
    });
  });
});

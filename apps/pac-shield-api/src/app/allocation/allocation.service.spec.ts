import { Test, TestingModule } from '@nestjs/testing';
import { AllocationService } from './allocation.service';
import { AircraftPoolService } from './aircraft-pool.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GameGateway } from '../../game/game.gateway';

// Mock the PrismaService, GameGateway, and AircraftPoolService
const mockPrismaService = {
  game: {
    findUnique: jest.fn(),
  },
  allocationCycle: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  aircraftInstance: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  aircraftRequest: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  aircraftAllocation: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  player: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
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

const mockAircraftPoolService = {
  initializeAircraftPool: jest.fn(),
  processApportionment: jest.fn(),
  allocateAircraft: jest.fn(),
  deallocateAircraft: jest.fn(),
  getAircraftPool: jest.fn(),
  getAircraftPoolByType: jest.fn(),
  getAircraftStatistics: jest.fn(),
  manualAdjustPool: jest.fn(),
  refreshAircraftPool: jest.fn(),
};

describe('AllocationService', () => {
  let service: AllocationService;
  let prismaService: any;
  let gameGateway: any;
  let aircraftPoolService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllocationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GameGateway,
          useValue: mockGameGateway,
        },
        {
          provide: AircraftPoolService,
          useValue: mockAircraftPoolService,
        },
      ],
    }).compile();

    service = module.get<AllocationService>(AllocationService);
    prismaService = module.get(PrismaService);
    gameGateway = module.get(GameGateway);
    aircraftPoolService = module.get(AircraftPoolService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAllocationCycle', () => {
    it('should create a new allocation cycle successfully', async () => {
      const gameId = 1;
      const turn = 1;
      const mockGame = { id: gameId, turn: 1 };
      const mockCycle = {
        id: 1,
        gameId,
        turn,
        status: 'REQUESTS_OPEN',
        game: mockGame,
        requests: [],
        allocations: [],
      };

      prismaService.game.findUnique.mockResolvedValue(mockGame as any);
      prismaService.allocationCycle.findUnique.mockResolvedValue(null);
      prismaService.allocationCycle.create.mockResolvedValue(mockCycle as any);

      const result = await service.createAllocationCycle(gameId, turn);

      expect(result).toEqual(mockCycle);
      expect(prismaService.game.findUnique).toHaveBeenCalledWith({
        where: { id: gameId },
      });
      expect(prismaService.allocationCycle.create).toHaveBeenCalledWith({
        data: {
          gameId,
          turn,
          status: 'REQUESTS_OPEN',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if game does not exist', async () => {
      const gameId = 999;
      const turn = 1;

      prismaService.game.findUnique.mockResolvedValue(null);

      await expect(service.createAllocationCycle(gameId, turn)).rejects.toThrow(
        'Game not found'
      );
    });

    it('should throw BadRequestException if cycle already exists', async () => {
      const gameId = 1;
      const turn = 1;
      const mockGame = { id: gameId, turn: 1 };
      const existingCycle = { id: 1, gameId, turn };

      prismaService.game.findUnique.mockResolvedValue(mockGame as any);
      prismaService.allocationCycle.findUnique.mockResolvedValue(existingCycle as any);

      await expect(service.createAllocationCycle(gameId, turn)).rejects.toThrow(
        `Allocation cycle already exists for game ${gameId}, turn ${turn}`
      );
    });
  });

  describe('getUnallocatedAircraftPool', () => {
    it('should return unallocated mobility aircraft', async () => {
      const gameId = 1;
      const mockAircraft = [
        { id: 1, type: 'C17', callSign: 'TRANSPORT-01', allocationStatus: 'AVAILABLE' },
        { id: 2, type: 'C130', callSign: 'TRANSPORT-02', allocationStatus: 'AVAILABLE' },
      ];

      prismaService.aircraftInstance.findMany.mockResolvedValue(mockAircraft as any);

      const result = await service.getUnallocatedAircraftPool(gameId);

      expect(result).toEqual(mockAircraft);
      expect(prismaService.aircraftInstance.findMany).toHaveBeenCalledWith({
        where: {
          team: { gameId },
          allocationStatus: 'AVAILABLE',
          type: { in: ['C17', 'C130', 'C5'] },
        },
        include: { team: true },
        orderBy: [{ type: 'asc' }, { callSign: 'asc' }],
      });
    });
  });
});

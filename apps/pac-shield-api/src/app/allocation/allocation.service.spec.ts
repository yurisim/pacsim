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

  // Tests for simplified allocation methods (getAllocationTable, allocateAircraft, etc.)
  // can be added here as needed. The old cycle-based workflow has been removed.
});

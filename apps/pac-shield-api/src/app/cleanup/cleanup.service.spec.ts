import { Test, TestingModule } from '@nestjs/testing';
import { CleanupService, InactiveGameInfo } from './cleanup.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CleanupService', () => {
  let service: CleanupService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      game: {
        findMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      $executeRawUnsafe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getInactiveGames', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('queries games updated before the 96-hour cutoff and maps counts', async () => {
      // Freeze time to assert the computed cutoff date precisely
      const FROZEN_NOW = new Date('2025-01-01T00:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(FROZEN_NOW);

      const expectedCutoff = new Date(FROZEN_NOW);
      expectedCutoff.setHours(expectedCutoff.getHours() - 96);

      const inactiveFromDb = [
        {
          id: 10,
          roomCode: 'OLD123',
          createdAt: new Date('2024-12-20T00:00:00.000Z'),
          updatedAt: new Date('2024-12-27T00:00:00.000Z'),
          turn: 3,
          _count: { players: 4, teams: 9 },
        },
      ];
      (prisma.game.findMany as jest.Mock).mockResolvedValue(inactiveFromDb);

      const result = await service.getInactiveGames();

      // Verify the query uses the correct cutoff and includes required relations and order
      expect(prisma.game.findMany).toHaveBeenCalledTimes(1);
      const callArg = (prisma.game.findMany as jest.Mock).mock.calls[0][0];
      expect(callArg.include).toEqual({
        _count: { select: { players: true, teams: true } },
      });
      expect(callArg.orderBy).toEqual({ updatedAt: 'asc' });
      expect(callArg.where).toBeDefined();
      expect(callArg.where.updatedAt).toBeDefined();
      expect(callArg.where.updatedAt.lt).toBeInstanceOf(Date);
      expect(callArg.where.updatedAt.lt.getTime()).toBe(expectedCutoff.getTime());

      // Verify mapping to InactiveGameInfo
      expect(result).toEqual([
        {
          id: 10,
          roomCode: 'OLD123',
          createdAt: inactiveFromDb[0].createdAt,
          updatedAt: inactiveFromDb[0].updatedAt,
          turn: 3,
          playerCount: 4,
          teamCount: 9,
        },
      ]);
    });
  });

  describe('deleteGame', () => {
    it('deletes a specific game by id via Prisma (cascade at DB level)', async () => {
      (prisma.game.delete as jest.Mock).mockResolvedValue({});

      await service.deleteGame(42);

      expect(prisma.game.delete).toHaveBeenCalledWith({ where: { id: 42 } });
    });
  });

  describe('deleteInactiveGames', () => {
    it('returns 0 and skips VACUUM when no inactive games exist', async () => {
      const getInactiveSpy = jest
        .spyOn(service, 'getInactiveGames')
        .mockResolvedValue([]);

      const count = await service.deleteInactiveGames();

      expect(getInactiveSpy).toHaveBeenCalledTimes(1);
      expect(count).toBe(0);
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(prisma.game.delete).not.toHaveBeenCalled();
    });

    it('deletes each inactive game and runs VACUUM ANALYZE; returns deleted count', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      const older = new Date('2024-12-25T00:00:00.000Z');

      const inactiveGames: InactiveGameInfo[] = [
        {
          id: 1,
          roomCode: 'INACT1',
          createdAt: new Date('2024-12-01T00:00:00.000Z'),
          updatedAt: older,
          turn: 1,
          playerCount: 0,
          teamCount: 0,
        },
        {
          id: 2,
          roomCode: 'INACT2',
          createdAt: new Date('2024-12-05T00:00:00.000Z'),
          updatedAt: older,
          turn: 2,
          playerCount: 0,
          teamCount: 0,
        },
      ];

      jest.spyOn(service, 'getInactiveGames').mockResolvedValue(inactiveGames);
      const deleteGameSpy = jest.spyOn(service, 'deleteGame').mockResolvedValue();
      (prisma.$executeRawUnsafe as jest.Mock).mockResolvedValue(0);

      const count = await service.deleteInactiveGames();

      expect(deleteGameSpy).toHaveBeenCalledTimes(2);
      expect(deleteGameSpy).toHaveBeenNthCalledWith(1, 1);
      expect(deleteGameSpy).toHaveBeenNthCalledWith(2, 2);
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith('VACUUM ANALYZE;');
      expect(count).toBe(2);
    });

    it('continues and returns count even if VACUUM ANALYZE fails', async () => {
      jest
        .spyOn(service, 'getInactiveGames')
        .mockResolvedValue([
          {
            id: 99,
            roomCode: 'OLDVAC',
            createdAt: new Date('2024-12-01T00:00:00.000Z'),
            updatedAt: new Date('2024-12-20T00:00:00.000Z'),
            turn: 1,
            playerCount: 0,
            teamCount: 0,
          },
        ]);

      jest.spyOn(service, 'deleteGame').mockResolvedValue();
      (prisma.$executeRawUnsafe as jest.Mock).mockRejectedValue(
        new Error('permission denied')
      );

      const count = await service.deleteInactiveGames();

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith('VACUUM ANALYZE;');
      expect(count).toBe(1);
    });

    it('cascade deletes dependent records for each deleted game (simulation)', async () => {
      // Simulate inactive game list resolved by service
      jest
        .spyOn(service, 'getInactiveGames')
        .mockResolvedValue([
          {
            id: 7,
            roomCode: 'OLD7',
            createdAt: new Date('2024-12-01T00:00:00.000Z'),
            updatedAt: new Date('2024-12-20T00:00:00.000Z'),
            turn: 1,
            playerCount: 0,
            teamCount: 0,
          },
        ]);

      jest.spyOn(service, 'deleteGame').mockResolvedValue();
      (prisma.$executeRawUnsafe as jest.Mock).mockResolvedValue(0);

      // Mock dependent tables returning empty after deletion to simulate cascade
      (prisma as any).team = { findMany: jest.fn().mockResolvedValue([]) };
      (prisma as any).player = { findMany: jest.fn().mockResolvedValue([]) };
      (prisma as any).countryAccess = { findMany: jest.fn().mockResolvedValue([]) };

      const deleted = await service.deleteInactiveGames();
      expect(deleted).toBe(1);

      const remainingTeams = await (prisma as any).team.findMany({ where: { gameId: 7 } });
      const remainingPlayers = await (prisma as any).player.findMany({ where: { gameId: 7 } });
      const remainingCountryAccess = await (prisma as any).countryAccess.findMany({ where: { gameId: 7 } });

      expect(remainingTeams).toEqual([]);
      expect(remainingPlayers).toEqual([]);
      expect(remainingCountryAccess).toEqual([]);
    });
  });

  describe('handleScheduledCleanup', () => {
    it('invokes deleteInactiveGames during the scheduled cleanup job', async () => {
      const spy = jest.spyOn(service, 'deleteInactiveGames').mockResolvedValue(3);

      await service.handleScheduledCleanup();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCleanupStats', () => {
    it('computes totals and derives active/inactive counts', async () => {
      (prisma.game.count as jest.Mock).mockResolvedValue(10);
      jest
        .spyOn(service, 'getInactiveGames')
        .mockResolvedValue(
          Array.from({ length: 4 }).map((_, i) => ({
            id: i + 1,
            roomCode: `OLD-${i + 1}`,
            createdAt: new Date('2024-12-01T00:00:00.000Z'),
            updatedAt: new Date('2024-12-20T00:00:00.000Z'),
            turn: 1,
            playerCount: 0,
            teamCount: 0,
          }))
        );

      (prisma.game.findFirst as jest.Mock).mockResolvedValue({
        updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      });

      const stats = await service.getCleanupStats();

      expect(stats.totalGames).toBe(10);
      expect(stats.inactiveGames).toBe(4);
      expect(stats.activeGames).toBe(6);
      expect(stats.oldestActiveGame).toBeInstanceOf(Date);
    });
  });
});

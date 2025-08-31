import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateGameDto, ConnectGameDto } from '../app/generated';
import { TeamType } from '.prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('GameService', () => {
  let service: GameService;
  let prisma: PrismaService;
  let authService: AuthService;

  beforeEach(async () => {
    const mockPrismaService = {
      game: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      team: {
        create: jest.fn(),
      },
    };
    const mockAuthService = {
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createGame', () => {
    it('should create a game and associated teams', async () => {
      const createGameDto: CreateGameDto = { victoryConditionMP: 100 };
      const mockGame = { id: 1, roomCode: 'ABCDEF', ...createGameDto };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.game.create as jest.Mock).mockResolvedValue(mockGame);

      const result = await service.createGame(createGameDto);

      expect(prisma.game.create).toHaveBeenCalled();
      expect(prisma.team.create).toHaveBeenCalledTimes(
        Object.values(TeamType).length
      );
      expect(result).toEqual(mockGame);
    });
  });

  describe('getGameById', () => {
    it('should return the game if the id is valid', async () => {
      const mockGame = { id: 1, teams: [{ players: [] }] };
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

      const result = await service.getGameById(1);

      expect(prisma.game.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { teams: { include: { players: true } } },
      });
      expect(result).toEqual(mockGame);
    });

    it('should throw NotFoundException if the id is invalid', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getGameById(999)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('joinGame', () => {
    it('should return a token if the room code is valid', async () => {
      const connectGameDto: ConnectGameDto = {
        roomCode: 'VALID',
      };
      const mockGame = { id: 1, roomCode: 'VALID', teams: [] };
      const mockToken = { token: 'mock-jwt' };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (authService.login as jest.Mock).mockResolvedValue(mockToken);

      const result = await service.joinGame(connectGameDto);

      expect(prisma.game.findUnique).toHaveBeenCalledWith({
        where: { roomCode: 'VALID' },
        include: { teams: true },
      });
      expect(authService.login).toHaveBeenCalledWith(mockGame.id);
      expect(result).toEqual(mockToken);
    });

    it('should throw NotFoundException if the room code is invalid', async () => {
      const connectGameDto: ConnectGameDto = {
        roomCode: 'INVALID',
      };
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.joinGame(connectGameDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('generateRoomCode', () => {
    it('should return a 6-character alphanumeric string', () => {
      const roomCode = (service as any).generateRoomCode();
      expect(typeof roomCode).toBe('string');
      expect(roomCode.length).toBe(6);
      expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
    });
  });
});

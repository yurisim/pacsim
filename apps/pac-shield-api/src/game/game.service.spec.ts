import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { ConnectGameDto } from '../app/generated';

describe('GameService', () => {
  let service: GameService;
  let prisma: any;
  let authService: any;

  beforeEach(async () => {
    const mockPrismaService = {
      game: {
        findUnique: jest.fn(),
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

  describe('joinGame', () => {
    it('should return a token if the room code is valid', async () => {
      const connectGameDto: ConnectGameDto = {
        roomCode: 'VALID',
      };
      const mockGame = { id: 1, roomCode: 'VALID', teams: [] };
      const mockToken = { token: 'mock-jwt' };

      prisma.game.findUnique.mockResolvedValue(mockGame);
      authService.login.mockResolvedValue(mockToken);

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
      prisma.game.findUnique.mockResolvedValue(null);

      await expect(service.joinGame(connectGameDto)).rejects.toThrow(
        NotFoundException
      );
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
});

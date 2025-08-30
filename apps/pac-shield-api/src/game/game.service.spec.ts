import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectGameDto } from '@pac-shield/types';

describe('GameService', () => {
  let service: GameService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrismaService = {
      game: {
        findUnique: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('joinGame', () => {
    it('should return the game with teams if the room code is valid', async () => {
      const connectGameDto: ConnectGameDto = {
        roomCode: 'VALID',
      };
      const mockGame = { id: 1, roomCode: 'VALID', teams: [] };
      prisma.game.findUnique.mockResolvedValue(mockGame);

      const result = await service.joinGame(connectGameDto);

      expect(prisma.game.findUnique).toHaveBeenCalledWith({
        where: { roomCode: 'VALID' },
        include: { teams: true },
      });
      expect(result).toEqual(mockGame);
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

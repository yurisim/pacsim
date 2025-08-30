import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';
import { JoinGameDto } from '@pac-shield/types';

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
    it('should return the game if the room code is valid', async () => {
      const joinGameDto: JoinGameDto = {
        roomCode: 'VALID',
        playerName: 'Player1',
      };
      const mockGame = { id: 1, roomCode: 'VALID' };
      prisma.game.findUnique.mockResolvedValue(mockGame);

      const result = await service.joinGame(joinGameDto);
      expect(result).toEqual(mockGame);
    });

    it('should throw NotFoundException if the room code is invalid', async () => {
      const joinGameDto: JoinGameDto = {
        roomCode: 'INVALID',
        playerName: 'Player1',
      };
      prisma.game.findUnique.mockResolvedValue(null);

      await expect(service.joinGame(joinGameDto)).rejects.toThrow(
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

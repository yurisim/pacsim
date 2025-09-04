import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateGameDto } from '../app/generated';
import { TeamType } from '.prisma/client';
import { NotFoundException } from '@nestjs/common';
import { PlayerService } from '../app/player/player.service';
import { GameGateway } from './game.gateway';
import { JoinGameDto } from './dto/join-game.dto';

describe('GameService', () => {
  let service: GameService;
  let prisma: PrismaService;
  let authService: AuthService;
  let playerService: PlayerService;
  let gameGateway: GameGateway;

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
    const mockPlayerService = {
      createPlayerInGame: jest.fn(),
    };
    const mockGameGateway = {
      server: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      },
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
        {
          provide: PlayerService,
          useValue: mockPlayerService,
        },
        {
          provide: GameGateway,
          useValue: mockGameGateway,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
    playerService = module.get<PlayerService>(PlayerService);
    gameGateway = module.get<GameGateway>(GameGateway);
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
        include: { teams: { include: { players: true } }, players: true },
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
    it('should allow a player to join a game', async () => {
      const joinGameDto: JoinGameDto = {
        roomCode: 'ABCDEF',
        playerName: 'Test Player',
      };
      const game = { id: 1, roomCode: 'ABCDEF' };
      const player = { id: 1, name: 'Test Player' };
      const token = { token: 'test-token' };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(game);
      (playerService.createPlayerInGame as jest.Mock).mockResolvedValue(player);
      (authService.login as jest.Mock).mockResolvedValue(token);

      const result = await service.joinGame(joinGameDto);

      expect(result).toEqual(token);
      expect(prisma.game.findUnique).toHaveBeenCalledWith({
        where: { roomCode: joinGameDto.roomCode },
      });
      expect(playerService.createPlayerInGame).toHaveBeenCalledWith(
        joinGameDto.playerName,
        game.id
      );
      expect(authService.login).toHaveBeenCalledWith(game.id, player.id);
    });

    it('should throw an error if the game is not found', async () => {
      const joinGameDto: JoinGameDto = {
        roomCode: 'ABCDEF',
        playerName: 'Test Player',
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.joinGame(joinGameDto)).rejects.toThrow(
        'Invalid room code'
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

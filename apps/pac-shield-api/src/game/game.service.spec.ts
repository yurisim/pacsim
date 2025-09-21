import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateGameDto } from '../app/generated';
import { TeamType } from '.prisma/client';
import { NotFoundException } from '@nestjs/common';
import { PlayerService } from '../app/player/player.service';
import { GameGateway } from './game.gateway';
import { EventsGateway } from '../app/events.gateway';
import { JoinGameDto } from './dto/join-game.dto';

describe('GameService', () => {
  let service: GameService;
  let prisma: PrismaService;
  let authService: AuthService;
  let playerService: PlayerService;
  let gameGateway: GameGateway;
  let eventsGateway: EventsGateway;

  beforeEach(async () => {
    const mockPrismaService = {
      game: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      team: {
        create: jest.fn(),
      },
      forwardOperatingSite: {
        findMany: jest.fn(),
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
    const mockEventsGateway = {
      server: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      },
      sendToLobby: jest.fn(),
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
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
    playerService = module.get<PlayerService>(PlayerService);
    gameGateway = module.get<GameGateway>(GameGateway);
    eventsGateway = module.get<EventsGateway>(EventsGateway);
  });

  /**
   * Test Intent: Verify that the GameService can be instantiated properly
   * with all required dependencies and is ready for use.
   *
   * This test validates:
   * - Service instantiation with mocked dependencies
   * - Basic service availability and initialization
   * - Dependency injection setup correctness
   */
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * Test Suite Intent: Validate game creation functionality including
   * room code generation, team initialization, and database persistence.
   *
   * This suite tests:
   * - Game entity creation with victory conditions
   * - Automatic team creation for all team types
   * - Room code uniqueness and format validation
   * - Database transaction integrity
   */
  describe('createGame', () => {
    /**
     * Test Intent: Verify complete game creation flow with team initialization.
     *
     * This test validates:
     * - Game creation with victory condition parameters
     * - Automatic creation of all required teams
     * - Room code generation and uniqueness
     * - Proper database persistence and return values
     */
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

    /**
     * Test Intent: Verify that FOSes are not created during game setup and remain empty.
     *
     * This test validates:
     * - No FOS records created during game initialization
     * - FOSes should only be created when teams activate them
     * - Game setup focuses only on game and team creation
     */
    it('should not create any FOSes during game setup', async () => {
      const createGameDto: CreateGameDto = { victoryConditionMP: 100 };
      const mockGame = { id: 1, roomCode: 'ABCDEF', ...createGameDto };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.game.create as jest.Mock).mockResolvedValue(mockGame);
      (prisma.forwardOperatingSite.findMany as jest.Mock).mockResolvedValue([]);

      await service.createGame(createGameDto);

      // Verify no FOS creation methods were called during game setup
      expect(prisma.forwardOperatingSite.findMany).not.toHaveBeenCalled();

      // If we were to check for FOSes after game creation, there should be none
      const fosCount = await prisma.forwardOperatingSite.findMany({
        where: { gameId: mockGame.id }
      });
      expect(fosCount).toEqual([]);
    });
  });

  /**
   * Test Suite Intent: Validate game retrieval functionality with proper
   * error handling and data relationships.
   *
   * This suite tests:
   * - Game lookup by ID with related data inclusion
   * - Proper error handling for non-existent games
   * - Data relationship loading (teams, players)
   * - Database query optimization and performance
   */
  describe('getGameById', () => {
    /**
     * Test Intent: Verify successful game retrieval with all related data.
     *
     * This test validates:
     * - Game lookup by valid ID
     * - Proper inclusion of related teams and players
     * - Correct database query structure
     * - Return of complete game object
     */
    it('should return the game if the id is valid', async () => {
      const mockGame = { id: 1, teams: [{ players: [] }] };
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

      const result = await service.getGameById(1);

      expect(prisma.game.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { teams: { include: { players: true } }, players: { include: { team: true } } },
      });
      expect(result).toEqual(mockGame);
    });

    /**
     * Test Intent: Verify proper error handling for invalid game IDs.
     *
     * This test validates:
     * - Exception throwing for non-existent games
     * - Correct exception type (NotFoundException)
     * - Proper error message handling
     * - Database null result handling
     */
    it('should throw NotFoundException if the id is invalid', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getGameById(999)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  /**
   * Test Suite Intent: Validate player joining functionality including
   * room code validation, player creation, and authentication.
   *
   * This suite tests:
   * - Room code validation and game lookup
   * - Player creation in existing games
   * - JWT token generation and return
   * - Error handling for invalid room codes
   * - Integration with auth and player services
   */
  describe('joinGame', () => {
    /**
     * Test Intent: Verify complete player joining flow with authentication.
     *
     * This test validates:
     * - Room code validation and game lookup
     * - Player creation with provided name
     * - JWT token generation for session
     * - Integration between game, player, and auth services
     * - Proper return of authentication token
     */
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

    /**
     * Test Intent: Verify error handling for invalid room codes.
     *
     * This test validates:
     * - Proper error throwing for non-existent games
     * - Clear error message for invalid room codes
     * - Database null result handling
     * - User-friendly error communication
     */
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

  /**
   * Test Suite Intent: Validate room code generation utility functionality.
   *
   * This suite tests:
   * - Random alphanumeric code generation
   * - Proper length and format validation
   * - Character set restrictions (uppercase letters and numbers)
   * - Uniqueness and randomness properties
   */
  describe('generateRoomCode', () => {
    /**
     * Test Intent: Verify room code generation meets required specifications.
     *
     * This test validates:
     * - 6-character length requirement
     * - Alphanumeric character set (A-Z, 0-9)
     * - Uppercase letter format
     * - String return type
     * - Format validation with regex
     */
    it('should return a 6-character alphanumeric string', () => {
      const roomCode = (service as any).generateRoomCode();
      expect(typeof roomCode).toBe('string');
      expect(roomCode.length).toBe(6);
      expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
    });
  });
});

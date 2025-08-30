import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GameService', () => {
  let service: GameService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: PrismaService,
          useValue: {
            game: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            team: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a game with unique roomCode', async () => {
    jest.spyOn(service as any, 'generateRoomCode').mockReturnValueOnce('ABC123');
    (prisma.game.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.game.create as jest.Mock).mockResolvedValueOnce({ id: '1', name: 'Test Game', roomCode: 'ABC123' });
    (prisma.team.create as jest.Mock).mockResolvedValue({});

    const result = await service.createGame('Test Game');

    expect(result).toEqual({ id: '1', name: 'Test Game', roomCode: 'ABC123' });
    expect(prisma.game.create).toHaveBeenCalled();
    expect(prisma.team.create).toHaveBeenCalledTimes(5); // Assuming 5 team types
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';

describe('GameController', () => {
  let controller: GameController;
  let service: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameController],
      providers: [
        {
          provide: GameService,
          useValue: {
            createGame: jest
              .fn()
              .mockResolvedValue({ id: '1', name: 'Test', roomCode: 'ABC123' }),
          },
        },
      ],
    }).compile();

    controller = module.get<GameController>(GameController);
    service = module.get<GameService>(GameService);
  });

  describe('createGame', () => {
    it('should create a new game', async () => {
      const createGameDto: CreateGameDto = {
        name: 'Test',
        victoryConditionMP: 100,
      };
      const result = await controller.createGame(createGameDto);
      expect(result).toEqual({ id: '1', name: 'Test', roomCode: 'ABC123' });
      expect(service.createGame).toHaveBeenCalledWith(createGameDto);
    });
  });
});

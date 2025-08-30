import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

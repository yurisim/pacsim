import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '../prisma.service';

describe('AppController', () => {
  let app: TestingModule;
  let appController: AppController;

  beforeEach(async () => {
    const mockPrismaService = {
      $runCommandRaw: jest.fn().mockResolvedValue({ ok: 1 }),
    };

    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getData', () => {
    it('should return "Hello API"', () => {
      expect(appController.getData()).toEqual({ message: 'Hello API' });
    });
  });

  describe('checkHealth', () => {
    it('should return database connection status', async () => {
      const result = await appController.checkHealth();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
    });
  });
});

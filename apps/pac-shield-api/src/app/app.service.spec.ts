import { Test } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            $runCommandRaw: jest.fn().mockResolvedValue({ ok: 1 }),
          },
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  describe('getData', () => {
    it('should return "Hello API"', () => {
      expect(service.getData()).toEqual({ message: 'Hello API' });
    });
  });

  describe('checkDbConnection', () => {
    it('should return a success message if the database connection is healthy', async () => {
      const result = await service.checkDbConnection();
      expect(result).toEqual({
        status: 'ok',
        message: 'Database connection is healthy',
      });
    });

    it('should return an error message if the database connection fails', async () => {
      (service['prisma'].$runCommandRaw as jest.Mock).mockRejectedValueOnce(
        new Error('Database connection failed'),
      );
      const result = await service.checkDbConnection();
      expect(result).toEqual({
        status: 'error',
        message: 'Database connection failed',
      });
    });
  });
});

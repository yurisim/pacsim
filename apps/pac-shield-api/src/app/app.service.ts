import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  async checkDbConnection(): Promise<{ status: string; message: string }> {
    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
      return { status: 'ok', message: 'Database connection is healthy' };
    } catch (error) {
      return { status: 'error', message: 'Database connection failed' };
    }
  }
}

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
      // Perform a simple query to check PostgreSQL connection
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', message: 'Database connection is healthy' };
    } catch (error) {
      return { status: 'error', message: 'Database connection failed' };
    }
  }
}

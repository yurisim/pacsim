import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Main application service providing basic application functionality and health checks.
 * Handles core application metadata and database connectivity monitoring.
 */
@Injectable()
export class AppService {
  /**
   * Creates an instance of AppService.
   * @param prisma - Prisma service for database connectivity checks
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves basic application metadata and welcome message.
   * Used for API status verification and basic endpoint testing.
   * @returns Object containing application welcome message
   * @example
   * // Returns: { message: 'Hello API' }
   */
  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  /**
   * Performs a health check on the database connection.
   * Executes a simple query to verify PostgreSQL connectivity and responsiveness.
   * Used by monitoring systems and load balancers for health verification.
   * @returns Promise resolving to health status and descriptive message
   * @example
   * // On success: { status: 'ok', message: 'Database connection is healthy' }
   * // On failure: { status: 'error', message: 'Database connection failed' }
   */
  async checkDbConnection(): Promise<{ status: string; message: string }> {
    try {
      // Perform a simple query to check PostgreSQL connection
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', message: 'Database connection is healthy' };
    } catch {
      return { status: 'error', message: 'Database connection failed' };
    }
  }
}

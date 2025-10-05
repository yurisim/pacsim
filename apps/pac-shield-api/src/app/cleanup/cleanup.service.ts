import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

export interface InactiveGameInfo {
  id: number;
  roomCode: string;
  createdAt: Date;
  updatedAt: Date;
  turn: number;
  playerCount: number;
  teamCount: number;
}

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  private readonly INACTIVITY_THRESHOLD_HOURS = 96;

  constructor(private prisma: PrismaService) {}

  /**
   * Get list of inactive games (no modifications for 96 hours)
   * @returns List of inactive game information
   */
  async getInactiveGames(): Promise<InactiveGameInfo[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - this.INACTIVITY_THRESHOLD_HOURS);

    const inactiveGames = await this.prisma.game.findMany({
      where: {
        updatedAt: {
          lt: cutoffDate,
        },
      },
      include: {
        _count: {
          select: {
            players: true,
            teams: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });

    return inactiveGames.map((game) => ({
      id: game.id,
      roomCode: game.roomCode,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      turn: game.turn,
      playerCount: game._count.players,
      teamCount: game._count.teams,
    }));
  }

  /**
   * Delete a specific game by ID (with all related data via cascade)
   * @param gameId - ID of the game to delete
   */
  async deleteGame(gameId: number): Promise<void> {
    this.logger.log(`Deleting game ${gameId}...`);

    await this.prisma.game.delete({
      where: { id: gameId },
    });

    this.logger.log(`Game ${gameId} deleted successfully (cascade delete applied)`);
  }

  /**
   * Delete all inactive games (no modifications for 96 hours)
   * @returns Number of games deleted
   */
  async deleteInactiveGames(): Promise<number> {
    const inactiveGames = await this.getInactiveGames();

    if (inactiveGames.length === 0) {
      this.logger.log('No inactive games found');
      return 0;
    }

    this.logger.log(`Found ${inactiveGames.length} inactive games to delete`);

    for (const game of inactiveGames) {
      const hoursSinceUpdate = Math.floor(
        (Date.now() - game.updatedAt.getTime()) / (1000 * 60 * 60)
      );

      this.logger.log(
        `Deleting game ${game.id} (roomCode: ${game.roomCode}, last updated ${hoursSinceUpdate}h ago)`
      );

      await this.deleteGame(game.id);
    }

    // Run VACUUM ANALYZE to reclaim disk space and update statistics
    this.logger.log('Running VACUUM ANALYZE to reclaim disk space...');
    try {
      await this.prisma.$executeRawUnsafe('VACUUM ANALYZE;');
      this.logger.log('VACUUM ANALYZE completed successfully');
    } catch (error) {
      this.logger.warn('VACUUM ANALYZE failed (may require superuser privileges)', error);
    }

    this.logger.log(`Cleanup completed: ${inactiveGames.length} games deleted`);
    return inactiveGames.length;
  }

  /**
   * Scheduled cleanup job - runs daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleScheduledCleanup(): Promise<void> {
    this.logger.log('Starting scheduled cleanup job (daily at 3 AM)');
    const deletedCount = await this.deleteInactiveGames();
    this.logger.log(`Scheduled cleanup completed: ${deletedCount} games deleted`);
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    totalGames: number;
    inactiveGames: number;
    activeGames: number;
    oldestActiveGame: Date | null;
  }> {
    const [totalGames, inactiveGames] = await Promise.all([
      this.prisma.game.count(),
      this.getInactiveGames(),
    ]);

    const activeGames = totalGames - inactiveGames.length;

    // Get oldest active game
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - this.INACTIVITY_THRESHOLD_HOURS);

    const oldestActive = await this.prisma.game.findFirst({
      where: {
        updatedAt: {
          gte: cutoffDate,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
      select: {
        updatedAt: true,
      },
    });

    return {
      totalGames,
      inactiveGames: inactiveGames.length,
      activeGames,
      oldestActiveGame: oldestActive?.updatedAt ?? null,
    };
  }
}

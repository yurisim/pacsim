import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CleanupService, InactiveGameInfo } from './cleanup.service';
import { GameMasterGuard } from '../auth/game-master.guard';

@ApiTags('cleanup')
@Controller('cleanup')
export class CleanupController {
  constructor(private cleanupService: CleanupService) {}

  /**
   * Preview which games would be deleted (GM only)
   */
  @Get('inactive-games/preview')
  @UseGuards(GameMasterGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Preview inactive games that would be deleted',
    description:
      'Returns a list of games that have had no modifications for 96 hours and would be deleted by cleanup. GM only.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of inactive games',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 42 },
          roomCode: { type: 'string', example: 'ABC123' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          turn: { type: 'number', example: 5 },
          playerCount: { type: 'number', example: 12 },
          teamCount: { type: 'number', example: 4 },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - GM role required' })
  async previewInactiveGames(): Promise<InactiveGameInfo[]> {
    return this.cleanupService.getInactiveGames();
  }

  /**
   * Manually trigger cleanup of inactive games (GM only)
   */
  @Post('inactive-games')
  @UseGuards(GameMasterGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete all inactive games',
    description:
      'Deletes all games that have had no modifications for 96 hours. This includes all related data (cascade delete). GM only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed successfully',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number', example: 5 },
        message: { type: 'string', example: 'Successfully deleted 5 inactive games' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - GM role required' })
  async deleteInactiveGames(): Promise<{ deletedCount: number; message: string }> {
    const deletedCount = await this.cleanupService.deleteInactiveGames();
    return {
      deletedCount,
      message: `Successfully deleted ${deletedCount} inactive games`,
    };
  }

  /**
   * Get cleanup statistics (GM only)
   */
  @Get('stats')
  @UseGuards(GameMasterGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get cleanup statistics',
    description:
      'Returns statistics about active and inactive games. GM only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup statistics',
    schema: {
      type: 'object',
      properties: {
        totalGames: { type: 'number', example: 20 },
        inactiveGames: { type: 'number', example: 5 },
        activeGames: { type: 'number', example: 15 },
        oldestActiveGame: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - GM role required' })
  async getCleanupStats(): Promise<{
    totalGames: number;
    inactiveGames: number;
    activeGames: number;
    oldestActiveGame: Date | null;
  }> {
    return this.cleanupService.getCleanupStats();
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationRequestDto } from './dto/create-notification-request.dto';
import { UpdateNotificationDto } from '../generated/notification/update-notification.dto';
import { Notification } from '@prisma/client';

/**
 * Controller for managing game notifications via REST API
 */
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get all notifications for a game
   * Query params:
   * - teamId: Filter by target team
   * - unreadOnly: Only return unread notifications
   * - requiresAckOnly: Only return notifications requiring acknowledgment
   * - limit: Max number of notifications to return
   */
  @Get('game/:gameId')
  async getGameNotifications(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Query('teamId') teamId?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('requiresAckOnly') requiresAckOnly?: string,
    @Query('limit') limit?: string
  ): Promise<Notification[]> {
    return this.notificationService.getGameNotifications(gameId, {
      teamId: teamId ? parseInt(teamId) : undefined,
      unreadOnly: unreadOnly === 'true',
      requiresAckOnly: requiresAckOnly === 'true',
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * Get a single notification by ID
   */
  @Get(':id')
  async getNotification(@Param('id') id: string): Promise<Notification | null> {
    return this.notificationService.getNotificationById(id);
  }

  /**
   * Create a new notification
   */
  @Post()
  async createNotification(@Body() data: CreateNotificationRequestDto): Promise<Notification> {
    return this.notificationService.createNotification(data);
  }

  /**
   * Mark a notification as read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.markAsRead(id);
  }

  /**
   * Mark all notifications as read for a game
   */
  @Patch('game/:gameId/read-all')
  async markAllAsRead(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Query('teamId') teamId?: string
  ): Promise<{ count: number }> {
    const count = await this.notificationService.markAllAsRead(
      gameId,
      teamId ? parseInt(teamId) : undefined
    );
    return { count };
  }

  /**
   * Acknowledge a notification
   */
  @Patch(':id/acknowledge')
  async acknowledge(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.acknowledge(id);
  }

  /**
   * Update a notification
   */
  @Patch(':id')
  async updateNotification(
    @Param('id') id: string,
    @Body() data: UpdateNotificationDto
  ): Promise<Notification> {
    return this.notificationService.updateNotification(id, data);
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  async deleteNotification(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.deleteNotification(id);
  }

  /**
   * Delete all notifications for a game
   */
  @Delete('game/:gameId')
  async deleteGameNotifications(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Query('teamId') teamId?: string
  ): Promise<{ count: number }> {
    const count = await this.notificationService.deleteGameNotifications(
      gameId,
      teamId ? parseInt(teamId) : undefined
    );
    return { count };
  }
}

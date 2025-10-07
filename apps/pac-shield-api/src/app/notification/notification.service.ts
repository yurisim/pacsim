import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GameGateway } from '../../game/game.gateway';
import { Notification, NotificationType, NotificationPriority } from '@prisma/client';
import { CreateNotificationDto } from '../generated/notification/create-notification.dto';
import { UpdateNotificationDto } from '../generated/notification/update-notification.dto';

/**
 * Unified notification service for creating, delivering, and managing all game notifications.
 * Replaces the old allocation-specific notification service with a generic, extensible system.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gameGateway: GameGateway
  ) {}

  // =============================================
  //            NOTIFICATION CREATION
  // =============================================

  /**
   * Create and deliver a notification
   */
  async createNotification(data: CreateNotificationDto & { gameId: number; targetTeamId?: number | null }): Promise<Notification> {
    // Extract relation IDs from data
    const { gameId, targetTeamId, ...notificationData } = data;

    // Create notification in database
    const notification = await this.prisma.notification.create({
      data: {
        ...notificationData,
        timestamp: new Date(),
        game: {
          connect: { id: gameId }
        },
        ...(targetTeamId && {
          targetTeam: {
            connect: { id: targetTeamId }
          }
        }),
      },
      include: {
        game: true,
        targetTeam: true,
      },
    });

    // Deliver via WebSocket
    await this.deliverNotification(notification);

    return notification;
  }

  /**
   * Create and deliver a notification with simplified interface
   */
  async notify(params: {
    gameId: number;
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    targetTeamId?: number;
    actionUrl?: string;
    requiresAcknowledgment?: boolean;
    data?: any;
  }): Promise<Notification> {
    return this.createNotification({
      gameId: params.gameId,
      type: params.type,
      title: params.title,
      message: params.message,
      priority: params.priority || NotificationPriority.NORMAL,
      targetTeamId: params.targetTeamId,
      actionUrl: params.actionUrl,
      requiresAcknowledgment: params.requiresAcknowledgment || false,
      data: params.data,
    });
  }

  // =============================================
  //            NOTIFICATION QUERIES
  // =============================================

  /**
   * Get all notifications for a game
   */
  async getGameNotifications(
    gameId: number,
    options?: {
      teamId?: number;
      unreadOnly?: boolean;
      requiresAckOnly?: boolean;
      limit?: number;
    }
  ): Promise<Notification[]> {
    const where: any = {
      gameId,
    };

    if (options?.teamId) {
      where.OR = [
        { targetTeamId: options.teamId },
        { targetTeamId: null }, // Include notifications for all teams
      ];
    }

    if (options?.unreadOnly) {
      where.read = false;
    }

    if (options?.requiresAckOnly) {
      where.requiresAcknowledgment = true;
      where.acknowledged = false;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options?.limit,
      include: {
        targetTeam: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  /**
   * Get a single notification by ID
   */
  async getNotificationById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id },
      include: {
        game: true,
        targetTeam: true,
      },
    });
  }

  // =============================================
  //            NOTIFICATION UPDATES
  // =============================================

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a game/team
   */
  async markAllAsRead(gameId: number, teamId?: number): Promise<number> {
    const where: any = { gameId };

    if (teamId) {
      where.OR = [
        { targetTeamId: teamId },
        { targetTeamId: null },
      ];
    }

    const result = await this.prisma.notification.updateMany({
      where,
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Acknowledge a notification
   */
  async acknowledge(id: string): Promise<Notification> {
    const notification = await this.prisma.notification.update({
      where: { id },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
      },
    });

    // Broadcast acknowledgment
    this.gameGateway.server.to(notification.gameId.toString()).emit('notificationAcknowledged', {
      type: 'notificationAcknowledged',
      payload: {
        notificationId: id,
        acknowledgedAt: notification.acknowledgedAt,
      },
      timestamp: new Date().toISOString(),
    });

    return notification;
  }

  /**
   * Update notification
   */
  async updateNotification(id: string, data: UpdateNotificationDto): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<Notification> {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Delete all notifications for a game
   */
  async deleteGameNotifications(gameId: number, teamId?: number): Promise<number> {
    const where: any = { gameId };

    if (teamId) {
      where.targetTeamId = teamId;
    }

    const result = await this.prisma.notification.deleteMany({
      where,
    });

    return result.count;
  }

  // =============================================
  //            NOTIFICATION DELIVERY
  // =============================================

  /**
   * Deliver notification via WebSocket
   */
  private async deliverNotification(notification: Notification & { targetTeam?: any }): Promise<void> {
    try {
      const payload = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        timestamp: notification.timestamp.toISOString(),
        gameId: notification.gameId,
        targetTeamId: notification.targetTeamId,
        targetTeamName: notification.targetTeam?.name,
        actionUrl: notification.actionUrl,
        requiresAcknowledgment: notification.requiresAcknowledgment,
        acknowledged: notification.acknowledged,
        acknowledgedAt: notification.acknowledgedAt?.toISOString(),
        read: notification.read,
        readAt: notification.readAt?.toISOString(),
        data: notification.data,
      };

      // Broadcast to game room (everyone in the game)
      this.gameGateway.server.to(notification.gameId.toString()).emit('notification', {
        type: 'notification',
        payload,
        timestamp: new Date().toISOString(),
      });

      // If targeted to specific team, also send to team room
      if (notification.targetTeamId) {
        const teamRoomId = `${notification.gameId}-team-${notification.targetTeamId}`;
        this.gameGateway.server.to(teamRoomId).emit('notification', {
          type: 'notification',
          payload,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.log(
        `Notification delivered: ${notification.type} - ${notification.title} (Game: ${notification.gameId}${notification.targetTeamId ? `, Team: ${notification.targetTeamId}` : ''})`
      );
    } catch (error) {
      this.logger.error(`Failed to deliver notification: ${error.message}`, error.stack);
    }
  }
}

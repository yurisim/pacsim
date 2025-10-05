import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GameGateway } from '../../game/game.gateway';
import {
  AircraftRequest,
  AircraftAllocation,
  AllocationCycle,
  AircraftInstance,
  TeamType
} from '@prisma/client';

export enum AllocationNotificationType {
  REQUEST_SUBMITTED = 'REQUEST_SUBMITTED',
  REQUEST_REVIEWED = 'REQUEST_REVIEWED',
  AIRCRAFT_ALLOCATED = 'AIRCRAFT_ALLOCATED',
  AIRCRAFT_DEALLOCATED = 'AIRCRAFT_DEALLOCATED',
  ALLOCATION_CYCLE_STATUS_CHANGED = 'ALLOCATION_CYCLE_STATUS_CHANGED',
  AIRCRAFT_POOL_UPDATED = 'AIRCRAFT_POOL_UPDATED'
}

export interface AllocationNotificationPayload {
  type: AllocationNotificationType;
  title: string;
  message: string;
  data: any;
  targetTeamIds?: number[];
  targetTeamTypes?: TeamType[];
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  timestamp: string;
  gameId: number;
  requiresAcknowledgment?: boolean;
}

/**
 * Service for managing allocation-related notifications and WebSocket communication.
 * Handles notification creation, delivery, and audit trail for CFACC-MOB coordination.
 */
@Injectable()
export class AllocationNotificationService {
  private readonly logger = new Logger(AllocationNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gameGateway: GameGateway
  ) {}

  // =============================================
  //            NOTIFICATION CREATION
  // =============================================

  /**
   * Notify when a MOB submits an aircraft request
   */
  async notifyRequestSubmitted(request: AircraftRequest & { team: any; allocationCycle: any }): Promise<void> {
    const notification: AllocationNotificationPayload = {
      type: AllocationNotificationType.REQUEST_SUBMITTED,
      title: 'New Aircraft Request',
      message: `${request.team.name} has submitted a request for ${request.quantityRequested} ${request.aircraftType} aircraft`,
      data: {
        request,
        requestId: request.id,
        teamName: request.team.name,
        aircraftType: request.aircraftType,
        quantityRequested: request.quantityRequested,
        priority: request.priority
      },
      targetTeamTypes: [TeamType.CAOC], // Notify CFACC
      priority: this.mapRequestPriorityToNotificationPriority(request.priority),
      timestamp: new Date().toISOString(),
      gameId: request.allocationCycle.gameId,
      requiresAcknowledgment: false
    };

    await this.deliverNotification(notification);
  }

  /**
   * Notify when CFACC reviews a request (approve/deny/modify)
   */
  async notifyRequestReviewed(request: AircraftRequest & { team: any; allocationCycle: any }): Promise<void> {
    const statusMessages: Record<string, string> = {
      APPROVED: 'approved',
      DENIED: 'denied',
      MODIFIED: 'modified'
    };

    const statusMessage = statusMessages[request.status] || 'reviewed';
    const notification: AllocationNotificationPayload = {
      type: AllocationNotificationType.REQUEST_REVIEWED,
      title: `Request ${statusMessage}`,
      message: `Your request for ${request.quantityRequested} ${request.aircraftType} aircraft has been ${statusMessage}${request.quantityAllocated ? ` (${request.quantityAllocated} allocated)` : ''}`,
      data: {
        request,
        requestId: request.id,
        status: request.status,
        quantityAllocated: request.quantityAllocated,
        cfaccNotes: request.cfaccNotes
      },
      targetTeamIds: [request.teamId], // Notify requesting team
      priority: request.status === 'DENIED' ? 'HIGH' : 'NORMAL',
      timestamp: new Date().toISOString(),
      gameId: request.allocationCycle.gameId,
      requiresAcknowledgment: true
    };

    await this.deliverNotification(notification);
  }

  /**
   * Notify when aircraft is allocated to a team
   */
  async notifyAircraftAllocated(allocation: AircraftAllocation & {
    aircraftInstance: AircraftInstance;
    allocatedToTeam: any;
    allocationCycle: any;
    aircraftRequest?: any;
  }): Promise<void> {
    const notification: AllocationNotificationPayload = {
      type: AllocationNotificationType.AIRCRAFT_ALLOCATED,
      title: 'Aircraft Allocated',
      message: `${allocation.aircraftInstance.callSign} (${allocation.aircraftInstance.type}) has been allocated to your team`,
      data: {
        allocation,
        aircraftCallSign: allocation.aircraftInstance.callSign,
        aircraftType: allocation.aircraftInstance.type,
        teamName: allocation.allocatedToTeam.name,
        requestId: allocation.aircraftRequestId
      },
      targetTeamIds: [allocation.allocatedToTeamId], // Notify allocated team
      priority: 'HIGH',
      timestamp: new Date().toISOString(),
      gameId: allocation.allocationCycle.gameId,
      requiresAcknowledgment: true
    };

    await this.deliverNotification(notification);

    // Also notify CFACC about successful allocation
    await this.notifyAllocationDecisionMade(allocation, 'allocated');
  }

  /**
   * Notify when aircraft allocation is removed (returned to pool)
   */
  async notifyAircraftDeallocated(
    gameId: number,
    allocationId: number,
    aircraftCallSign: string,
    teamId: number,
    teamName: string
  ): Promise<void> {
    const notification: AllocationNotificationPayload = {
      type: AllocationNotificationType.AIRCRAFT_DEALLOCATED,
      title: 'Aircraft Returned to Pool',
      message: `${aircraftCallSign} has been returned to the unallocated pool`,
      data: {
        allocationId,
        aircraftCallSign,
        teamName
      },
      targetTeamIds: [teamId], // Notify affected team
      priority: 'NORMAL',
      timestamp: new Date().toISOString(),
      gameId,
      requiresAcknowledgment: false
    };

    await this.deliverNotification(notification);
  }

  /**
   * Notify when allocation cycle status changes
   */
  async notifyAllocationCycleStatusChanged(cycle: AllocationCycle): Promise<void> {
    const statusMessages: Record<string, string> = {
      PENDING: 'Allocation cycle is pending',
      REQUESTS_OPEN: 'Aircraft requests are now open for submission',
      ANALYSIS: 'CFACC is analyzing submitted requests',
      ALLOCATED: 'Aircraft allocation is in progress',
      CLOSED: 'Aircraft allocation cycle is complete'
    };

    const statusMessage = statusMessages[cycle.status] || `Allocation cycle status changed to ${cycle.status}`;
    const notification: AllocationNotificationPayload = {
      type: AllocationNotificationType.ALLOCATION_CYCLE_STATUS_CHANGED,
      title: `Allocation Cycle: ${cycle.status}`,
      message: statusMessage,
      data: {
        cycle,
        status: cycle.status,
        turn: cycle.turn
      },
      targetTeamTypes: [TeamType.MOB_KADENA, TeamType.MOB_ANDERSEN, TeamType.MOB_YOKOTA, TeamType.MOB_OSAN, TeamType.MOB_JBPHH, TeamType.CAOC], // Notify all teams
      priority: 'NORMAL',
      timestamp: new Date().toISOString(),
      gameId: cycle.gameId,
      requiresAcknowledgment: false
    };

    await this.deliverNotification(notification);
  }

  /**
   * Notify when aircraft pool is updated
   */
  async notifyAircraftPoolUpdated(gameId: number, poolStats: any): Promise<void> {
    const notification: AllocationNotificationPayload = {
      type: AllocationNotificationType.AIRCRAFT_POOL_UPDATED,
      title: 'Aircraft Pool Updated',
      message: 'The aircraft pool has been refreshed for the new turn',
      data: {
        poolStats,
        updatedAt: new Date().toISOString()
      },
      targetTeamTypes: [TeamType.MOB_KADENA, TeamType.MOB_ANDERSEN, TeamType.MOB_YOKOTA, TeamType.MOB_OSAN, TeamType.MOB_JBPHH, TeamType.CAOC], // Notify all teams
      priority: 'LOW',
      timestamp: new Date().toISOString(),
      gameId,
      requiresAcknowledgment: false
    };

    await this.deliverNotification(notification);
  }

  // =============================================
  //            NOTIFICATION DELIVERY
  // =============================================

  /**
   * Deliver notification via WebSocket and persist to database
   */
  private async deliverNotification(notification: AllocationNotificationPayload): Promise<void> {
    try {
      // Determine target teams
      const targetTeams = await this.resolveTargetTeams(notification);

      // Broadcast to each target team room
      for (const team of targetTeams) {
        const teamRoomId = `${notification.gameId}-team-${team.id}`;

        this.gameGateway.server.to(teamRoomId).emit('allocationNotification', {
          type: 'allocationNotification',
          payload: {
            ...notification,
            targetTeamId: team.id,
            targetTeamName: team.name
          },
          timestamp: notification.timestamp
        });

        this.logger.log(
          `Allocation notification sent to team ${team.name} (${team.id}): ${notification.type}`
        );
      }

      // Also broadcast to game room for general updates
      this.gameGateway.server.to(notification.gameId.toString()).emit('allocationNotification', {
        type: 'allocationNotification',
        payload: notification,
        timestamp: notification.timestamp
      });

      // Persist notification for audit trail
      await this.persistNotification(notification, targetTeams);

    } catch (error) {
      this.logger.error(`Failed to deliver allocation notification: ${error.message}`, error.stack);
    }
  }

  /**
   * Resolve target teams based on notification criteria
   */
  private async resolveTargetTeams(notification: AllocationNotificationPayload): Promise<any[]> {
    const whereClause: any = {
      gameId: notification.gameId
    };

    // Add specific team IDs if provided
    if (notification.targetTeamIds?.length) {
      whereClause.id = {
        in: notification.targetTeamIds
      };
    }

    // Add team types if provided
    if (notification.targetTeamTypes?.length) {
      whereClause.type = {
        in: notification.targetTeamTypes
      };
    }

    return this.prisma.team.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        type: true
      }
    });
  }

  /**
   * Persist notification to database for audit trail
   */
  private async persistNotification(
    notification: AllocationNotificationPayload,
    targetTeams: any[]
  ): Promise<void> {
    try {
      // Create notification record (you may need to create this table in Prisma schema)
      // For now, we'll log to database as a simple audit trail
      // In a full implementation, you'd have a dedicated notifications table

      const auditData = {
        type: 'ALLOCATION_NOTIFICATION',
        action: notification.type,
        details: {
          notification,
          targetTeams: targetTeams.map(t => ({ id: t.id, name: t.name, type: t.type })),
          deliveredAt: new Date().toISOString()
        },
        timestamp: new Date(notification.timestamp)
      };

      this.logger.log(`Notification audit: ${JSON.stringify(auditData)}`);

      // TODO: Implement proper notification persistence when notification table is available
      // await this.prisma.notification.create({ data: auditData });

    } catch (error) {
      this.logger.error(`Failed to persist notification: ${error.message}`);
    }
  }

  // =============================================
  //            HELPER METHODS
  // =============================================

  /**
   * Map request priority to notification priority
   */
  private mapRequestPriorityToNotificationPriority(requestPriority: number): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
    if (requestPriority === 1) return 'URGENT';
    if (requestPriority === 2) return 'HIGH';
    if (requestPriority === 3) return 'NORMAL';
    return 'LOW';
  }

  /**
   * Notify CFACC about allocation decision made
   */
  private async notifyAllocationDecisionMade(
    allocation: AircraftAllocation & { aircraftInstance: AircraftInstance; allocatedToTeam: any; allocationCycle: any },
    action: 'allocated' | 'deallocated'
  ): Promise<void> {
    const notification: AllocationNotificationPayload = {
      type: AllocationNotificationType.AIRCRAFT_ALLOCATED,
      title: `Allocation ${action}`,
      message: `${allocation.aircraftInstance.callSign} has been ${action} ${action === 'allocated' ? 'to' : 'from'} ${allocation.allocatedToTeam.name}`,
      data: {
        allocation,
        action,
        aircraftCallSign: allocation.aircraftInstance.callSign,
        teamName: allocation.allocatedToTeam.name
      },
      targetTeamTypes: [TeamType.CAOC], // Notify CFACC
      priority: 'LOW',
      timestamp: new Date().toISOString(),
      gameId: allocation.allocationCycle.gameId,
      requiresAcknowledgment: false
    };

    await this.deliverNotification(notification);
  }

  // =============================================
  //            TEAM-SPECIFIC ROOM MANAGEMENT
  // =============================================

  /**
   * Join client to team-specific room for targeted notifications
   */
  async joinTeamRoom(clientId: string, gameId: number, teamId: number): Promise<void> {
    const roomId = `${gameId}-team-${teamId}`;
    // This would be called from GameGateway when clients connect
    this.logger.log(`Client ${clientId} joining team room ${roomId}`);
  }

  /**
   * Leave team-specific room
   */
  async leaveTeamRoom(clientId: string, gameId: number, teamId: number): Promise<void> {
    const roomId = `${gameId}-team-${teamId}`;
    this.logger.log(`Client ${clientId} leaving team room ${roomId}`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  AircraftRequest,
  AircraftAllocation,
  AllocationCycle,
  AircraftInstance,
  TeamType,
  NotificationType,
  NotificationPriority
} from '@prisma/client';

/**
 * Allocation notification subtypes (stored in notification.data.notificationType)
 */
export enum AllocationNotificationType {
  REQUEST_SUBMITTED = 'REQUEST_SUBMITTED',
  REQUEST_REVIEWED = 'REQUEST_REVIEWED',
  AIRCRAFT_ALLOCATED = 'AIRCRAFT_ALLOCATED',
  AIRCRAFT_DEALLOCATED = 'AIRCRAFT_DEALLOCATED',
  ALLOCATION_CYCLE_STATUS_CHANGED = 'ALLOCATION_CYCLE_STATUS_CHANGED',
  AIRCRAFT_POOL_UPDATED = 'AIRCRAFT_POOL_UPDATED'
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
    private readonly notificationService: NotificationService
  ) {}

  // =============================================
  //            NOTIFICATION CREATION
  // =============================================

  /**
   * Notify when a MOB submits an aircraft request
   */
  async notifyRequestSubmitted(request: AircraftRequest & { team: any; allocationCycle: any }): Promise<void> {
    // Get CAOC team(s)
    const caocTeams = await this.prisma.team.findMany({
      where: {
        gameId: request.allocationCycle.gameId,
        type: TeamType.CAOC
      }
    });

    // Create notification for each CAOC team
    for (const caocTeam of caocTeams) {
      await this.notificationService.notify({
        gameId: request.allocationCycle.gameId,
        type: NotificationType.ALLOCATION,
        title: 'New Aircraft Request',
        message: `${request.team.name} has submitted a request for ${request.quantityRequested} ${request.aircraftType} aircraft`,
        priority: this.mapRequestPriorityToNotificationPriority(request.priority),
        targetTeamId: caocTeam.id,
        requiresAcknowledgment: false,
        data: {
          notificationType: AllocationNotificationType.REQUEST_SUBMITTED,
          requestId: request.id,
          teamName: request.team.name,
          aircraftType: request.aircraftType,
          quantityRequested: request.quantityRequested,
          priority: request.priority
        }
      });
    }
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

    await this.notificationService.notify({
      gameId: request.allocationCycle.gameId,
      type: NotificationType.ALLOCATION,
      title: `Request ${statusMessage}`,
      message: `Your request for ${request.quantityRequested} ${request.aircraftType} aircraft has been ${statusMessage}${request.quantityAllocated ? ` (${request.quantityAllocated} allocated)` : ''}`,
      priority: request.status === 'DENIED' ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
      targetTeamId: request.teamId,
      requiresAcknowledgment: true,
      data: {
        notificationType: AllocationNotificationType.REQUEST_REVIEWED,
        requestId: request.id,
        status: request.status,
        quantityAllocated: request.quantityAllocated,
        cfaccNotes: request.cfaccNotes
      }
    });
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
    // Notify the team receiving the aircraft
    await this.notificationService.notify({
      gameId: allocation.allocationCycle.gameId,
      type: NotificationType.ALLOCATION,
      title: 'Aircraft Allocated',
      message: `${allocation.aircraftInstance.callSign} (${allocation.aircraftInstance.type}) has been allocated to your team`,
      priority: NotificationPriority.HIGH,
      targetTeamId: allocation.allocatedToTeamId,
      requiresAcknowledgment: true,
      data: {
        notificationType: AllocationNotificationType.AIRCRAFT_ALLOCATED,
        allocationId: allocation.id,
        aircraftCallSign: allocation.aircraftInstance.callSign,
        aircraftType: allocation.aircraftInstance.type,
        teamName: allocation.allocatedToTeam.name,
        requestId: allocation.aircraftRequestId
      }
    });

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
    await this.notificationService.notify({
      gameId,
      type: NotificationType.ALLOCATION,
      title: 'Aircraft Returned to Pool',
      message: `${aircraftCallSign} has been returned to the unallocated pool`,
      priority: NotificationPriority.NORMAL,
      targetTeamId: teamId,
      requiresAcknowledgment: false,
      data: {
        notificationType: AllocationNotificationType.AIRCRAFT_DEALLOCATED,
        allocationId,
        aircraftCallSign,
        teamName
      }
    });
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

    // Notify all teams (broadcast without specific team targeting)
    await this.notificationService.notify({
      gameId: cycle.gameId,
      type: NotificationType.ALLOCATION,
      title: `Allocation Cycle: ${cycle.status}`,
      message: statusMessage,
      priority: NotificationPriority.NORMAL,
      requiresAcknowledgment: false,
      data: {
        notificationType: AllocationNotificationType.ALLOCATION_CYCLE_STATUS_CHANGED,
        cycleId: cycle.id,
        status: cycle.status,
        turn: cycle.turn
      }
    });
  }

  /**
   * Notify when aircraft pool is updated
   */
  async notifyAircraftPoolUpdated(gameId: number, poolStats: any): Promise<void> {
    await this.notificationService.notify({
      gameId,
      type: NotificationType.ALLOCATION,
      title: 'Aircraft Pool Updated',
      message: 'The aircraft pool has been refreshed for the new turn',
      priority: NotificationPriority.LOW,
      requiresAcknowledgment: false,
      data: {
        notificationType: AllocationNotificationType.AIRCRAFT_POOL_UPDATED,
        poolStats,
        updatedAt: new Date().toISOString()
      }
    });
  }

  // =============================================
  //            LEGACY METHODS (Removed)
  // =============================================
  // Delivery, persistence, and team resolution now handled by NotificationService

  // =============================================
  //            HELPER METHODS
  // =============================================

  /**
   * Map request priority to notification priority
   */
  private mapRequestPriorityToNotificationPriority(requestPriority: number): NotificationPriority {
    if (requestPriority === 1) return NotificationPriority.URGENT;
    if (requestPriority === 2) return NotificationPriority.HIGH;
    if (requestPriority === 3) return NotificationPriority.NORMAL;
    return NotificationPriority.LOW;
  }

  /**
   * Notify CFACC about allocation decision made
   */
  private async notifyAllocationDecisionMade(
    allocation: AircraftAllocation & { aircraftInstance: AircraftInstance; allocatedToTeam: any; allocationCycle: any },
    action: 'allocated' | 'deallocated'
  ): Promise<void> {
    // Get CAOC team(s)
    const caocTeams = await this.prisma.team.findMany({
      where: {
        gameId: allocation.allocationCycle.gameId,
        type: TeamType.CAOC
      }
    });

    // Notify each CAOC team
    for (const caocTeam of caocTeams) {
      await this.notificationService.notify({
        gameId: allocation.allocationCycle.gameId,
        type: NotificationType.ALLOCATION,
        title: `Allocation ${action}`,
        message: `${allocation.aircraftInstance.callSign} has been ${action} ${action === 'allocated' ? 'to' : 'from'} ${allocation.allocatedToTeam.name}`,
        priority: NotificationPriority.LOW,
        targetTeamId: caocTeam.id,
        requiresAcknowledgment: false,
        data: {
          notificationType: AllocationNotificationType.AIRCRAFT_ALLOCATED,
          allocationId: allocation.id,
          action,
          aircraftCallSign: allocation.aircraftInstance.callSign,
          teamName: allocation.allocatedToTeam.name
        }
      });
    }
  }
}

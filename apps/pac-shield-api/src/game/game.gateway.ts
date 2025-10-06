import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ATOLine } from '../app/generated/aTOLine/aTOLine.entity';
import { AircraftRequest, AircraftAllocation, AllocationCycle } from '@prisma/client';

/**
 * WebSocket gateway for real-time, game-scoped events (namespace: /game).
 * - On connection, joins clients to a room based on ?gameId=...
 * - Broadcasts typed events to all socket clients in that room.
 */
@WebSocketGateway({ namespace: '/game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('GameGateway');

  /**
   * On socket connect:
   * - Reads ?gameId from the client handshake query
   * - Joins a Socket.IO room using that gameId for event isolation
   * - Logs the connection for diagnostics
   */
  handleConnection(client: Socket) {
    client.setMaxListeners(15); // Increase from default 10 to prevent warnings
    const { gameId } = client.handshake.query;
    if (gameId) {
      client.join(gameId);
      this.logger.log(`Client ${client.id} joined room ${gameId}`);
    }
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * On socket disconnect: log the event for observability.
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Relay 'playerJoined' events to everyone in the client's current room.
   * Frontend uses this to refresh lobby rosters in real-time.
   */
  @SubscribeMessage('playerJoined')
  handlePlayerJoined(client: Socket, payload: { playerName: string }): void {
    const room = client.rooms.values().next().value;
    this.server.to(room).emit('playerJoined', payload);
  }

  /**
   * Placeholder game action handler for future server-validated commands.
   * Currently logs the action. In the future, validate and broadcast to the room.
   */
  @SubscribeMessage('action')
  handleAction(client: Socket, payload: unknown): void {
    this.logger.log(`Action received from ${client.id}: ${JSON.stringify(payload)}`);
    // In the future, this will be broadcasted to the room
    // this.server.to(client.rooms.values().next().value).emit('action', payload);
  }

  // =============================================================================
  // ATO (Air Tasking Order) Events
  // =============================================================================

  /**
   * Broadcast ATO line created event to all players in the game room
   */
  broadcastAtoLineCreated(gameId: string, atoLine: ATOLine): void {
    this.server.to(gameId).emit('atoLineCreated', {
      type: 'atoLineCreated',
      payload: atoLine,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`ATO line created broadcast to room ${gameId}: ${atoLine.aircraftCallSign}`);
  }

  /**
   * Broadcast ATO line updated event to all players in the game room
   */
  broadcastAtoLineUpdated(gameId: string, atoLine: ATOLine): void {
    this.server.to(gameId).emit('atoLineUpdated', {
      type: 'atoLineUpdated',
      payload: atoLine,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`ATO line updated broadcast to room ${gameId}: ${atoLine.aircraftCallSign}`);
  }

  /**
   * Broadcast ATO line deleted event to all players in the game room
   */
  broadcastAtoLineDeleted(gameId: string, atoLineId: number, aircraftCallSign: string): void {
    this.server.to(gameId).emit('atoLineDeleted', {
      type: 'atoLineDeleted',
      payload: { id: atoLineId, aircraftCallSign },
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`ATO line deleted broadcast to room ${gameId}: ${aircraftCallSign}`);
  }

  /**
   * Broadcast PPR status change event to all players in the game room
   */
  broadcastPprStatusChanged(gameId: string, atoLine: ATOLine): void {
    this.server.to(gameId).emit('pprStatusChanged', {
      type: 'pprStatusChanged',
      payload: {
        id: atoLine.id,
        aircraftCallSign: atoLine.aircraftCallSign,
        pprStatus: atoLine.pprStatus,
        atoLine,
      },
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`PPR status changed broadcast to room ${gameId}: ${atoLine.aircraftCallSign} -> ${atoLine.pprStatus}`);
  }

  /**
   * Broadcast bulk PPR approval event to all players in the game room
   */
  broadcastBulkPprApproved(gameId: string, approvedLines: ATOLine[]): void {
    this.server.to(gameId).emit('bulkPprApproved', {
      type: 'bulkPprApproved',
      payload: {
        count: approvedLines.length,
        atoLines: approvedLines,
      },
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Bulk PPR approved broadcast to room ${gameId}: ${approvedLines.length} flights`);
  }

  /**
   * Broadcast ATO turn advanced event when moving to next turn
   */
  broadcastAtoTurnAdvanced(gameId: string, newTurn: number): void {
    this.server.to(gameId).emit('atoTurnAdvanced', {
      type: 'atoTurnAdvanced',
      payload: {
        turn: newTurn,
        message: 'ATO has been archived and cleared for new turn',
      },
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`ATO turn advanced broadcast to room ${gameId}: Turn ${newTurn}`);
  }

  /**
   * Broadcast execution results updated event
   */
  broadcastExecutionResultUpdated(gameId: string, atoLine: ATOLine): void {
    this.server.to(gameId).emit('executionResultUpdated', {
      type: 'executionResultUpdated',
      payload: {
        id: atoLine.id,
        aircraftCallSign: atoLine.aircraftCallSign,
        executionResult: atoLine.executionResult,
        atoLine,
      },
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Execution result updated broadcast to room ${gameId}: ${atoLine.aircraftCallSign}`);
  }

  // =============================================================================
  // Event Handlers for Client-Initiated ATO Actions
  // =============================================================================

  /**
   * Handle client request to refresh ATO data
   */
  @SubscribeMessage('requestAtoRefresh')
  handleAtoRefreshRequest(client: Socket, payload: { gameId: number }): void {
    const _room = client.rooms.values().next().value;
    this.logger.log(`ATO refresh requested by ${client.id} for game ${payload.gameId}`);

    // Emit refresh event back to requesting client
    client.emit('atoRefreshRequested', {
      type: 'atoRefreshRequested',
      payload: { gameId: payload.gameId },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle client notification of ATO action completion
   */
  @SubscribeMessage('atoActionCompleted')
  handleAtoActionCompleted(client: Socket, payload: { action: string; success: boolean; message?: string }): void {
    this.logger.log(`ATO action completed by ${client.id}: ${payload.action} - ${payload.success ? 'Success' : 'Failed'}`);

    // Optionally broadcast action completion to other clients in the room
    const room = client.rooms.values().next().value;
    if (room) {
      client.to(room).emit('atoActionNotification', {
        type: 'atoActionNotification',
        payload: {
          action: payload.action,
          success: payload.success,
          message: payload.message || `ATO ${payload.action} ${payload.success ? 'completed' : 'failed'}`,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // =============================================================================
  // Allocation Events
  // =============================================================================

  /**
   * Broadcast allocation cycle created event to all players in the game room
   */
  broadcastAllocationCycleCreated(gameId: string, cycle: AllocationCycle): void {
    this.server.to(gameId).emit('allocationCycleCreated', {
      type: 'allocationCycleCreated',
      payload: cycle,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Allocation cycle created broadcast to room ${gameId}: Turn ${cycle.turn}`);
  }

  /**
   * Broadcast allocation cycle status change event to all players in the game room
   */
  broadcastAllocationCycleStatusChanged(gameId: string, cycle: AllocationCycle): void {
    this.server.to(gameId).emit('allocationCycleStatusChanged', {
      type: 'allocationCycleStatusChanged',
      payload: cycle,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Allocation cycle status changed broadcast to room ${gameId}: ${cycle.status}`);
  }

  /**
   * Broadcast aircraft request created event to all players in the game room
   */
  broadcastAircraftRequestCreated(gameId: string, request: AircraftRequest): void {
    this.server.to(gameId).emit('aircraftRequestCreated', {
      type: 'aircraftRequestCreated',
      payload: request,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Aircraft request created broadcast to room ${gameId}: Request ${request.id}`);
  }

  /**
   * Broadcast aircraft request updated event to all players in the game room
   */
  broadcastAircraftRequestUpdated(gameId: string, request: AircraftRequest): void {
    this.server.to(gameId).emit('aircraftRequestUpdated', {
      type: 'aircraftRequestUpdated',
      payload: request,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Aircraft request updated broadcast to room ${gameId}: Request ${request.id}`);
  }

  /**
   * Broadcast aircraft request deleted event to all players in the game room
   */
  broadcastAircraftRequestDeleted(gameId: string, requestId: number): void {
    this.server.to(gameId).emit('aircraftRequestDeleted', {
      type: 'aircraftRequestDeleted',
      payload: { requestId },
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Aircraft request deleted broadcast to room ${gameId}: Request ${requestId}`);
  }

  /**
   * Broadcast aircraft request reviewed event to all players in the game room
   */
  broadcastAircraftRequestReviewed(gameId: string, request: AircraftRequest): void {
    this.server.to(gameId).emit('aircraftRequestReviewed', {
      type: 'aircraftRequestReviewed',
      payload: request,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Aircraft request reviewed broadcast to room ${gameId}: Request ${request.id} - ${request.status}`);
  }

  /**
   * Broadcast aircraft allocated event to all players in the game room
   */
  broadcastAircraftAllocated(gameId: string, allocation: AircraftAllocation): void {
    this.server.to(gameId).emit('aircraftAllocated', {
      type: 'aircraftAllocated',
      payload: allocation,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Aircraft allocated broadcast to room ${gameId}: Allocation ${allocation.id}`);
  }

  /**
   * Broadcast aircraft deallocated event to all players in the game room
   */
  broadcastAircraftDeallocated(gameId: string, allocationId: number, aircraftCallSign: string): void {
    this.server.to(gameId).emit('aircraftDeallocated', {
      type: 'aircraftDeallocated',
      payload: { allocationId, aircraftCallSign },
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Aircraft deallocated broadcast to room ${gameId}: ${aircraftCallSign}`);
  }

  /**
   * Broadcast aircraft pool updated event to all players in the game room
   */
  broadcastAircraftPoolUpdated(gameId: string, poolStats: any): void {
    this.server.to(gameId).emit('aircraftPoolUpdated', {
      type: 'aircraftPoolUpdated',
      payload: poolStats,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Aircraft pool updated broadcast to room ${gameId}`);
  }

  // =============================================================================
  // Country Access Events
  // =============================================================================

  /**
   * Publish country access updated event to all clients in a game room.
   * Best-effort broadcast; consumers can refetch snapshot after receiving.
   */
  publishCountryAccessUpdated(
    gameId: number,
    payload: { version: number; changes: Record<string, boolean | null> }
  ): void {
    const room = String(gameId);
    this.server.to(room).emit('countryAccessUpdated', {
      type: 'countryAccessUpdated',
      payload,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Country access updated broadcast to room ${room}: v${payload.version}`);
  }

  /**
   * Publish bulk country access updated event to all clients in a game room.
   * Used when multiple countries have their access level changed simultaneously.
   */
  publishBulkAccessUpdated(
    gameId: number,
    payload: { accessLevel: string; countries: string[] }
  ): void {
    const room = String(gameId);
    this.server.to(room).emit('bulkCountryAccessChanged', {
      type: 'bulkCountryAccessChanged',
      payload: {
        gameId,
        accessLevel: payload.accessLevel,
        countries: payload.countries
      },
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Bulk country access updated broadcast to room ${room}: ${payload.countries.length} countries to ${payload.accessLevel}`);
  }

  /**
   * Publish bulk dice roll updated event to all clients in a game room.
   * Used when multiple countries have their dice rolls and resulting access levels updated.
   */
  publishBulkDiceRollUpdated(
    gameId: number,
    payload: { countries: Array<{ country: any; diceRoll: number; accessLevel: any }> }
  ): void {
    const room = String(gameId);

    this.logger.log(`🎲 publishBulkDiceRollUpdated called for room ${room} with ${payload.countries.length} countries`);
    this.logger.log(`🎲 Countries data:`, JSON.stringify(payload.countries));

    const eventData = {
      type: 'bulkDiceRollUpdated',
      payload: {
        gameId,
        countries: payload.countries
      },
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`🎲 Emitting bulkDiceRollUpdated event:`, JSON.stringify(eventData));

    this.server.to(room).emit('bulkDiceRollUpdated', eventData);

    this.logger.log(`✅ Bulk dice roll updated broadcast sent to room ${room}: ${payload.countries.length} countries`);
  }

  // =============================================================================
  // Team-Specific Room Management for Allocation Notifications
  // =============================================================================

  /**
   * Join client to team-specific room for targeted allocation notifications
   */
  joinTeamRoom(clientId: string, gameId: number, teamId: number): void {
    const client = this.server.sockets.sockets.get(clientId);
    if (client) {
      const teamRoomId = `${gameId}-team-${teamId}`;
      client.join(teamRoomId);
      this.logger.log(`Client ${clientId} joined team room ${teamRoomId}`);
    }
  }

  /**
   * Leave team-specific room
   */
  leaveTeamRoom(clientId: string, gameId: number, teamId: number): void {
    const client = this.server.sockets.sockets.get(clientId);
    if (client) {
      const teamRoomId = `${gameId}-team-${teamId}`;
      client.leave(teamRoomId);
      this.logger.log(`Client ${clientId} left team room ${teamRoomId}`);
    }
  }

  /**
   * Enhanced connection handler that joins team-specific rooms based on player data
   */
  async handleTeamConnection(client: Socket, gameId: number, teamId?: number): Promise<void> {
    if (gameId && teamId) {
      this.joinTeamRoom(client.id, gameId, teamId);
    }
  }

  // =============================================================================
  // Event Handlers for Client-Initiated Allocation Actions
  // =============================================================================

  /**
   * Handle client request to refresh allocation data
   */
  @SubscribeMessage('requestAllocationRefresh')
  handleAllocationRefreshRequest(client: Socket, payload: { gameId: number }): void {
    const _room = client.rooms.values().next().value;
    this.logger.log(`Allocation refresh requested by ${client.id} for game ${payload.gameId}`);

    // Emit refresh event back to requesting client
    client.emit('allocationRefreshRequested', {
      type: 'allocationRefreshRequested',
      payload: { gameId: payload.gameId },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle client notification acknowledgment
   */
  @SubscribeMessage('allocationNotificationAck')
  handleAllocationNotificationAck(client: Socket, payload: {
    notificationId: string;
    gameId: number;
    teamId: number;
  }): void {
    this.logger.log(`Allocation notification acknowledged by ${client.id}: ${payload.notificationId}`);

    // Broadcast acknowledgment to team room for coordination
    const teamRoomId = `${payload.gameId}-team-${payload.teamId}`;
    client.to(teamRoomId).emit('allocationNotificationAcknowledged', {
      type: 'allocationNotificationAcknowledged',
      payload: {
        notificationId: payload.notificationId,
        acknowledgedBy: client.id,
        acknowledgedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
    });
  }
}

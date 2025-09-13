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
    const room = client.rooms.values().next().value;
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
}

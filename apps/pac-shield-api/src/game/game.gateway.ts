import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

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
}

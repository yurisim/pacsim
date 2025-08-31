import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('GameGateway');

  handleConnection(client: Socket) {
    const { gameId } = client.handshake.query;
    if (gameId) {
      client.join(gameId);
      this.logger.log(`Client ${client.id} joined room ${gameId}`);
    }
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('playerJoined')
  handlePlayerJoined(client: Socket, payload: { playerName: string }): void {
    const room = client.rooms.values().next().value;
    this.server.to(room).emit('playerJoined', payload);
  }

  @SubscribeMessage('action')
  handleAction(client: Socket, payload: unknown): void {
    this.logger.log(`Action received from ${client.id}: ${JSON.stringify(payload)}`);
    // In the future, this will be broadcasted to the room
    // this.server.to(client.rooms.values().next().value).emit('action', payload);
  }
}

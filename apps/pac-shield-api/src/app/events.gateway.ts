import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // For demonstration purposes. In production, restrict this to your frontend's domain.
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(@MessageBody('gameId') gameId: string, client: Socket): void {
    client.join(gameId);
    this.logger.log(`Client ${client.id} joined room: ${gameId}`);
    // Optionally, send a confirmation to the client who just joined
    client.emit('joinedRoom', `You have successfully joined game ${gameId}`);
  }

  @SubscribeMessage('gameEvent')
  handleGameEvent(
    @MessageBody() payload: { gameId: string; eventName: string; data: unknown }
  ): void {
    this.logger.log(
      `Received event '${payload.eventName}' for room ${payload.gameId}`
    );
    // Broadcast the event to all clients in the specific game room, except the sender
    this.server
      .to(payload.gameId)
      .emit('gameEvent', { eventName: payload.eventName, data: payload.data });
  }
}

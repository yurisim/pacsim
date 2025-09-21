import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
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
    client.setMaxListeners(15); // Increase from default 10 to prevent warnings
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Handles player joining a game room via WebSocket. Creates Socket.IO room isolation 
   * so game events are only broadcast to players in the same game session.
   * Each gameId becomes a separate room for real-time multiplayer communication.
   */
  @SubscribeMessage('joinGame')
  handleJoinGame(@MessageBody() gameId: string, @ConnectedSocket() client: Socket): void {
    client.join(gameId);
    this.logger.log(`Client ${client.id} joined room: ${gameId}`);
    // Optionally, send a confirmation to the client who just joined
    client.emit('joinedRoom', `You have successfully joined game ${gameId}`);
  }

  /**
   * Broadcasts events to all players in a specific lobby/game room.
   * Used by game services to push state updates, player actions, or system messages
   * to all connected clients in the same game session.
   */
  sendToLobby(lobbyId: string, event: string, data: any) {
    this.server.to(lobbyId).emit(event, data);
  }

  /**
   * Generic event relay system for real-time multiplayer game actions.
   * Receives typed events from clients (player moves, chat, game commands) and 
   * broadcasts them to all other players in the same game room.
   * Core mechanism for synchronized multiplayer state across all connected clients.
   */
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

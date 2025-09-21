import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * WebSocket gateway for the general lobby channel.
 * - Provides a simple room-based channel for pre-game lobby coordination
 * - Used by PlayerService to broadcast player list updates
 */
@WebSocketGateway()
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  /**
   * On socket connect: log client id for observability.
   * Lobby is not game-scoped; rooms are joined explicitly via joinLobby().
   */
  handleConnection(client: Socket, ...args: any[]) {
    client.setMaxListeners(15); // Increase from default 10 to prevent warnings
    console.log(`Client connected: ${client.id}`);
  }

  /**
   * On socket disconnect: log client id for observability.
   */
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Join a logical lobby room by id and acknowledge to the caller.
   * Enables broadcasting targeted events to all clients in the same lobby.
   */
  @SubscribeMessage('joinLobby')
  handleJoinLobby(client: Socket, lobbyId: string): void {
    client.join(lobbyId);
    client.emit('joinedLobby', `Successfully joined lobby ${lobbyId}`);
  }

  /**
   * Server-side helper to emit an event to all clients in a lobby room.
   * Used by services (e.g., PlayerService) to push roster/state updates.
   */
  sendToLobby(lobbyId: string, event: string, data: any) {
    this.server.to(lobbyId).emit(event, data);
  }
}

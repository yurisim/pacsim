import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinLobby')
  handleJoinLobby(client: Socket, lobbyId: string): void {
    client.join(lobbyId);
    client.emit('joinedLobby', `Successfully joined lobby ${lobbyId}`);
  }

  sendToLobby(lobbyId: string, event: string, data: any) {
    this.server.to(lobbyId).emit(event, data);
  }
}

import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: Socket;
  private gameId: string | null = null;

  constructor() {
    // Connect to the WebSocket server
    this.socket = io('http://localhost:3000'); // The URL of your NestJS backend
  }

  // Method to join a specific game room
  joinGame(gameId: string): void {
    this.gameId = gameId;
    this.socket.emit('joinGame', { gameId });
  }

  // Method to send a game-specific event to the server
  sendMessage(eventName: string, data: unknown): void {
    if (!this.gameId) {
      console.error('Cannot send message: not in a game room.');
      return;
    }
    this.socket.emit('gameEvent', { gameId: this.gameId, eventName, data });
  }

  // Method to listen for game-specific events from the server
  listen<T>(eventNameToListen: string): Observable<T> {
    return new Observable((subscriber) => {
      this.socket.on('gameEvent', (payload: { eventName: string; data: T }) => {
        // Only react to events that match the one we are listening for
        if (payload.eventName === eventNameToListen) {
          subscriber.next(payload.data);
        }
      });
    });
  }

  // Listen for direct, non-game-specific messages from the server (e.g., connection confirmations)
  listenToServer<T>(eventName: string): Observable<T> {
    return new Observable((subscriber) => {
      this.socket.on(eventName, (data: T) => {
        subscriber.next(data);
      });
    });
  }

  // Method to disconnect from the server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

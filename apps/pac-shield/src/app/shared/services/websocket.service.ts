import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
/**
 * Singleton service managing Socket.IO connection for real-time game events.
 * - Maintains resilient reconnection using a Fibonacci backoff strategy
 * - Scopes the connection to a specific game via `gameId` query parameter
 * - Exposes helpers to connect/disconnect, emit events, and subscribe to server events
 * - Publishes connection status for UI/state synchronization (connectionStatus$)
 */
export class WebSocketService {
  private socket: Socket;
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private gameId: string | null = null;
  /** Emits true when connected; subscribe to reflect socket availability in UI/store. */
  public connectionStatus$ = this.connectionStatus.asObservable();

  /**
   * Configure the Socket.IO client with manual connect and adaptive reconnection.
   * Uses Fibonacci backoff between attempts and resets backoff on successful connect.
   */
  constructor() {
    const fibonacciDelays = [1000, 2000, 3000, 5000, 8000, 13000, 21000];
    let attempt = 0;

    this.socket = io(environment.websocketUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000, // Initial delay
      reconnectionDelayMax: 21000, // Max delay
      randomizationFactor: 0,
      autoConnect: false, // Connect manually
    });

    this.socket.on('reconnect_attempt', () => {
      const delay =
        attempt < fibonacciDelays.length
          ? fibonacciDelays[attempt]
          : fibonacciDelays[fibonacciDelays.length - 1];
      this.socket.io.opts.reconnectionDelay = delay;
      this.socket.io.opts.reconnectionDelayMax = delay;
      attempt++;
    });

    this.socket.on('connect', () => {
      attempt = 0; // Reset on successful connection
    });

    this.setupConnectionListeners();
  }

  /**
   * Establishes WebSocket connection for a specific game session.
   * Implements Fibonacci backoff strategy for resilient reconnection in unstable networks.
   * Sets gameId context for server-side room management and event routing.
   */
  connect(gameId: string): void {
    if (this.socket.connected) return;

    this.gameId = gameId;
    this.socket.io.opts.query = { gameId };
    this.socket.connect();
  }

  /**
   * Tear down the active socket connection and clear game context.
   * Safe to call multiple times; no-op if already disconnected.
   */
  disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
    this.gameId = null;
  }

  /**
   * Emit an event to the server for the current game connection.
   * Logs and skips if not connected to avoid throwing from UI flows.
   */
  emit<T>(eventName: string, data: T): void {
    if (!this.socket.connected) {
      console.error('Socket not connected. Cannot emit event.');
      return;
    }
    this.socket.emit(eventName, data);
  }

  /**
   * Joins a Socket.IO room for game-specific event isolation.
   * Creates multiplayer session boundary - only players in the same room
   * receive each other's game events, ensuring proper game state synchronization.
   */
  joinGameRoom(roomCode: string): void {
    if (!this.socket.connected) {
      console.error('Socket not connected. Cannot join room.');
      return;
    }
    this.socket.emit('joinGame', roomCode);
    console.log(`Joining game room: ${roomCode}`);
  }

  /**
   * Creates RxJS Observable for real-time game events from server.
   * Components subscribe to specific event types (player-joined, state-updated, etc.)
   * Automatically handles cleanup when component unsubscribes to prevent memory leaks.
   */
  listen<T>(eventName: string): Observable<T> {
    return new Observable((subscriber) => {
      this.socket.on(eventName, (data: T) => {
        subscriber.next(data);
      });

      // Cleanup on unsubscribe
      return () => this.socket.off(eventName);
    });
  }

  /**
   * Register a listener for a WebSocket event
   * Used by services that need direct event handling
   */
  on<T>(eventName: string, callback: (data: T) => void): void {
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
  }

  /**
   * Remove a listener for a WebSocket event
   * Used for cleanup
   */
  off(eventName: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(eventName, callback);
    }
  }

  /**
   * Wire up core lifecycle events to update connection status and optionally dispatch actions.
   * Hooks:
   * - connect: set status true
   * - disconnect: set status false with reason
   * - connect_error: set status false and log the error
   */
  private setupConnectionListeners(): void {
    this.socket.on('connect', () => {
      console.log('Successfully connected to WebSocket server.');
      this.connectionStatus.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`Disconnected from WebSocket: ${reason}`);
      this.connectionStatus.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.connectionStatus.next(false);
    });
  }
}


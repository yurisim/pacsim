import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppState } from '../../core/store/app.state';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: Socket;
  private store = inject(Store<AppState>);
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private gameId: string | null = null;
  public connectionStatus$ = this.connectionStatus.asObservable();

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

  connect(gameId: string): void {
    if (this.socket.connected) return;

    this.gameId = gameId;
    this.socket.io.opts.query = { gameId };
    this.socket.connect();
  }

  disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
    this.gameId = null;
  }

  emit<T>(eventName: string, data: T): void {
    if (!this.socket.connected) {
      console.error('Socket not connected. Cannot emit event.');
      return;
    }
    this.socket.emit(eventName, data);
  }

  joinGameRoom(roomCode: string): void {
    if (!this.socket.connected) {
      console.error('Socket not connected. Cannot join room.');
      return;
    }
    this.socket.emit('joinGame', roomCode);
    console.log(`Joining game room: ${roomCode}`);
  }

  listen<T>(eventName: string): Observable<T> {
    return new Observable((subscriber) => {
      this.socket.on(eventName, (data: T) => {
        // TODO: Dispatch an NgRx action with the received data
        // Example: this.store.dispatch(someAction({ payload: data }));
        subscriber.next(data);
      });

      // Cleanup on unsubscribe
      return () => this.socket.off(eventName);
    });
  }

  private setupConnectionListeners(): void {
    this.socket.on('connect', () => {
      console.log('Successfully connected to WebSocket server.');
      this.connectionStatus.next(true);
      // TODO: Dispatch a connection success action
      // this.store.dispatch(WebSocketActions.connectSuccess());
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`Disconnected from WebSocket: ${reason}`);
      this.connectionStatus.next(false);
      // TODO: Dispatch a disconnect action
      // this.store.dispatch(WebSocketActions.disconnected({ reason }));
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.connectionStatus.next(false);
      // TODO: Dispatch a connection failure action
      // this.store.dispatch(WebSocketActions.connectFailure({ error }));
    });
  }
}


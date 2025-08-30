import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppState } from '../../core/store/app.state';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: Socket;
  private store = inject(Store<AppState>);

  constructor() {
    this.socket = io(environment.websocketUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: false, // Connect manually
    });

    this.setupConnectionListeners();
  }

  connect(gameId: string): void {
    if (this.socket.connected) return;

    this.socket.io.opts.query = { gameId };
    this.socket.connect();
  }

  disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  emit<T>(eventName: string, data: T): void {
    if (!this.socket.connected) {
      console.error('Socket not connected. Cannot emit event.');
      return;
    }
    this.socket.emit(eventName, data);
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
      // TODO: Dispatch a connection success action
      // this.store.dispatch(WebSocketActions.connectSuccess());
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`Disconnected from WebSocket: ${reason}`);
      // TODO: Dispatch a disconnect action
      // this.store.dispatch(WebSocketActions.disconnected({ reason }));
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      // TODO: Dispatch a connection failure action
      // this.store.dispatch(WebSocketActions.connectFailure({ error }));
    });
  }
}


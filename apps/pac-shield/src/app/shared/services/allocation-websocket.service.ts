import { Injectable, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import * as AllocationActions from '../../store/allocation/allocation.actions';

export interface AllocationWebSocketConfig {
  gameId: number;
  teamId?: number;
  reconnect?: boolean;
  reconnectDelay?: number;
}

/**
 * Service for managing WebSocket connections specifically for allocation-related events.
 * Handles real-time communication for aircraft allocation notifications, request updates,
 * and pool status changes.
 */
@Injectable({
  providedIn: 'root'
})
export class AllocationWebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private currentConfig: AllocationWebSocketConfig | null = null;

  private connectionStatus$ = new BehaviorSubject<'disconnected' | 'connecting' | 'connected'>('disconnected');
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  /**
   * Initialize WebSocket connection for allocation events
   */
  connect(config: AllocationWebSocketConfig): void {
    if (this.socket?.connected) {
      this.disconnect();
    }

    this.currentConfig = config;
    this.reconnectDelay = config.reconnectDelay || 2000;
    this.connectionStatus$.next('connecting');

    const socketUrl = environment.apiUrl.replace(/\/api$/, '');

    this.socket = io(`${socketUrl}/game`, {
      query: {
        gameId: config.gameId.toString(),
        teamId: config.teamId?.toString()
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      forceNew: true
    });

    this.setupEventListeners();
    this.store.dispatch(AllocationActions.initializeAllocationWebSocket({
      gameId: config.gameId,
      teamId: config.teamId
    }));
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentConfig = null;
    this.reconnectAttempts = 0;
    this.connectionStatus$.next('disconnected');
    this.store.dispatch(AllocationActions.allocationWebSocketDisconnected());
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): Observable<'disconnected' | 'connecting' | 'connected'> {
    return this.connectionStatus$.asObservable();
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Send acknowledgment for a notification
   */
  acknowledgeNotification(notificationId: string, gameId: number, teamId: number): void {
    if (this.socket?.connected) {
      this.socket.emit('allocationNotificationAck', {
        notificationId,
        gameId,
        teamId
      });
    }
  }

  /**
   * Request refresh of allocation data
   */
  requestAllocationRefresh(gameId: number): void {
    if (this.socket?.connected) {
      this.socket.emit('requestAllocationRefresh', { gameId });
    }
  }

  /**
   * Setup event listeners for allocation-related WebSocket events
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Allocation WebSocket connected');
      this.connectionStatus$.next('connected');
      this.reconnectAttempts = 0;
      this.store.dispatch(AllocationActions.allocationWebSocketConnected());

      // Join team-specific room if teamId is provided
      if (this.currentConfig?.teamId && this.currentConfig?.gameId) {
        this.joinTeamRoom(this.currentConfig.gameId, this.currentConfig.teamId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Allocation WebSocket disconnected:', reason);
      this.connectionStatus$.next('disconnected');
      this.store.dispatch(AllocationActions.allocationWebSocketDisconnected());

      // Attempt reconnection if not manually disconnected
      if (reason !== 'io client disconnect' && this.currentConfig?.reconnect !== false) {
        this.attemptReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Allocation WebSocket connection error:', error);
      this.store.dispatch(AllocationActions.allocationWebSocketError({
        error: error.message || 'Connection failed'
      }));
      this.attemptReconnection();
    });

    // Allocation-specific events
    this.socket.on('allocationNotification', (data) => {
      console.log('Allocation notification received:', data);
      this.store.dispatch(AllocationActions.allocationNotificationReceived({
        notification: data.payload
      }));
    });

    this.socket.on('allocationCycleCreated', (data) => {
      console.log('Allocation cycle created:', data);
      this.store.dispatch(AllocationActions.allocationCycleCreated({
        cycle: data.payload
      }));
    });

    this.socket.on('allocationCycleStatusChanged', (data) => {
      console.log('Allocation cycle status changed:', data);
      this.store.dispatch(AllocationActions.allocationCycleStatusChanged({
        cycle: data.payload
      }));
    });

    this.socket.on('aircraftRequestCreated', (data) => {
      console.log('Aircraft request created:', data);
      this.store.dispatch(AllocationActions.aircraftRequestCreated({
        request: data.payload
      }));
    });

    this.socket.on('aircraftRequestUpdated', (data) => {
      console.log('Aircraft request updated:', data);
      this.store.dispatch(AllocationActions.aircraftRequestUpdated({
        request: data.payload
      }));
    });

    this.socket.on('aircraftRequestDeleted', (data) => {
      console.log('Aircraft request deleted:', data);
      this.store.dispatch(AllocationActions.aircraftRequestDeleted({
        requestId: data.payload.requestId
      }));
    });

    this.socket.on('aircraftRequestReviewed', (data) => {
      console.log('Aircraft request reviewed:', data);
      this.store.dispatch(AllocationActions.aircraftRequestReviewed({
        request: data.payload
      }));
    });

    this.socket.on('aircraftAllocated', (data) => {
      console.log('Aircraft allocated:', data);
      this.store.dispatch(AllocationActions.aircraftAllocated({
        allocation: data.payload
      }));
    });

    this.socket.on('aircraftDeallocated', (data) => {
      console.log('Aircraft deallocated:', data);
      this.store.dispatch(AllocationActions.aircraftDeallocated({
        allocationId: data.payload.allocationId,
        aircraftCallSign: data.payload.aircraftCallSign
      }));
    });

    this.socket.on('aircraftPoolUpdated', (data) => {
      console.log('Aircraft pool updated:', data);
      // Trigger refresh of pool data
      if (this.currentConfig?.gameId) {
        this.store.dispatch(AllocationActions.loadUnallocatedAircraftPool({
          gameId: this.currentConfig.gameId
        }));
      }
    });

    // Acknowledgment events
    this.socket.on('allocationNotificationAcknowledged', (data) => {
      console.log('Notification acknowledged:', data);
      this.store.dispatch(AllocationActions.acknowledgeNotificationSuccess({
        notificationId: data.payload.notificationId
      }));
    });

    // Refresh events
    this.socket.on('allocationRefreshRequested', (data) => {
      console.log('Allocation refresh requested:', data);
      if (data.payload.gameId) {
        this.store.dispatch(AllocationActions.refreshAllocationData({
          gameId: data.payload.gameId
        }));
      }
    });
  }

  /**
   * Join team-specific room for targeted notifications
   */
  private joinTeamRoom(gameId: number, teamId: number): void {
    if (this.socket?.connected) {
      // The server will automatically join clients to team rooms based on their connection query params
      // This is handled by the enhanced GameGateway.handleTeamConnection method
      console.log(`Joining team room for game ${gameId}, team ${teamId}`);
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.store.dispatch(AllocationActions.allocationWebSocketError({
        error: 'Connection failed after maximum retry attempts'
      }));
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (this.currentConfig && !this.socket?.connected) {
        this.connect(this.currentConfig);
      }
    }, delay);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}

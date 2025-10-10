import { Injectable, inject, signal, computed } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from './websocket.service';
import { environment } from '../../../environments/environment';

/**
 * Unified notification types supported by the system
 */
export type NotificationType =
  | 'allocation'      // Aircraft allocation requests/approvals
  | 'game_event'      // Game state changes (turn started, etc.)
  | 'system'          // System messages
  | 'chat'            // Future: player chat
  | 'alert';          // Important alerts

/**
 * Priority levels for notifications
 */
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/**
 * Unified notification interface for all game notifications
 */
export interface GameNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: string;
  gameId: number;
  targetTeamId?: number;
  icon?: string;
  actionUrl?: string;
  requiresAcknowledgment: boolean;
  acknowledged: boolean;
  acknowledgedAt?: string | null;
  read: boolean;
  readAt?: string | null;
  data?: Record<string, unknown>;
}

/**
 * Unified notification service for displaying user feedback and managing game notifications.
 *
 * Provides two types of notifications:
 * 1. **Toast notifications**: Temporary snackbar messages for immediate feedback
 * 2. **Game notifications**: Persistent notifications shown in the bell icon dropdown
 *
 * Uses Angular signals for reactive state management and WebSocket for real-time updates.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly ws = inject(WebSocketService);

  /** Default configuration for all snackbar notifications */
  private defaultConfig: MatSnackBarConfig = {
    duration: 3000,
    horizontalPosition: 'right',
    verticalPosition: 'top',
  };

  // ===== GAME NOTIFICATIONS (BELL ICON) =====

  /** All game notifications stored as a signal for reactivity */
  private notificationsSignal = signal<GameNotification[]>([]);

  /** Public readonly signal for components to subscribe to */
  readonly notifications = this.notificationsSignal.asReadonly();

  /** Computed count of unread notifications */
  readonly unreadCount = computed(() =>
    this.notificationsSignal().filter(n => !n.read).length
  );

  /** Computed boolean for urgent notifications */
  readonly hasUrgent = computed(() =>
    this.notificationsSignal().some(n => !n.read && n.priority === 'URGENT')
  );

  /** Computed notifications requiring acknowledgment */
  readonly requiresAck = computed(() =>
    this.notificationsSignal().filter(n => n.requiresAcknowledgment && !n.acknowledged)
  );

  /**
   * Connect to WebSocket for real-time game notifications
   * Call this when a player joins a game
   */
  connectToGame(gameId: number, teamId?: number): void {
    // Remove any existing listeners to prevent duplicates
    this.ws.off('notification');
    this.ws.off('notificationAcknowledged');

    // Listen for generic notification events from the server
    this.ws.on<{ payload: GameNotification }>('notification', (data) => {
      this.addNotification(data.payload);
      this.showToastForNotification(data.payload);
    });

    // Listen for notification acknowledgments
    this.ws.on<{ payload: { notificationId: string; acknowledgedAt: string } }>('notificationAcknowledged', (data) => {
      this.notificationsSignal.update(notifications =>
        notifications.map(n =>
          n.id === data.payload.notificationId
            ? { ...n, acknowledged: true, acknowledgedAt: data.payload.acknowledgedAt }
            : n
        )
      );
    });

    // Load existing notifications from server
    this.loadNotifications(gameId, teamId);
  }

  /**
   * Disconnect WebSocket listeners when leaving a game
   */
  disconnectFromGame(): void {
    this.ws.off('notification');
    this.notificationsSignal.set([]);
  }

  /**
   * Load notifications from the server
   */
  private loadNotifications(gameId: number, teamId?: number): void {
    const params = teamId ? `?teamId=${teamId}` : '';
    this.http.get<GameNotification[]>(`${environment.apiUrl}/notifications/game/${gameId}${params}`)
      .subscribe({
        next: (notifications) => {
          this.notificationsSignal.set(notifications);
        },
        error: (error) => {
          console.error('Failed to load notifications:', error);
        }
      });
  }

  /**
   * Add a new notification to the list
   */
  private addNotification(notification: GameNotification): void {
    this.notificationsSignal.update(notifications => [notification, ...notifications]);
  }

  /**
   * Mark a notification as read
   */
  markAsRead(notificationId: string): void {
    // Update local state immediately for responsiveness
    this.notificationsSignal.update(notifications =>
      notifications.map(n =>
        n.id === notificationId
          ? { ...n, read: true, readAt: new Date().toISOString() }
          : n
      )
    );

    // Persist to server
    this.http.patch(`${environment.apiUrl}/notifications/${notificationId}/read`, {})
      .subscribe({
        error: (error) => {
          console.error('Failed to mark notification as read:', error);
          // Revert on error
          this.notificationsSignal.update(notifications =>
            notifications.map(n =>
              n.id === notificationId
                ? { ...n, read: false, readAt: null }
                : n
            )
          );
        }
      });
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(gameId: number): void {
    const unreadIds = this.notificationsSignal()
      .filter(n => !n.read)
      .map(n => n.id);

    if (unreadIds.length === 0) return;

    // Update local state
    this.notificationsSignal.update(notifications =>
      notifications.map(n => ({
        ...n,
        read: true,
        readAt: n.read ? n.readAt : new Date().toISOString()
      }))
    );

    // Persist to server
    this.http.patch(`${environment.apiUrl}/notifications/game/${gameId}/read-all`, {})
      .subscribe({
        error: (error) => {
          console.error('Failed to mark all notifications as read:', error);
        }
      });
  }

  /**
   * Acknowledge a notification (for notifications requiring acknowledgment)
   */
  acknowledge(notificationId: string): void {
    this.notificationsSignal.update(notifications =>
      notifications.map(n =>
        n.id === notificationId
          ? { ...n, acknowledged: true, acknowledgedAt: new Date().toISOString() }
          : n
      )
    );

    this.http.patch(`${environment.apiUrl}/notifications/${notificationId}/acknowledge`, {})
      .subscribe({
        error: (error) => {
          console.error('Failed to acknowledge notification:', error);
        }
      });
  }

  /**
   * Delete a notification
   */
  deleteNotification(notificationId: string): void {
    this.notificationsSignal.update(notifications =>
      notifications.filter(n => n.id !== notificationId)
    );

    this.http.delete(`${environment.apiUrl}/notifications/${notificationId}`)
      .subscribe({
        error: (error) => {
          console.error('Failed to delete notification:', error);
        }
      });
  }

  /**
   * Clear all notifications for a game
   */
  clearAll(gameId: number): void {
    this.notificationsSignal.set([]);

    this.http.delete(`${environment.apiUrl}/notifications/game/${gameId}`)
      .subscribe({
        error: (error) => {
          console.error('Failed to clear notifications:', error);
        }
      });
  }

  /**
   * Show a toast notification for important game notifications
   */
  private showToastForNotification(notification: GameNotification): void {
    // Only show toast for HIGH or URGENT priority
    if (notification.priority === 'URGENT') {
      this.error(notification.message, 'View');
    } else if (notification.priority === 'HIGH') {
      this.warn(notification.message, 'View');
    }
    // NORMAL and LOW priority notifications only show in the bell dropdown
  }

  // ===== TOAST NOTIFICATIONS (SNACKBAR) =====

  /**
   * Displays a success notification with green styling.
   * Used for confirming successful operations like saves, updates, or completions.
   * @param message - The success message to display to the user
   * @param action - Text for the action button (default: 'OK')
   * @param config - Optional snackbar configuration to override defaults
   * @example
   * notificationService.success('Player joined team successfully');
   */
  success(message: string, action = 'OK', config?: MatSnackBarConfig): void {
    this.open(message, action, ['snack-success'], config);
  }

  /**
   * Displays an informational notification with blue styling.
   * Used for providing general information or status updates to the user.
   * @param message - The informational message to display
   * @param action - Text for the action button (default: 'OK')
   * @param config - Optional snackbar configuration to override defaults
   * @example
   * notificationService.info('New turn started');
   */
  info(message: string, action = 'OK', config?: MatSnackBarConfig): void {
    this.open(message, action, ['snack-info'], config);
  }

  /**
   * Displays a warning notification with orange/yellow styling.
   * Used for alerting users to potential issues or important considerations.
   * @param message - The warning message to display
   * @param action - Text for the action button (default: 'OK')
   * @param config - Optional snackbar configuration to override defaults
   * @example
   * notificationService.warn('Team roster is locked');
   */
  warn(message: string, action = 'OK', config?: MatSnackBarConfig): void {
    this.open(message, action, ['snack-warn'], config);
  }

  /**
   * Displays an error notification with red styling.
   * Used for communicating failures, validation errors, or critical issues.
   * @param message - The error message to display
   * @param action - Text for the action button (default: 'Dismiss')
   * @param config - Optional snackbar configuration to override defaults
   * @example
   * notificationService.error('Failed to join team');
   */
  error(message: string, action = 'Dismiss', config?: MatSnackBarConfig): void {
    this.open(message, action, ['snack-error'], config);
  }

  /**
   * Internal method for opening snackbars with consistent configuration.
   * Merges default config with custom styling classes and optional overrides.
   * @param message - The message text to display
   * @param action - The action button text
   * @param panelClass - CSS classes for styling the notification type
   * @param config - Optional configuration overrides
   */
  private open(
    message: string,
    action: string,
    panelClass: string[],
    config?: MatSnackBarConfig
  ): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass,
      ...config,
    });
  }
}

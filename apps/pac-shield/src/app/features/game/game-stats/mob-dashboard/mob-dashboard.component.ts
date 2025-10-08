import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { Subject, filter, takeUntil } from 'rxjs';

import { AllocationNotificationBadgeComponent } from '../../notifications/allocation-notification-badge/allocation-notification-badge.component';
import { AllocationNotificationCenterComponent } from '../../notifications/allocation-notification-center/allocation-notification-center.component';
import { AllocationNotificationToastComponent } from '../../notifications/allocation-notification-toast/allocation-notification-toast.component';
import { AllocationWebSocketService } from '../../../../shared/services/allocation-websocket.service';
import * as AllocationActions from '../../../../store/allocation/allocation.actions';
import * as AllocationSelectors from '../../../../store/allocation/allocation.selectors';
import { TeamType } from '../../../../generated/enums';
import { AllocationNotification } from '../../../../store/allocation/allocation.state';

/**
 * MOB dashboard - displays inventory and receives allocation notifications from CAOC
 *
 * Features:
 * - Aircraft inventory and commodities display
 * - Real-time allocation notifications from CAOC
 * - Integration with NgRx allocation state management
 *
 * Note: MOBs no longer request aircraft - CAOC distributes directly
 */
@Component({
  selector: 'app-mob-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    AllocationNotificationBadgeComponent,
    AllocationNotificationToastComponent
  ],
  templateUrl: './mob-dashboard.component.html',
})
export class MobDashboardComponent implements OnInit, OnDestroy {
  // Input properties
  @Input() currentGameId: number | null = null;
  @Input() currentTurn = 1;
  @Input() currentUserTeam: TeamType | null = null;
  @Input() teamId: number | null = null;

  private readonly dialog = inject(MatDialog);
  private readonly store = inject(Store);
  private readonly webSocketService = inject(AllocationWebSocketService);
  private readonly destroy$ = new Subject<void>();

  // Notification observables
  readonly unreadNotificationCount$ = this.store.select(AllocationSelectors.selectUnreadNotificationCount);
  readonly hasUrgentNotifications$ = this.store.select(AllocationSelectors.selectHasUnreadUrgentNotifications);
  readonly recentNotifications$ = this.store.select(AllocationSelectors.selectRecentNotifications);
  readonly unacknowledgedNotifications$ = this.store.select(AllocationSelectors.selectUnacknowledgedNotifications);

  // Current displayed toast notification
  currentToastNotification: AllocationNotification | null = null;

  constructor() {
    // Component initialization
  }

  ngOnInit(): void {
    // Initialize WebSocket connection for real-time allocation notifications
    if (this.currentGameId && this.teamId) {
      this.webSocketService.connect({
        gameId: this.currentGameId,
        teamId: this.teamId,
        reconnect: true
      });
    }

    // Listen for new allocation notifications and show toast
    this.recentNotifications$.pipe(
      filter(notifications => notifications.length > 0),
      takeUntil(this.destroy$)
    ).subscribe(notifications => {
      const latestNotification = notifications[0];
      if (latestNotification && !latestNotification.read) {
        this.showToastNotification(latestNotification);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.webSocketService.disconnect();
  }

  /**
   * Show toast notification for new allocation updates
   */
  showToastNotification(notification: AllocationNotification): void {
    this.currentToastNotification = notification;

    // Auto-dismiss toast after 8 seconds for non-urgent notifications
    if (notification.priority !== 'URGENT') {
      setTimeout(() => {
        this.currentToastNotification = null;
      }, 8000);
    }
  }

  /**
   * Handle toast notification dismissal
   */
  onToastDismissed(notificationId: string): void {
    this.currentToastNotification = null;
    this.store.dispatch(AllocationActions.dismissNotification({ notificationId }));
  }

  /**
   * Handle toast notification acknowledgment
   */
  onToastAcknowledged(notificationId: string): void {
    const notification = this.currentToastNotification;
    if (notification) {
      this.store.dispatch(AllocationActions.acknowledgeNotification({
        notificationId,
        gameId: notification.gameId,
        teamId: notification.targetTeamId || 0
      }));
    }
    this.currentToastNotification = null;
  }

  /**
   * Mark toast notification as read
   */
  onToastRead(notificationId: string): void {
    this.store.dispatch(AllocationActions.markNotificationAsRead({ notificationId }));
  }

  /**
   * Open notification center dialog
   */
  openNotificationCenter(): void {
    this.dialog.open(AllocationNotificationCenterComponent, {
      width: '800px',
      maxWidth: '90vw',
      height: '600px',
      maxHeight: '90vh',
      disableClose: false,
      autoFocus: false,
      restoreFocus: true,
      panelClass: 'notification-center-dialog'
    });
  }

  /**
   * Handle notification badge click
   */
  onNotificationBadgeClick(): void {
    this.openNotificationCenter();
  }
}

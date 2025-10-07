import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { Observable, Subject, filter, takeUntil } from 'rxjs';

import { AircraftRequestDialogComponent } from '../../dialogs/aircraft-request/aircraft-request-dialog.component';
import { AllocationNotificationBadgeComponent } from '../../notifications/allocation-notification-badge/allocation-notification-badge.component';
import { AllocationNotificationCenterComponent } from '../../notifications/allocation-notification-center/allocation-notification-center.component';
import { AllocationNotificationToastComponent } from '../../notifications/allocation-notification-toast/allocation-notification-toast.component';
import { AllocationWebSocketService } from '../../../../shared/services/allocation-websocket.service';
import * as AllocationActions from '../../../../store/allocation/allocation.actions';
import * as AllocationSelectors from '../../../../store/allocation/allocation.selectors';
import { AircraftRequest } from '../../../../generated/aircraftRequest/aircraftRequest.entity';
import { AllocationRequestStatus, TeamType } from '../../../../generated/enums';
import { AllocationNotification } from '../../../../store/allocation/allocation.state';
import { AircraftRequestDialogData } from '../../dialogs/aircraft-request/aircraft-request-dialog.component';

/**
 * MOB dashboard with aircraft allocation workflow integration
 *
 * Features:
 * - Aircraft inventory and commodities display
 * - Aircraft request submission via dialog
 * - Real-time requests tracking with status updates
 * - Integration with NgRx allocation state management
 */
@Component({
  selector: 'app-mob-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ScrollingModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatTabsModule,
    MatTableModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
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
  private readonly snackBar = inject(MatSnackBar);
  private readonly webSocketService = inject(AllocationWebSocketService);
  private readonly destroy$ = new Subject<void>();

  // Observable streams from NgRx store
  readonly currentCycle$ = this.store.select(AllocationSelectors.selectCurrentAllocationCycle);
  readonly allRequests$: Observable<AircraftRequest[]> = this.store.select(AllocationSelectors.selectAllRequests);
  readonly pendingRequests$: Observable<AircraftRequest[]> = this.store.select(AllocationSelectors.selectPendingRequests);
  readonly isLoading$: Observable<boolean> = this.store.select(AllocationSelectors.selectIsAnyLoading);

  // Notification observables
  readonly unreadNotificationCount$ = this.store.select(AllocationSelectors.selectUnreadNotificationCount);
  readonly hasUrgentNotifications$ = this.store.select(AllocationSelectors.selectHasUnreadUrgentNotifications);
  readonly recentNotifications$ = this.store.select(AllocationSelectors.selectRecentNotifications);
  readonly unacknowledgedNotifications$ = this.store.select(AllocationSelectors.selectUnacknowledgedNotifications);

  // Current displayed toast notification
  currentToastNotification: AllocationNotification | null = null;

  // Table configuration for requests display
  readonly displayedColumns = ['aircraftType', 'quantity', 'priority', 'justification', 'status', 'submittedAt'];
  // Expose status constants to template
  readonly StatusValues = {
    PENDING: 'PENDING' as AllocationRequestStatus,
    APPROVED: 'APPROVED' as AllocationRequestStatus,
    DENIED: 'DENIED' as AllocationRequestStatus,
    MODIFIED: 'MODIFIED' as AllocationRequestStatus,
  };

  constructor() {
    // Component initialization
  }

  ngOnInit(): void {
    console.warn('MOB Dashboard: Allocation features temporarily disabled. Please restart dev server after app.config.ts changes.');

    // TEMPORARILY DISABLED: Load allocation data if game ID is available
    // TODO: Uncomment after dev server restart
    // if (this.currentGameId) {
    //   this.store.dispatch(AllocationActions.loadLatestAllocationCycle({ gameId: this.currentGameId }));
    // }

    // TEMPORARILY DISABLED: Load requests for current team
    // TODO: Uncomment after dev server restart
    // if (this.teamId) {
    //   this.store.dispatch(AllocationActions.loadRequestsForTeam({ teamId: this.teamId }));
    // }

    // TEMPORARILY DISABLED: Initialize WebSocket connection for real-time notifications
    // TODO: Uncomment after dev server restart
    // if (this.currentGameId && this.teamId) {
    //   this.webSocketService.connect({
    //     gameId: this.currentGameId,
    //     teamId: this.teamId,
    //     reconnect: true
    //   });
    // }

    // TEMPORARILY DISABLED: Listen for new notifications and show toast
    // TODO: Uncomment after dev server restart
    // this.recentNotifications$.pipe(
    //   filter(notifications => notifications.length > 0),
    //   takeUntil(this.destroy$)
    // ).subscribe(notifications => {
    //   const latestNotification = notifications[0];
    //   if (latestNotification && !latestNotification.read) {
    //     this.showToastNotification(latestNotification);
    //   }
    // });

    // TEMPORARILY DISABLED: Listen for urgent notifications and show snackbar
    // TODO: Uncomment after dev server restart
    // this.hasUrgentNotifications$.pipe(
    //   takeUntil(this.destroy$)
    // ).subscribe(hasUrgent => {
    //   if (hasUrgent) {
    //     this.snackBar.open(
    //       'Urgent allocation notification received!',
    //       'View',
    //       {
    //         duration: 5000,
    //         panelClass: ['urgent-snackbar']
    //       }
    //     ).onAction().subscribe(() => {
    //       this.openNotificationCenter();
    //     });
    //   }
    // });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.webSocketService.disconnect();
  }

  /**
   * Opens the aircraft request dialog for MOB teams to submit allocation requests
   * TEMPORARILY DISABLED until allocation store is available
   */
  openRequestDialog(): void {
    this.snackBar.open(
      'Allocation features temporarily disabled. Please restart the dev server.',
      'Close',
      { duration: 5000, panelClass: ['error-snackbar'] }
    );

    // TEMPORARILY DISABLED: Get current allocation cycle from store
    // TODO: Uncomment after dev server restart
    // this.currentCycle$.pipe(
    //   takeUntil(this.destroy$)
    // ).subscribe(cycle => {
    //   if (!cycle) {
    //     this.snackBar.open(
    //       'No active allocation cycle. Please wait for the next cycle to open.',
    //       'Close',
    //       { duration: 5000, panelClass: ['error-snackbar'] }
    //     );
    //     return;
    //   }

    //   if (!this.teamId) {
    //     this.snackBar.open(
    //       'Team ID not available. Cannot submit request.',
    //       'Close',
    //       { duration: 5000, panelClass: ['error-snackbar'] }
    //     );
    //     return;
    //   }

    //   const dialogData: AircraftRequestDialogData = {
    //     allocationCycleId: cycle.id,
    //     teamId: this.teamId,
    //     currentTurn: this.currentTurn
    //   };

    //   const dialogRef = this.dialog.open(AircraftRequestDialogComponent, {
    //     width: '600px',
    //     maxWidth: '90vw',
    //     disableClose: false,
    //     autoFocus: true,
    //     restoreFocus: true,
    //     data: dialogData
    //   });

    //   // Handle successful request submission
    //   dialogRef.afterClosed().subscribe(result => {
    //     if (result && this.teamId) {
    //       // Request was submitted successfully, refresh the requests list
    //       this.store.dispatch(AllocationActions.loadRequestsForTeam({ teamId: this.teamId }));
    //     }
    //   });
    // });
  }

  /**
   * Gets the appropriate icon for request status
   */
  getStatusIcon(status: AllocationRequestStatus): string {
    switch (status) {
      case 'PENDING':
        return 'schedule';
      case 'APPROVED':
        return 'check_circle';
      case 'DENIED':
        return 'cancel';
      case 'MODIFIED':
        return 'edit';
      default:
        return 'help';
    }
  }

  /**
   * Gets the appropriate color class for request status
   */
  getStatusColor(status: AllocationRequestStatus): string {
    switch (status) {
      case 'PENDING':
        return 'md-sys-color-primary';
      case 'APPROVED':
        return 'md-sys-color-tertiary';
      case 'DENIED':
        return 'md-sys-color-error';
      case 'MODIFIED':
        return 'md-sys-color-secondary';
      default:
        return 'md-sys-color-on-surface-variant';
    }
  }

  /**
   * Formats priority level for display
   */
  formatPriority(priority: number): string {
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    return priorities[priority - 1] || 'Unknown';
  }

  /**
   * Formats date for display in requests table
   */
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Counts approved requests for display
   */
  countApprovedRequests(requests: AircraftRequest[]): number {
    return requests.filter(r => r.status === 'APPROVED').length;
  }

  /**
   * Counts denied requests for display
   */
  countDeniedRequests(requests: AircraftRequest[]): number {
    return requests.filter(r => r.status === 'DENIED').length;
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

  /**
   * Track by function for virtual scrolling performance
   */
  trackByRequestId(index: number, item: AircraftRequest): number {
    return item.id;
  }
}

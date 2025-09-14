import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, Subject, filter, takeUntil } from 'rxjs';
import { map } from 'rxjs/operators';

import { AllocationNotificationBadgeComponent } from '../../notifications/allocation-notification-badge/allocation-notification-badge.component';
import { AllocationNotificationCenterComponent } from '../../notifications/allocation-notification-center/allocation-notification-center.component';
import { AllocationNotificationToastComponent } from '../../notifications/allocation-notification-toast/allocation-notification-toast.component';
import { AllocationWebSocketService } from '../../../../shared/services/allocation-websocket.service';
import * as AllocationActions from '../../../../store/allocation/allocation.actions';
import * as AllocationSelectors from '../../../../store/allocation/allocation.selectors';
import { AircraftRequest } from '../../../../generated/aircraftRequest/aircraftRequest.entity';
import { AircraftInstance } from '../../../../generated/aircraftInstance/aircraftInstance.entity';
import { AircraftAllocation } from '../../../../generated/aircraftAllocation/aircraftAllocation.entity';
import { AllocationCycle } from '../../../../generated/allocationCycle/allocationCycle.entity';
import { AllocationRequestStatus, AircraftType, TeamType, PlayerRole } from '../../../../generated/enums';
import { AllocationNotification } from '../../../../store/allocation/allocation.state';

/**
 * CAOC dashboard with CFACC aircraft allocation interface
 *
 * Features:
 * - Strategic overview of apportionment and PPR queue
 * - Aircraft allocation dashboard for CFACC decision-making
 * - Request review table with MOB priorities and justifications
 * - Aircraft pool management and availability tracking
 * - Allocation decision controls (approve/deny/modify)
 * - Real-time updates via WebSocket integration
 * - Role-based access control for CFACC operations
 */
@Component({
  selector: 'app-caoc-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatBadgeModule,
    MatTooltipModule,
    AllocationNotificationBadgeComponent,
    AllocationNotificationToastComponent
  ],
  templateUrl: './caoc-dashboard.component.html',
})
export class CaocDashboardComponent implements OnInit, OnDestroy {
  @Input() currentUserTeam: TeamType | null = null;
  @Input() currentUserRole: PlayerRole | null = null;
  @Input() currentGameId: number | null = null;
  @Input() currentTurn = 1;
  @Input() readonly = false;

  private readonly store = inject(Store);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly webSocketService = inject(AllocationWebSocketService);
  private readonly destroy$ = new Subject<void>();

  // Observable streams from NgRx store
  readonly currentCycle$: Observable<AllocationCycle | null> = this.store.select(AllocationSelectors.selectCurrentAllocationCycle);
  readonly allRequests$: Observable<AircraftRequest[]> = this.store.select(AllocationSelectors.selectAllRequests);
  readonly pendingRequests$: Observable<AircraftRequest[]> = this.store.select(AllocationSelectors.selectPendingRequests);
  readonly unallocatedPool$: Observable<AircraftInstance[]> = this.store.select(AllocationSelectors.selectUnallocatedAircraftPool);
  readonly allocations$: Observable<AircraftAllocation[]> = this.store.select(AllocationSelectors.selectAllAllocations);
  readonly isLoading$: Observable<boolean> = this.store.select(AllocationSelectors.selectIsAnyLoading);
  readonly analytics$ = this.store.select(AllocationSelectors.selectAllocationAnalytics);

  // Notification observables
  readonly unreadNotificationCount$ = this.store.select(AllocationSelectors.selectUnreadNotificationCount);
  readonly hasUrgentNotifications$ = this.store.select(AllocationSelectors.selectHasUnreadUrgentNotifications);
  readonly recentNotifications$ = this.store.select(AllocationSelectors.selectRecentNotifications);
  readonly unacknowledgedNotifications$ = this.store.select(AllocationSelectors.selectUnacknowledgedNotifications);

  // Current displayed toast notification
  currentToastNotification: AllocationNotification | null = null;

  // Table configurations
  readonly requestsDisplayedColumns = ['team', 'aircraftType', 'quantity', 'priority', 'justification', 'submittedAt', 'status', 'actions'];
  readonly poolDisplayedColumns = ['callSign', 'type', 'status', 'location', 'actions'];
  readonly allocationsDisplayedColumns = ['aircraft', 'allocatedTo', 'requestId', 'allocatedAt', 'actions'];

  // Status constants for template
  readonly StatusValues = {
    PENDING: 'PENDING' as AllocationRequestStatus,
    APPROVED: 'APPROVED' as AllocationRequestStatus,
    DENIED: 'DENIED' as AllocationRequestStatus,
    MODIFIED: 'MODIFIED' as AllocationRequestStatus,
  };

  // User role and team computed properties
  get isCaoc(): boolean {
    return this.currentUserTeam === 'CAOC';
  }

  get isCfacc(): boolean {
    return this.isCaoc || this.currentUserRole === 'GM';
  }

  get canAllocateAircraft(): boolean {
    return this.isCfacc && !this.readonly;
  }

  get canReviewRequests(): boolean {
    return this.isCfacc && !this.readonly;
  }

  // Decision form data
  selectedRequest: AircraftRequest | null = null;
  cfaccNotes = '';
  quantityAllocated = 1;

  ngOnInit(): void {
    // Load initial allocation data
    this.loadAllocationData();

    // Set up real-time data refresh
    this.setupDataRefresh();

    // Initialize WebSocket connection for real-time notifications
    if (this.currentGameId) {
      this.webSocketService.connect({
        gameId: this.currentGameId,
        teamId: this.isCaoc ? 1 : undefined, // TODO: Get actual team ID
        reconnect: true
      });
    }

    // Listen for new notifications and show toast
    this.recentNotifications$.pipe(
      filter(notifications => notifications.length > 0),
      takeUntil(this.destroy$)
    ).subscribe(notifications => {
      const latestNotification = notifications[0];
      if (latestNotification && !latestNotification.read) {
        this.showToastNotification(latestNotification);
      }
    });

    // Listen for urgent notifications and show snackbar
    this.hasUrgentNotifications$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(hasUrgent => {
      if (hasUrgent) {
        this.snackBar.open(
          'Urgent allocation notification received!',
          'View',
          {
            duration: 5000,
            panelClass: ['urgent-snackbar']
          }
        ).onAction().subscribe(() => {
          this.openNotificationCenter();
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.webSocketService.disconnect();
  }

  /**
   * Load all allocation-related data for the current game
   */
  private loadAllocationData(): void {
    if (!this.currentGameId) {
      console.warn('Cannot load allocation data: No game ID provided');
      return;
    }

    this.store.dispatch(AllocationActions.loadLatestAllocationCycle({ gameId: this.currentGameId }));
    this.store.dispatch(AllocationActions.loadUnallocatedAircraftPool({ gameId: this.currentGameId }));

    // Load requests for current cycle
    this.currentCycle$.subscribe(cycle => {
      if (cycle) {
        this.store.dispatch(AllocationActions.loadRequestsForCycle({ cycleId: cycle.id }));
        this.store.dispatch(AllocationActions.loadAllocationsForCycle({ cycleId: cycle.id }));
      }
    });
  }

  /**
   * Set up periodic data refresh for real-time updates
   */
  private setupDataRefresh(): void {
    // TODO: Implement WebSocket event handlers for real-time updates
    // For now, we'll rely on the existing WebSocket integration in effects
  }

  /**
   * Handle CFACC decision on aircraft request
   */
  reviewRequest(request: AircraftRequest, status: AllocationRequestStatus, quantityAllocated?: number, notes?: string): void {
    if (!this.canReviewRequests) {
      console.warn('User does not have permission to review requests');
      return;
    }

    this.store.dispatch(AllocationActions.reviewAircraftRequest({
      requestId: request.id,
      status,
      quantityAllocated,
      cfaccNotes: notes
    }));
  }

  /**
   * Approve a request with full quantity
   */
  approveRequest(request: AircraftRequest): void {
    this.reviewRequest(request, 'APPROVED', request.quantityRequested, 'Request approved as submitted.');
  }

  /**
   * Deny a request
   */
  denyRequest(request: AircraftRequest, reason: string): void {
    this.reviewRequest(request, 'DENIED', 0, reason);
  }

  /**
   * Modify request with partial allocation
   */
  modifyRequest(request: AircraftRequest, newQuantity: number, reason: string): void {
    this.reviewRequest(request, 'MODIFIED', newQuantity, reason);
  }

  /**
   * Allocate specific aircraft to a team
   */
  allocateAircraft(aircraft: AircraftInstance, teamId: number, requestId?: number): void {
    if (!this.canAllocateAircraft) {
      console.warn('User does not have permission to allocate aircraft');
      return;
    }

    this.currentCycle$.subscribe(cycle => {
      if (cycle) {
        this.store.dispatch(AllocationActions.createAircraftAllocation({
          allocationCycleId: cycle.id,
          aircraftRequestId: requestId || 0, // 0 for direct allocation without request
          aircraftInstanceId: aircraft.id,
          allocatedToTeamId: teamId
        }));
      }
    });
  }

  /**
   * Remove an aircraft allocation
   */
  deallocateAircraft(allocation: AircraftAllocation): void {
    if (!this.canAllocateAircraft) {
      console.warn('User does not have permission to deallocate aircraft');
      return;
    }

    this.store.dispatch(AllocationActions.deleteAircraftAllocation({
      allocationId: allocation.id
    }));
  }

  /**
   * Get priority label for display
   */
  getPriorityLabel(priority: number): string {
    const labels = ['', 'Low', 'Medium', 'High', 'Critical', 'Urgent'];
    return labels[priority] || 'Unknown';
  }

  /**
   * Get priority color for chips
   */
  getPriorityColor(priority: number): string {
    switch (priority) {
      case 1:
      case 2:
        return 'primary';
      case 3:
        return 'accent';
      case 4:
        return 'warn';
      case 5:
        return 'warn';
      default:
        return 'primary';
    }
  }

  /**
   * Get status icon for requests
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
   * Get status color for display
   */
  getStatusColor(status: AllocationRequestStatus): string {
    switch (status) {
      case 'PENDING':
        return 'primary';
      case 'APPROVED':
        return 'accent';
      case 'DENIED':
        return 'warn';
      case 'MODIFIED':
        return 'primary';
      default:
        return 'primary';
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Count requests by status - helper for template
   */
  countRequestsByStatus(requests: AircraftRequest[], status: AllocationRequestStatus): number {
    return requests.filter(r => r.status === status).length;
  }

  /**
   * Get aircraft count by type - helper for template
   */
  getAircraftCountByType(analytics: any, type: string, property: 'allocated' | 'available' | 'utilization'): number {
    return analytics[property][type as AircraftType] || 0;
  }

  /**
   * Calculate total aircraft utilization
   */
  calculateTotalUtilization(analytics: any): number {
    const totalAvailable = analytics.available.C17 + analytics.available.C130 + analytics.available.C5;
    const totalAllocated = analytics.allocated.C17 + analytics.allocated.C130 + analytics.allocated.C5;
    return totalAvailable > 0 ? (totalAllocated / totalAvailable * 100) : 0;
  }

  /**
   * Track by function for performance
   */
  trackByRequestId(index: number, item: AircraftRequest): number {
    return item.id;
  }

  trackByAircraftId(index: number, item: AircraftInstance): number {
    return item.id;
  }

  trackByAllocationId(index: number, item: AircraftAllocation): number {
    return item.id;
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

import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, Input, computed } from '@angular/core';
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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

import { AllocationWebSocketService } from '../../../../shared/services/allocation-websocket.service';
import { AllocationSignalService } from '../../../../shared/services/allocation-signal.service';
import { AircraftSpawnDialogComponent, AircraftSpawnDialogData } from '../../dialogs/aircraft-spawn-dialog/aircraft-spawn-dialog.component';
import { ResponsiveNavService } from '../responsive-nav.service';
import * as AllocationActions from '../../../../store/allocation/allocation.actions';
import * as AllocationSelectors from '../../../../store/allocation/allocation.selectors';
import { AircraftRequest } from '../../../../generated/aircraftRequest/aircraftRequest.entity';
import { AircraftInstance } from '../../../../generated/aircraftInstance/aircraftInstance.entity';
import { AircraftAllocation } from '../../../../generated/aircraftAllocation/aircraftAllocation.entity';
import { AllocationCycle } from '../../../../generated/allocationCycle/allocationCycle.entity';
import { AllocationRequestStatus, AircraftType, TeamType, PlayerRole } from '../../../../generated/enums';

interface CaocSection {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
}

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
    MatButtonToggleModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatBadgeModule,
    MatTooltipModule
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
  private readonly allocationSignalService = inject(AllocationSignalService);
  private readonly responsiveNavService = inject(ResponsiveNavService);
  private readonly destroy$ = new Subject<void>();

  // Computed signals from AllocationSignalService
  readonly aircraftCounts = this.allocationSignalService.aircraftCounts;
  readonly loading = this.allocationSignalService.loading;

  // Computed property for GM check
  readonly isGM = computed(() => this.currentUserRole === 'GM');

  // MOB teams for direct allocation
  readonly mobTeams = computed(() => {
    // Filter for MOB teams only
    const teams = [
      { id: 2, type: 'MOB_KADENA', name: 'Kadena AFB' },
      { id: 3, type: 'MOB_ANDERSEN', name: 'Andersen AFB' },
      { id: 4, type: 'MOB_YOKOTA', name: 'Yokota AB' },
      { id: 5, type: 'MOB_OSAN', name: 'Osan AB' },
      { id: 6, type: 'MOB_JBPHH', name: 'Joint Base Pearl Harbor' },
    ];
    return teams;
  });

  // Allocations grouped by team
  readonly allocationsByTeam = computed(() => {
    const allocations = this.allocationSignalService.allocations();
    const grouped = new Map<number, AircraftAllocation[]>();

    allocations.forEach(allocation => {
      const teamId = allocation.allocatedToTeamId;
      if (!grouped.has(teamId)) {
        grouped.set(teamId, []);
      }
      grouped.get(teamId)!.push(allocation);
    });

    return grouped;
  });

  // Observable streams from NgRx store
  readonly currentCycle$: Observable<AllocationCycle | null> = this.store.select(AllocationSelectors.selectCurrentAllocationCycle);
  readonly allRequests$: Observable<AircraftRequest[]> = this.store.select(AllocationSelectors.selectAllRequests);
  readonly pendingRequests$: Observable<AircraftRequest[]> = this.store.select(AllocationSelectors.selectPendingRequests);
  readonly unallocatedPool$: Observable<AircraftInstance[]> = this.store.select(AllocationSelectors.selectUnallocatedAircraftPool);
  readonly allocations$: Observable<AircraftAllocation[]> = this.store.select(AllocationSelectors.selectAllAllocations);
  readonly isLoading$: Observable<boolean> = this.store.select(AllocationSelectors.selectIsAnyLoading);
  readonly analytics$ = this.store.select(AllocationSelectors.selectAllocationAnalytics);


  // Responsive section management
  readonly caocSections: CaocSection[] = [
    { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: 'dashboard' },
    { id: 'allocation', label: 'Aircraft Allocation', shortLabel: 'Aircraft', icon: 'flight' },
    { id: 'strategic', label: 'Strategic Support', shortLabel: 'Strategic', icon: 'military_tech' }
  ];

  private currentSectionSubject = new BehaviorSubject<string>('overview');
  currentSection$ = this.currentSectionSubject.asObservable();

  // Responsive breakpoint observables
  readonly isMobile$ = this.responsiveNavService.isMobile$;
  readonly isTablet$ = this.responsiveNavService.isTablet$;
  readonly isDesktop$ = this.responsiveNavService.isDesktop$;

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
    console.warn('CAOC Dashboard: Allocation features temporarily disabled. Please restart dev server after app.config.ts changes.');

    // TEMPORARILY DISABLED: Load initial allocation data
    // TODO: Uncomment after dev server restart
    // this.loadAllocationData();

    // TEMPORARILY DISABLED: Set up real-time data refresh
    // TODO: Uncomment after dev server restart
    // this.setupDataRefresh();

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.webSocketService.disconnect();
  }

  // =============================================
  //      GM AIRCRAFT MANAGEMENT (NEW)
  // =============================================

  /**
   * Open aircraft spawn dialog for GMs
   */
  async onSpawnAircraft(): Promise<void> {
    if (!this.isGM() || !this.currentGameId) {
      return;
    }

    // Get all teams for dropdown
    const teams = await this.getAllTeams();

    const dialogRef = this.dialog.open<AircraftSpawnDialogComponent, AircraftSpawnDialogData>(
      AircraftSpawnDialogComponent,
      {
        width: '500px',
        data: {
          gameId: this.currentGameId,
          teams,
        }
      }
    );

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open(
          `Aircraft ${result.callSign} spawned successfully!`,
          'Close',
          { duration: 3000 }
        );
        // Signal service will auto-update via WebSocket
      }
    });
  }

  /**
   * Get all teams (mock for now - would fetch from API)
   */
  private async getAllTeams(): Promise<any[]> {
    // Mock teams - in real implementation, fetch from API
    return [
      { id: 1, type: 'CAOC', name: 'CAOC Team' },
      { id: 2, type: 'MOB_KADENA', name: 'Kadena AFB' },
      { id: 3, type: 'MOB_ANDERSEN', name: 'Andersen AFB' },
      { id: 4, type: 'MOB_YOKOTA', name: 'Yokota AB' },
      { id: 5, type: 'MOB_OSAN', name: 'Osan AB' },
      { id: 6, type: 'MOB_JBPHH', name: 'Joint Base Pearl Harbor' },
    ];
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
  getAircraftCountByType(analytics: { allocated: Record<string, number>; available: Record<string, number>; utilization: Record<string, number> }, type: string, property: 'allocated' | 'available' | 'utilization'): number {
    return analytics[property][type as AircraftType] || 0;
  }

  /**
   * Calculate total aircraft utilization
   */
  calculateTotalUtilization(analytics: { allocated: Record<string, number>; available: Record<string, number> }): number {
    const totalAvailable = analytics.available['C17'] + analytics.available['C130'] + analytics.available['C5'];
    const totalAllocated = analytics.allocated['C17'] + analytics.allocated['C130'] + analytics.allocated['C5'];
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
   * Set the current active section
   */
  setCurrentSection(sectionId: string): void {
    this.currentSectionSubject.next(sectionId);
  }

  /**
   * Get the current active section
   */
  getCurrentSection(): string {
    return this.currentSectionSubject.value;
  }

  /**
   * Check if a section is currently active
   */
  isSectionActive(sectionId: string): boolean {
    return this.getCurrentSection() === sectionId;
  }

  /**
   * Get the index of the current section for tab navigation
   */
  getCurrentSectionIndex(): number {
    const currentSection = this.getCurrentSection();
    return this.caocSections.findIndex(section => section.id === currentSection);
  }

  /**
   * Handle tab change in desktop mode
   */
  onTabChange(index: number): void {
    const section = this.caocSections[index];
    if (section) {
      this.setCurrentSection(section.id);
    }
  }

  /**
   * Open dialog to allocate aircraft to a MOB team
   */
  async onAllocateToMOB(): Promise<void> {
    if (!this.canAllocateAircraft) {
      this.snackBar.open('You do not have permission to allocate aircraft', 'Close', { duration: 3000 });
      return;
    }

    const availableAircraft = this.allocationSignalService.aircraftPool();
    const teams = this.mobTeams();

    if (availableAircraft.length === 0) {
      this.snackBar.open('No aircraft available in pool', 'Close', { duration: 3000 });
      return;
    }

    // For now, use a simple prompt - can be replaced with proper dialog later
    this.snackBar.open('Direct allocation UI: Select aircraft and MOB team', 'Close', { duration: 3000 });
  }


  /**
   * Get aircraft allocated to a specific team
   */
  getTeamAllocations(teamId: number): AircraftAllocation[] {
    return this.allocationsByTeam().get(teamId) || [];
  }
}

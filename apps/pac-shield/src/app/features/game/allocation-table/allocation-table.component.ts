import { Component, Input, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AllocationStateService } from '../../../shared/services/allocation-state.service';

interface AllocationTableRow {
  id: number;
  callSign: string;
  aircraftType: string;
  isAllocated: boolean;
  allocatedToTeamName: string | null;
  status: 'FMC' | 'DESTROYED';
}

interface Team {
  id: number;
  name: string;
}

/**
 * Allocation Table Component
 *
 * Displays aircraft allocation table with:
 * - Grouped aircraft by type (C-130 ARROW, C-17 MOOSE, C-5 BOSCO)
 * - Color-coded status (FMC=green, DESTROYED=red)
 * - Inline editing for CFACC/GM roles
 * - Read-only view for MOBs
 * - Real-time updates via WebSocket
 */
@Component({
  selector: 'app-allocation-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './allocation-table.component.html',
})
export class AllocationTableComponent implements OnInit {
  @Input() gameId: number | null = null;
  @Input() canEdit = false; // Set to true for CFACC/GM roles
  @Input() availableTeams: Team[] = [];

  private readonly allocationState = inject(AllocationStateService);

  // Direct signal access from service
  readonly loading = this.allocationState.loading;
  readonly error = this.allocationState.error;
  readonly c130Aircraft = this.allocationState.c130Aircraft;
  readonly c17Aircraft = this.allocationState.c17Aircraft;
  readonly c5Aircraft = this.allocationState.c5Aircraft;

  // Column definitions
  readonly displayedColumns = ['callSign', 'apportioned', 'allocated', 'status'];

  ngOnInit(): void {
    if (this.gameId) {
      this.loadAllocationTable();
    }
  }

  /**
   * Load allocation table data from the API
   */
  loadAllocationTable(): void {
    if (this.gameId) {
      this.allocationState.loadAllocationTable(this.gameId);
    }
  }

  /**
   * Handle aircraft allocation change
   */
  onAllocationChange(aircraftId: number, teamId: number | null): void {
    if (!this.canEdit) {
      return;
    }

    if (teamId === null) {
      // Deallocate aircraft
      this.allocationState.deallocateAircraft(aircraftId).subscribe({
        error: (err) => console.error('Failed to deallocate aircraft:', err)
      });
    } else {
      // Allocate aircraft to team
      this.allocationState.allocateAircraft(aircraftId, teamId).subscribe({
        error: (err) => console.error('Failed to allocate aircraft:', err)
      });
    }
  }

  /**
   * Get status color class
   */
  getStatusColorClass(status: string): string {
    switch (status) {
      case 'FMC':
        return 'md-sys-color-primary';
      case 'DESTROYED':
        return 'md-sys-color-error';
      default:
        return 'md-sys-color-on-surface-variant';
    }
  }

  /**
   * Get selected team ID for dropdown
   */
  getSelectedTeamId(row: AllocationTableRow): number | null {
    if (!row.isAllocated) {
      return null;
    }
    // Find team by name
    const team = this.availableTeams.find(t => t.name === row.allocatedToTeamName);
    return team?.id || null;
  }

  /**
   * Track by function for performance
   */
  trackByAircraftId(index: number, item: AllocationTableRow): number {
    return item.id;
  }
}

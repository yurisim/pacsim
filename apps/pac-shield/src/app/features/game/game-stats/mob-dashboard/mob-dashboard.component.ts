import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';

import { AllocationTableComponent } from '../../allocation-table/allocation-table.component';
import { AllocationStateService } from '../../../../shared/services/allocation-state.service';
import { TeamType } from '../../../../generated/enums';

/**
 * MOB dashboard - displays inventory and allocation status
 *
 * Features:
 * - Aircraft inventory and commodities display
 * - Real-time allocation updates from CAOC
 * - Integration with allocation state management
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
    AllocationTableComponent
  ],
  templateUrl: './mob-dashboard.component.html',
})
export class MobDashboardComponent implements OnInit, OnDestroy {
  // Input properties
  @Input() currentGameId: number | null = null;
  @Input() currentTurn = 1;
  @Input() currentUserTeam: TeamType | null = null;
  @Input() teamId: number | null = null;

  private readonly allocationState = inject(AllocationStateService);
  private readonly destroy$ = new Subject<void>();

  constructor() {
    // Component initialization
  }

  ngOnInit(): void {
    // Load allocation table data
    if (this.currentGameId) {
      this.allocationState.loadAllocationTable(this.currentGameId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

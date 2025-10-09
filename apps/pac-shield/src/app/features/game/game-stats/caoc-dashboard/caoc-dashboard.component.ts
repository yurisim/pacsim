import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Subject } from 'rxjs';

import { AllocationStateService } from '../../../../shared/services/allocation-state.service';
import { AllocationTableComponent } from '../../allocation-table/allocation-table.component';
import { TeamType, PlayerRole } from '../../../../generated/enums';

/**
 * CAOC dashboard with CFACC aircraft allocation interface
 *
 * Features:
 * - Aircraft pool management and availability tracking
 * - Direct allocation to MOB teams
 * - Real-time updates via WebSocket integration
 * - Role-based access control for CFACC operations
 *
 * Note: Simplified allocation system - no requests or cycles
 * This is a temporary stub while the full CAOC dashboard is redesigned
 */
@Component({
  selector: 'app-caoc-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    AllocationTableComponent
  ],
  templateUrl: './caoc-dashboard.component.html',
})
export class CaocDashboardComponent implements OnInit, OnDestroy {
  @Input() currentUserTeam: TeamType | null = null;
  @Input() currentUserRole: PlayerRole | null = null;
  @Input() currentGameId: number | null = null;
  @Input() currentTurn = 1;
  @Input() readonly = false;

  private readonly allocationStateService = inject(AllocationStateService);
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    if (this.currentGameId) {
      this.allocationStateService.loadAllocationTable(this.currentGameId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

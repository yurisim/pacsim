import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';

import { AllocationWebSocketService } from '../../../../shared/services/allocation-websocket.service';
import { TeamType } from '../../../../generated/enums';

/**
 * MOB dashboard - displays inventory and allocation status
 *
 * Features:
 * - Aircraft inventory and commodities display
 * - Real-time allocation updates from CAOC
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
    MatChipsModule
  ],
  templateUrl: './mob-dashboard.component.html',
})
export class MobDashboardComponent implements OnInit, OnDestroy {
  // Input properties
  @Input() currentGameId: number | null = null;
  @Input() currentTurn = 1;
  @Input() currentUserTeam: TeamType | null = null;
  @Input() teamId: number | null = null;

  private readonly store = inject(Store);
  private readonly webSocketService = inject(AllocationWebSocketService);
  private readonly destroy$ = new Subject<void>();

  constructor() {
    // Component initialization
  }

  ngOnInit(): void {
    // Initialize WebSocket connection for real-time allocation updates
    if (this.currentGameId && this.teamId) {
      this.webSocketService.connect({
        gameId: this.currentGameId,
        teamId: this.teamId,
        reconnect: true
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.webSocketService.disconnect();
  }
}

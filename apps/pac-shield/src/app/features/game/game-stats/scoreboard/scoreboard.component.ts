import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, Observable } from 'rxjs';
import { AppState } from '../../../../core/store/app.state';
import {
  selectBlock,
  selectDay,
  selectTurn,
  selectPhaseLabel,
  selectVictoryProgress,
  selectMissionPoints,
  selectDemoralizationPoints,
  selectResourcePoints,
  selectVictoryTarget
} from '../../../../core/store/game/game.selectors';
import * as GameActions from '../../../../core/store/game/game.actions';
import { WebSocketService } from '../../../../shared/services/websocket.service';
import { AuthService } from '../../../../shared/services/auth.service';

/**
 * Scoreboard with MPs, DPs, RPs and victory progress.
 * Now also shows Block, Day, Turn, Phase wired to NgRx + WebSocket updates.
 */
@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressBarModule, MatDividerModule],
  templateUrl: './scoreboard.component.html',
})
export class ScoreboardComponent implements OnInit, OnDestroy {
  // Store-backed observables for scoreboard metrics
  missionPoints$!: Observable<number | null>;
  demoralizationPoints$!: Observable<number | null>;
  resourcePoints$!: Observable<number | null>;
  victoryTarget$!: Observable<number | null>;

  // Header fields (derived from store)
  gameDay: number | null = null;
  gameTurn: number | null = null;
  gamePhase = '';

  // Derived from store
  gameBlock: number | null = null;

  // Victory progress from server (0..100)
  victoryProgress = 0;

  private store = inject(Store<AppState>);
  private websocket = inject(WebSocketService);
  private auth = inject(AuthService);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Resolve current gameId similar to TopBar
    const gameId = this.auth.getGameId();
    // TODO: If JWT not available, consider parsing from current route param or shared context
    if (!gameId) {
      return;
    }

    // Ensure WS is connected to the /game namespace for this game (reuses connection if already connected)
    this.websocket.connectToGameNamespace(gameId);

    // Load initial status via REST and start WS listening via effects
    this.store.dispatch(GameActions.loadGameStatus({ gameId }));

    // Bind scoreboard metrics
    this.missionPoints$ = this.store.select(selectMissionPoints);
    this.demoralizationPoints$ = this.store.select(selectDemoralizationPoints);
    this.resourcePoints$ = this.store.select(selectResourcePoints);
    this.victoryTarget$ = this.store.select(selectVictoryTarget);

    // Bind store selectors to component fields
    this.store.select(selectBlock).pipe(takeUntil(this.destroy$)).subscribe(v => (this.gameBlock = v ?? null));
    this.store.select(selectDay).pipe(takeUntil(this.destroy$)).subscribe(v => (this.gameDay = v ?? null));
    this.store.select(selectTurn).pipe(takeUntil(this.destroy$)).subscribe(v => (this.gameTurn = v ?? null));
    this.store.select(selectPhaseLabel).pipe(takeUntil(this.destroy$)).subscribe(v => (this.gamePhase = v || ''));
    this.store.select(selectVictoryProgress).pipe(takeUntil(this.destroy$)).subscribe(v => (this.victoryProgress = v ?? 0));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

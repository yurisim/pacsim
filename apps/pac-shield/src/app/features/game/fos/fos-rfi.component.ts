import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorAlertComponent } from '../../../shared/components/error-alert/error-alert.component';
import { FosRfiService, FosRfiEntry } from './fos-rfi.service';
import { PlayerRoleService } from '../../../shared/services/player-role.service';

/**
 * Standalone presentational component that renders the 10 RFIs for a FOS.
 * Behavior:
 * - If fosId present: load /fos/:id/rfi (editable when canEdit).
 * - Else (pre-activation): load /fos/game/:gameId/rfi?displayNumber=X (read-only).
 * - Post answer requires fosId & canEdit.
 */
@Component({
  selector: 'app-fos-rfi',
  standalone: true,
  imports: [
    CommonModule,
    MatDividerModule,
    MatChipsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    ErrorAlertComponent,
  ],
  templateUrl: './fos-rfi.component.html',
})
export class FosRfiComponent implements OnChanges {
  @Input() fosId?: string | null;
  @Input() fosDisplayNumber!: number | null;
  @Input() gameId!: number | null;
  @Input() canEdit = false;
  @Input() isFullyAssessed = false;

  private rfi = inject(FosRfiService);
  private snack = inject(MatSnackBar);
  private playerRole = inject(PlayerRoleService);

  isLoading = false;
  errorMsg: string | null = null;

  // Canonical 10 RFIs (keys must match backend expectations)
  readonly rfiKeys: string[] = [
    'CFR', 'Mobility', 'Ramp', 'ATC', 'Equipment',
    'Bed Down', 'Fuel', 'Security', 'Community', 'Medical'
  ];

  data: Record<string, FosRfiEntry> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fosId'] || changes['fosDisplayNumber'] || changes['gameId']) {
      this.load();
    }
  }

  private load(): void {
    this.errorMsg = null;
    this.isLoading = true;

    const fosId = this.fosId ?? undefined;
    const dn = this.fosDisplayNumber ?? undefined;
    const gid = this.gameId ?? undefined;

    const done = () => (this.isLoading = false);

    if (fosId) {
      this.rfi.getByFosId(fosId).subscribe({
        next: (list) => {
          this.hydrate(list);
          done();
        },
        error: (err) => {
          console.error('RFI load failed (by fosId):', err);
          this.errorMsg = 'Failed to load RFI data';
          done();
        },
      });
      return;
    }

    if (gid && dn) {
      this.rfi.getByDisplayNumber(gid, dn).subscribe({
        next: (list) => {
          this.hydrate(list);
          done();
        },
        error: (err) => {
          console.error('RFI load failed (by displayNumber):', err);
          this.errorMsg = 'Failed to load RFI data';
          done();
        },
      });
      return;
    }

    // Neither fosId nor (gameId+dn) available
    this.data = {};
    this.isLoading = false;
  }

  private hydrate(list: FosRfiEntry[]): void {
    const map: Record<string, FosRfiEntry> = {};
    for (const key of this.rfiKeys) {
      map[key] = { rfiKey: key, rfiValue: null };
    }
    for (const entry of list || []) {
      if (entry?.rfiKey) {
        map[entry.rfiKey] = entry;
      }
    }
    this.data = map;
  }

  answeredValue(key: string): number | null {
    const v = this.data[key]?.rfiValue;
    return typeof v === 'number' ? v : null;
  }

  /**
   * Count how many RFIs have been answered
   */
  get answeredCount(): number {
    return this.rfiKeys.filter(key => this.answeredValue(key) !== null).length;
  }

  /**
   * Determine if a dice roll is allowed for a specific RFI key
   * Rules:
   * - If already answered: can re-roll
   * - If fully assessed: can roll any RFI
   * - If not fully assessed: can only roll if less than 5 RFIs have been answered
   */
  canRollDice(key: string): boolean {
    // Already answered RFIs can be re-rolled
    if (this.answeredValue(key) !== null) {
      return true;
    }

    // If fully assessed, all RFIs can be rolled
    if (this.isFullyAssessed) {
      return true;
    }

    // If not fully assessed, only allow if less than 5 answered
    return this.answeredCount < 5;
  }

  /**
   * Get tooltip text for dice button explaining why it might be disabled
   */
  getDiceTooltip(key: string): string {
    if (this.canRollDice(key)) {
      return `Roll dice for ${key}`;
    }
    return `Full assessment required to roll remaining RFIs (${this.answeredCount}/5 initial rolls used)`;
  }

  /**
   * Get the assessment status text for display
   */
  get assessmentStatusText(): string {
    if (this.isFullyAssessed) {
      return 'Full Assessment';
    }
    return `Initial Assessment (${this.answeredCount}/5 rolls)`;
  }

  canAnswer(): boolean {
    // GM-only editing policy
    return !!this.fosId && this.canEdit && this.isGameMaster();
  }

  isGameMaster(): boolean {
    return this.playerRole.isCurrentPlayerGameMaster();
  }

  setAnswer(key: string, value: number): void {
    if (!this.canAnswer()) return;
    const fosId = this.fosId!;
    this.isLoading = true;
    this.rfi.upsertAnswer(fosId, key, value).subscribe({
      next: (updated) => {
        this.hydrate(updated);
        this.isLoading = false;
        this.snack.open('RFI saved', 'Close', { duration: 2000 });
      },
      error: (err) => {
        console.error('RFI save failed:', err);
        this.errorMsg = 'Failed to save RFI answer';
        this.isLoading = false;
      },
    });
  }

  rollDice(key: string): void {
    console.log(`[DICE DEBUG] Frontend rollDice called for key: ${key}`);

    if (!this.canAnswer() || !this.isGameMaster()) {
      console.log(`[DICE DEBUG] Cannot answer - canAnswer: ${this.canAnswer()}, isGM: ${this.isGameMaster()}`);
      return;
    }

    // Check if dice roll is allowed based on assessment status
    if (!this.canRollDice(key)) {
      this.snack.open(
        `Cannot roll dice: Full assessment required (${this.answeredCount}/5 initial rolls used)`,
        'Close',
        { duration: 4000 }
      );
      return;
    }

    const fosId = this.fosId!;
    console.log(`[DICE DEBUG] Starting dice roll for FOS ID: ${fosId}, RFI key: ${key}`);

    this.isLoading = true;

    this.rfi.rollDice(fosId, key).subscribe({
      next: (updated) => {
        console.log(`[DICE DEBUG] Dice roll API response received:`, updated);
        this.hydrate(updated);
        this.isLoading = false;
        const rolledValue = this.answeredValue(key);
        console.log(`[DICE DEBUG] Rolled value extracted: ${rolledValue} for key: ${key}`);
        this.snack.open(`Dice rolled: ${rolledValue} for ${key}`, 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('[DICE DEBUG] Dice roll failed:', err);
        const errorMessage = err?.error?.message || 'Failed to roll dice';
        this.errorMsg = errorMessage;
        this.snack.open(errorMessage, 'Close', { duration: 4000 });
        this.isLoading = false;
      },
    });
  }
}

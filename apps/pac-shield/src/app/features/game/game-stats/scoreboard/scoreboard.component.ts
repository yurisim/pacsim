import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

/**
 * Scoreboard with MPs, DPs, RPs and victory progress.
 */
@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressBarModule, MatDividerModule],
  templateUrl: './scoreboard.component.html',
})
export class ScoreboardComponent {
  @Input() missionPoints = 0;
  @Input() demoralizationPoints = 0;
  @Input() resourcePoints = 0;
  @Input() victoryTarget = 100;
  @Input() gameTurn = 1;
  @Input() gameDay = 1;
  @Input() gamePhase: 'CRISIS' | 'CONFLICT' = 'CRISIS';

  get victoryProgress(): number {
    if (this.victoryTarget <= 0) return 0;
    return Math.max(0, Math.min(100, (this.missionPoints / this.victoryTarget) * 100));
    }
}
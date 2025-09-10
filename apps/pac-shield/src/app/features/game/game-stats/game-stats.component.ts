import { Component, inject, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStatsService } from './game-stats.service';
import { GameStatsConfig } from './game-stats.interfaces';

/**
 * Component Intent: Provides game statistics management and access for the game board.
 * 
 * This component serves as a facade for the GameStatsService, providing:
 * - Access to game statistics via signals
 * - Methods to update game state
 * - Demo data management for UI development
 * - Centralized state management for game metrics
 * 
 * The component is designed to be invisible (no UI) and acts as a data provider
 * for other components that need access to game statistics.
 */
@Component({
  selector: 'app-game-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- This component is a data provider with no visual representation -->
    <ng-content></ng-content>
  `,
  styles: [`:host { display: contents; }`]
})
export class GameStatsComponent implements OnInit {
  @Input() config: GameStatsConfig = {};
  @Input() loadDemoData = true;

  private gameStatsService = inject(GameStatsService);

  // Expose service signals as public properties
  readonly gameStats = this.gameStatsService.gameStats;
  readonly atoLines = this.gameStatsService.atoLines;
  readonly gameAssets = this.gameStatsService.gameAssets;
  readonly gameLog = this.gameStatsService.gameLog;
  readonly totalScore = this.gameStatsService.totalScore;
  readonly victoryProgress = this.gameStatsService.victoryProgress;
  readonly isVictory = this.gameStatsService.isVictory;
  readonly currentTurnLabel = this.gameStatsService.currentTurnLabel;

  ngOnInit(): void {
    // Load demo data if requested (for development)
    if (this.loadDemoData) {
      this.gameStatsService.loadDemoData();
    }
  }

  /**
   * Get current game statistics
   */
  getStats() {
    return this.gameStats();
  }

  /**
   * Get current ATO lines
   */
  getAtoLines() {
    return this.atoLines();
  }

  /**
   * Get current game assets
   */
  getGameAssets() {
    return this.gameAssets();
  }

  /**
   * Get formatted game log
   */
  getFormattedLog(): string[] {
    return this.gameStatsService.getFormattedLog();
  }

  /**
   * Update mission points
   */
  addMissionPoints(points: number): void {
    this.gameStatsService.addMissionPoints(points);
  }

  /**
   * Update demoralization points
   */
  addDemoralizationPoints(points: number): void {
    this.gameStatsService.addDemoralizationPoints(points);
  }

  /**
   * Update resource points
   */
  updateResourcePoints(points: number): void {
    this.gameStatsService.updateResourcePoints(points);
  }

  /**
   * Advance game turn
   */
  advanceTurn(): void {
    this.gameStatsService.advanceTurn();
  }

  /**
   * Reset game statistics
   */
  resetStats(): void {
    this.gameStatsService.resetStats();
  }
}

import { Component, inject, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { GameStatsService } from './game-stats.service';
import { ResponsiveNavService } from './responsive-nav.service';
import { GameStatsConfig } from './game-stats.interfaces';
import { ScoreboardComponent } from './scoreboard/scoreboard.component';
import { CaocDashboardComponent } from './caoc-dashboard/caoc-dashboard.component';
import { AtoTableComponent } from './ato-table/ato-table.component';
import { MobDashboardComponent } from './mob-dashboard/mob-dashboard.component';
import { FosDashboardComponent } from './fos-dashboard/fos-dashboard.component';
import { CspocBoardComponent } from './cspoc-board/cspoc-board.component';
import { MedcomDashboardComponent } from './medcom-dashboard/medcom-dashboard.component';
import { GameLogComponent } from './game-log/game-log.component';
import { ResponsiveNavComponent } from './responsive-nav/responsive-nav.component';
import { TeamType, PlayerRole } from '../../../generated/enums';

/**
 * Component Intent: Game statistics UI container that renders tabs with game dashboards.
 *
 * This component now serves as the UI container for game statistics, providing:
 * - Tabbed interface for different game dashboards (Score, CAOC, MOB, FOS, etc.)
 * - Access to game statistics via signals
 * - Methods to update game state
 * - Demo data management for UI development
 * - Centralized state management for game metrics
 */
@Component({
  selector: 'app-game-stats',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDividerModule,
    ResponsiveNavComponent,
    ScoreboardComponent,
    CaocDashboardComponent,
    AtoTableComponent,
    MobDashboardComponent,
    FosDashboardComponent,
    CspocBoardComponent,
    MedcomDashboardComponent,
    GameLogComponent
  ],
  templateUrl: './game-stats.component.html',
  styleUrls: ['./game-stats.component.scss']
})
export class GameStatsComponent implements OnInit {
  @Input() config: GameStatsConfig = {};
  @Input() loadDemoData = true;
  @Input() currentGameId: number | null = null;
  @Input() currentUserTeam: TeamType | null = null;
  @Input() currentUserRole: PlayerRole | null = null;
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  navService = inject(ResponsiveNavService);
  gameStatsService = inject(GameStatsService);

  activeTab$ = this.navService.activeTab$;

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

  onTabChange(tabId: string): void {
    this.navService.setActiveTab(tabId);
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
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

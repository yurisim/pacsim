import { Component, inject, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
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
import { PoliticalAccessComponent } from '../political-access/political-access.component';
import { TeamType, PlayerRole } from '../../../generated/enums';
import { AllocationSignalService } from '../../../shared/services/allocation-signal.service';

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
    GameLogComponent,
    PoliticalAccessComponent
  ],
  templateUrl: './game-stats.component.html',
  styleUrls: ['./game-stats.component.scss']
})
export class GameStatsComponent implements OnInit, OnChanges {
  @Input() config: GameStatsConfig = {};
  @Input() loadDemoData = true;
  @Input() currentGameId: number | null = null;
  @Input() currentUserTeam: TeamType | null = null;
  @Input() currentUserRole: PlayerRole | null = null;
  @Input() collapsed = true;
  @Output() collapsedChange = new EventEmitter<boolean>();

  navService = inject(ResponsiveNavService);
  gameStatsService = inject(GameStatsService);
  allocationSignalService = inject(AllocationSignalService);
  private breakpointObserver = inject(BreakpointObserver);

  activeTab$ = this.navService.activeTab$;

  /**
   * Computed signal for allocated aircraft for the current team
   * Returns array of aircraft instances allocated to the team
   */
  allocatedAircraft = computed(() => {
    const teamId = this.getTeamId();
    if (!teamId) {
      return [];
    }
    return this.allocationSignalService.getAllocatedAircraftForTeam(teamId);
  });

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
    // Set initial collapsed state based on screen size (desktop starts expanded)
    this.breakpointObserver.observe('(min-width: 768px)').subscribe(result => {
      // Only set initial state if collapsed hasn't been manually changed
      if (this.collapsed === true) {
        this.collapsed = !result.matches; // Desktop (≥768px) = false (expanded), Mobile (<768px) = true (collapsed)
      }
    });

    // Load demo data if requested (for development)
    if (this.loadDemoData) {
      this.gameStatsService.loadDemoData();
    }

    // Update navigation based on user role
    this.updateNavigation();

    // Initialize allocation signal service for this game
    if (this.currentGameId) {
      this.allocationSignalService.initializeForGame(this.currentGameId);
      // Load game score from backend
      this.gameStatsService.loadGameScore(this.currentGameId);
    }
  }

  // Computed property to check if user is GM
  get isGameMaster(): boolean {
    return this.currentUserRole === 'GM';
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update navigation when user role changes
    if (changes['currentUserRole']) {
      this.updateNavigation();
    }

    // Re-initialize allocation service and reload game score when game ID changes
    if (changes['currentGameId'] && this.currentGameId) {
      this.allocationSignalService.initializeForGame(this.currentGameId);
      this.gameStatsService.loadGameScore(this.currentGameId);
    }
  }

  private updateNavigation(): void {
    this.navService.updateNavigationForRole(this.isGameMaster);
  }

  onTabChange(tabId: string): void {
    this.navService.setActiveTab(tabId);
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  /**
   * Get team ID for current user
   * TODO: This should be passed from parent component that has access to game state
   */
  getTeamId(): number {
    // For now, return a default team ID
    // In production, this should come from the game state/player data
    return 1;
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

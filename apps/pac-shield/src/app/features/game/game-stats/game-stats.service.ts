import { Injectable, signal, computed } from '@angular/core';
import {
  GameStats,
  GamePhase,
  AtoLine,
  GameAsset,
  GameLogEntry,
  LogType
} from './game-stats.interfaces';

/**
 * Service Intent: Manages game statistics and demo data state.
 *
 * This service provides:
 * - Centralized game statistics management
 * - Demo data for UI development
 * - Reactive state management using Angular signals
 * - Methods for updating game metrics
 * - Game log management
 *
 * Future: This service will integrate with the actual game engine
 * and receive real-time updates from the backend.
 */
@Injectable({
  providedIn: 'root'
})
export class GameStatsService {
  // Core game statistics
  private readonly _gameStats = signal<GameStats>({
    missionPoints: 12,
    demoralizationPoints: 3,
    resourcePoints: 2,
    victoryTarget: 100,
    gameTurn: 1,
    gameDay: 1,
    gamePhase: 'CRISIS'
  });

  // ATO lines
  private readonly _atoLines = signal<AtoLine[]>([
    {
      callSign: 'KAD-01',
      type: 'C-17',
      origin: 'Kadena',
      destination: 'FOS 7',
      intent: 'Cargo',
      pprStatus: 'Pending'
    },
    {
      callSign: 'AND-22',
      type: 'F-22',
      origin: 'Andersen',
      destination: 'Hex 407',
      intent: 'CAP',
      pprStatus: 'Approved'
    }
  ]);

  // Game assets
  private readonly _gameAssets = signal<GameAsset[]>([
    { id: 'a1', type: 'F-22', strength: 20, location: 'Andersen', status: 'Operational' },
    { id: 'a2', type: 'C-17', range: 4, location: 'Kadena', status: 'Landed' },
    { id: 'a3', type: 'Personnel - Refueling', location: 'FOS 7', status: 'On Task' },
    { id: 'a4', type: 'PLA Threat 12', strength: 12, location: 'Hex 407', status: 'Detected' },
  ]);

  // Game log
  private readonly _gameLog = signal<GameLogEntry[]>([
    {
      timestamp: new Date(),
      message: 'Game created and players joined',
      type: 'info'
    },
    {
      timestamp: new Date(),
      message: 'Base access update: Philippines → Overflight Only',
      type: 'warning'
    },
    {
      timestamp: new Date(),
      message: 'ATO line KAD-01 submitted',
      type: 'action'
    }
  ]);

  // Public readonly signals
  readonly gameStats = this._gameStats.asReadonly();
  readonly atoLines = this._atoLines.asReadonly();
  readonly gameAssets = this._gameAssets.asReadonly();
  readonly gameLog = this._gameLog.asReadonly();

  // Computed values
  readonly totalScore = computed(() => {
    const stats = this._gameStats();
    return stats.missionPoints - stats.demoralizationPoints;
  });

  readonly victoryProgress = computed(() => {
    const stats = this._gameStats();
    const score = stats.missionPoints - stats.demoralizationPoints;
    return Math.max(0, Math.min(100, (score / stats.victoryTarget) * 100));
  });

  readonly isVictory = computed(() => {
    const stats = this._gameStats();
    const score = stats.missionPoints - stats.demoralizationPoints;
    return score >= stats.victoryTarget;
  });

  readonly currentTurnLabel = computed(() => {
    const stats = this._gameStats();
    return `Turn ${stats.gameTurn}, Day ${stats.gameDay}`;
  });

  /**
   * Update game statistics
   */
  updateGameStats(updates: Partial<GameStats>): void {
    this._gameStats.update(stats => ({ ...stats, ...updates }));
    this.addLogEntry(`Game stats updated: ${JSON.stringify(updates)}`, 'info');
  }

  /**
   * Add mission points
   */
  addMissionPoints(points: number): void {
    this._gameStats.update(stats => ({
      ...stats,
      missionPoints: stats.missionPoints + points
    }));
    this.addLogEntry(`Earned ${points} mission points`, 'success');
  }

  /**
   * Add demoralization points
   */
  addDemoralizationPoints(points: number): void {
    this._gameStats.update(stats => ({
      ...stats,
      demoralizationPoints: stats.demoralizationPoints + points
    }));
    this.addLogEntry(`Received ${points} demoralization points`, 'warning');
  }

  /**
   * Update resource points
   */
  updateResourcePoints(points: number): void {
    this._gameStats.update(stats => ({
      ...stats,
      resourcePoints: Math.max(0, points)
    }));
  }

  /**
   * Advance to next turn
   */
  advanceTurn(): void {
    this._gameStats.update(stats => ({
      ...stats,
      gameTurn: stats.gameTurn + 1,
      gameDay: Math.floor((stats.gameTurn + 1) / 3) + 1 // Assuming 3 turns per day
    }));

    const newStats = this._gameStats();
    this.addLogEntry(`Advanced to ${this.currentTurnLabel()}`, 'info');

    // Check for phase transitions
    this.checkPhaseTransition();
  }

  /**
   * Change game phase
   */
  changePhase(phase: GamePhase): void {
    this._gameStats.update(stats => ({ ...stats, gamePhase: phase }));
    this.addLogEntry(`Game phase changed to ${phase}`, 'info');
  }

  /**
   * Add an ATO line
   */
  addAtoLine(atoLine: AtoLine): void {
    this._atoLines.update(lines => [...lines, atoLine]);
    this.addLogEntry(`ATO line ${atoLine.callSign} added`, 'action');
  }

  /**
   * Update ATO line status
   */
  updateAtoLineStatus(callSign: string, status: AtoLine['pprStatus']): void {
    this._atoLines.update(lines =>
      lines.map(line =>
        line.callSign === callSign
          ? { ...line, pprStatus: status }
          : line
      )
    );
    this.addLogEntry(`ATO line ${callSign} status updated to ${status}`, 'action');
  }

  /**
   * Remove an ATO line
   */
  removeAtoLine(callSign: string): void {
    this._atoLines.update(lines => lines.filter(line => line.callSign !== callSign));
    this.addLogEntry(`ATO line ${callSign} removed`, 'action');
  }

  /**
   * Add a game asset
   */
  addGameAsset(asset: GameAsset): void {
    this._gameAssets.update(assets => [...assets, asset]);
    this.addLogEntry(`Asset ${asset.type} added at ${asset.location}`, 'info');
  }

  /**
   * Update asset status
   */
  updateAssetStatus(assetId: string, status: GameAsset['status']): void {
    this._gameAssets.update(assets =>
      assets.map(asset =>
        asset.id === assetId
          ? { ...asset, status }
          : asset
      )
    );

    const asset = this._gameAssets().find(a => a.id === assetId);
    if (asset) {
      const logType: LogType = status === 'Destroyed' ? 'error' :
        status === 'Damaged' ? 'warning' : 'info';
      this.addLogEntry(`Asset ${asset.type} status changed to ${status}`, logType);
    }
  }

  /**
   * Move an asset to a new location
   */
  moveAsset(assetId: string, newLocation: string): void {
    this._gameAssets.update(assets =>
      assets.map(asset =>
        asset.id === assetId
          ? { ...asset, location: newLocation, status: 'In Transit' }
          : asset
      )
    );

    const asset = this._gameAssets().find(a => a.id === assetId);
    if (asset) {
      this.addLogEntry(`Asset ${asset.type} moving to ${newLocation}`, 'action');
    }
  }

  /**
   * Add a log entry
   */
  addLogEntry(message: string, type: LogType = 'info', metadata?: Record<string, any>): void {
    const entry: GameLogEntry = {
      timestamp: new Date(),
      message,
      type,
      metadata
    };

    this._gameLog.update(log => [...log, entry]);
  }

  /**
   * Clear the game log
   */
  clearLog(): void {
    this._gameLog.set([]);
  }

  /**
   * Get formatted log messages
   */
  getFormattedLog(): string[] {
    return this._gameLog().map(entry => entry.message);
  }

  /**
   * Reset all game statistics to initial values
   */
  resetStats(): void {
    this._gameStats.set({
      missionPoints: 0,
      demoralizationPoints: 0,
      resourcePoints: 10,
      victoryTarget: 100,
      gameTurn: 1,
      gameDay: 1,
      gamePhase: 'CRISIS'
    });

    this.addLogEntry('Game statistics reset', 'info');
  }

  /**
   * Load demo data (for development)
   */
  loadDemoData(): void {
    this._gameStats.set({
      missionPoints: 12,
      demoralizationPoints: 3,
      resourcePoints: 2,
      victoryTarget: 100,
      gameTurn: 1,
      gameDay: 1,
      gamePhase: 'CRISIS'
    });

    this.addLogEntry('Demo data loaded', 'info');
  }

  /**
   * Check and handle phase transitions
   */
  private checkPhaseTransition(): void {
    const stats = this._gameStats();

    // Example phase transition logic
    if (stats.gamePhase === 'CRISIS' && stats.gameTurn >= 5) {
      this.changePhase('CONFLICT');
    }
  }
}

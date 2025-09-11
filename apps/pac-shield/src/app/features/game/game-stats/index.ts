/**
 * Barrel export for GameStatsComponent and related types
 * 
 * This file provides a convenient way to import the component, service,
 * and interfaces from a single location.
 */

export { GameStatsComponent } from './game-stats.component';
export { GameStatsService } from './game-stats.service';
export type {
  GameStats,
  GamePhase,
  AtoLine,
  GameAsset,
  AssetStatus,
  GameLogEntry,
  LogType,
  GameStatsConfig
} from './game-stats.interfaces';

/**
 * Interfaces for Game Statistics Management
 *
 * These interfaces define the data structures for tracking game state,
 * including scores, turns, and various game metrics.
 */

/**
 * Main game statistics interface
 */
export interface GameStats {
  /** Mission points earned by completing objectives */
  missionPoints: number;
  /** Demoralization points (negative score) */
  demoralizationPoints: number;
  /** Resource points available for operations */
  resourcePoints: number;
  /** Target score needed for victory */
  victoryTarget: number;
  /** Current game turn number */
  gameTurn: number;
  /** Current game day */
  gameDay: number;
  /** Current game phase */
  gamePhase: GamePhase;
}

/**
 * Game phase enumeration
 */
export type GamePhase = 'CRISIS' | 'CONFLICT';

/**
 * ATO (Air Tasking Order) line item
 */
export interface AtoLine {
  /** Unique call sign for the mission */
  callSign: string;
  /** Aircraft type */
  type: string;
  /** Origin location */
  origin: string;
  /** Destination location */
  destination: string;
  /** Mission intent/purpose */
  intent: string;
  /** PPR (Prior Permission Required) status */
  pprStatus: 'Pending' | 'Approved' | 'Denied';
}

/**
 * Game asset representation
 */
export interface GameAsset {
  /** Unique asset identifier */
  id: string;
  /** Asset type (e.g., F-22, C-17, Personnel) */
  type: string;
  /** Asset strength/power level (optional) */
  strength?: number;
  /** Asset operational range (optional) */
  range?: number;
  /** Current location */
  location: string;
  /** Current operational status */
  status: AssetStatus;
}

/**
 * Asset operational status
 */
export type AssetStatus =
  | 'Operational'
  | 'Landed'
  | 'On Task'
  | 'Detected'
  | 'Damaged'
  | 'Destroyed'
  | 'In Transit'
  | 'Refueling';

/**
 * Game log entry
 */
export interface GameLogEntry {
  /** Timestamp of the log entry */
  timestamp: Date;
  /** Log message */
  message: string;
  /** Log severity/type */
  type: LogType;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Log entry type
 */
export type LogType = 'info' | 'warning' | 'error' | 'success' | 'action';

/**
 * Configuration for game stats display
 */
export interface GameStatsConfig {
  /** Show mission points */
  showMissionPoints?: boolean;
  /** Show demoralization points */
  showDemoralizationPoints?: boolean;
  /** Show resource points */
  showResourcePoints?: boolean;
  /** Show victory target */
  showVictoryTarget?: boolean;
  /** Show turn/day info */
  showTurnInfo?: boolean;
  /** Enable animations */
  enableAnimations?: boolean;
}

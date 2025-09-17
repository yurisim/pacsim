import { Game } from '../../../generated';

export interface GameState {
  game: Game | null;
  loading: boolean;
  error: string | null;

  // Top Bar fields
  block: number | null;
  day: number | null;
  turn: number | null;
  phase: 'CRISIS' | 'CONFLICT' | null;
  victoryProgress: number | null; // 0..100

  // Scoreboard fields (sourced from backend status + WS)
  missionPoints: number | null;
  demoralizationPoints: number | null;
  resourcePoints: number | null;
  victoryTarget: number | null;

  // Overall status for status endpoint
  status: 'idle' | 'loading' | 'loaded' | 'error';
}

export const initialGameState: GameState = {
  game: null,
  loading: false,
  error: null,

  block: null,
  day: null,
  turn: null,
  phase: null,
  victoryProgress: null,

  missionPoints: null,
  demoralizationPoints: null,
  resourcePoints: null,
  victoryTarget: null,

  status: 'idle',
};

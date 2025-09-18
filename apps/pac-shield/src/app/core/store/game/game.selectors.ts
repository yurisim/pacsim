import { createFeatureSelector, createSelector } from '@ngrx/store';
import { GameState } from './game.state';

export const selectGameState = createFeatureSelector<GameState>('game');

export const selectGame = createSelector(
  selectGameState,
  (state: GameState) => state.game
);

export const selectGameLoading = createSelector(
  selectGameState,
  (state: GameState) => state.loading
);

export const selectGameError = createSelector(
  selectGameState,
  (state: GameState) => state.error
);


// ===== Top Bar selectors =====
export const selectBlock = createSelector(selectGameState, (state: GameState) => state.block);
export const selectDay = createSelector(selectGameState, (state: GameState) => state.day);
export const selectTurn = createSelector(selectGameState, (state: GameState) => state.turn);
export const selectPhase = createSelector(selectGameState, (state: GameState) => state.phase);
export const selectVictoryProgress = createSelector(
  selectGameState,
  (state: GameState) => state.victoryProgress
);

export const selectPhaseLabel = createSelector(selectPhase, (phase): string => {
  if (phase === 'CRISIS') return 'Crisis';
  if (phase === 'CONFLICT') return 'Conflict';
  return '';
});

export const selectTopBarModel = createSelector(
  selectBlock,
  selectDay,
  selectTurn,
  selectPhaseLabel,
  selectVictoryProgress,
  (block, day, turn, phaseLabel, victoryProgress) => ({
    block,
    day,
    turn,
    phaseLabel,
    victoryProgress,
  })
);

// ===== Scoreboard selectors =====
export const selectMissionPoints = createSelector(
  selectGameState,
  (state: GameState) => state.missionPoints
);

export const selectDemoralizationPoints = createSelector(
  selectGameState,
  (state: GameState) => state.demoralizationPoints
);

export const selectResourcePoints = createSelector(
  selectGameState,
  (state: GameState) => state.resourcePoints
);

export const selectVictoryTarget = createSelector(
  selectGameState,
  (state: GameState) => state.victoryTarget
);

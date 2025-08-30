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

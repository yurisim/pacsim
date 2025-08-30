import { createReducer, on } from '@ngrx/store';
import { initialGameState } from './game.state';
import * as GameActions from './game.actions';

export const gameReducer = createReducer(
  initialGameState,
  on(GameActions.loadGameByRoomCode, GameActions.loadGameById, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(GameActions.loadGameSuccess, (state, { game }) => ({
    ...state,
    game,
    loading: false,
  })),
  on(GameActions.loadGameFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);

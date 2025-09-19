import { createReducer, on } from '@ngrx/store';
import { initialGameState } from './game.state';
import * as GameActions from './game.actions';

export const gameReducer = createReducer(
  initialGameState,

  // Existing game load
  on(GameActions.loadGameByRoomCode, GameActions.loadGameById, (state) => ({
    ...state,
    loading: true,
    error: null as string | null,
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
  })),

  // Top Bar status lifecycle
  on(GameActions.loadGameStatus, (state) => ({
    ...state,
    status: 'loading',
    error: null as string | null,
  })),
  on(GameActions.loadGameStatusSuccess, (state, { payload }) => ({
    ...state,
    block: payload.block,
    day: payload.day,
    turn: payload.turn,
    phase: payload.phase,
    victoryProgress: payload.victoryProgress,
    missionPoints: payload.missionPoints,
    demoralizationPoints: payload.demoralizationPoints,
    resourcePoints: payload.resourcePoints,
    victoryTarget: payload.victoryTarget,
    status: 'loaded',
  })),
  on(GameActions.loadGameStatusFailure, (state, { error }) => ({
    ...state,
    status: 'error',
    error,
  })),

  // WebSocket updates merge into same fields
  on(GameActions.gameStateUpdatedViaWs, (state, { payload }) => ({
    ...state,
    block: payload.block,
    day: payload.day,
    turn: payload.turn,
    phase: payload.phase,
    victoryProgress: payload.victoryProgress,
    missionPoints: payload.missionPoints,
    demoralizationPoints: payload.demoralizationPoints,
    resourcePoints: payload.resourcePoints,
    victoryTarget: payload.victoryTarget,
  }))
);

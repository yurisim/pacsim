import { createAction, props } from '@ngrx/store';
import { Game } from '../../../generated';

/**
 * Existing game load actions
 */
export const loadGameByRoomCode = createAction('[Game] Load Game by Room Code', props<{ roomCode: string }>());
export const loadGameById = createAction('[Game] Load Game by ID', props<{ gameId: string }>());

export const loadGameSuccess = createAction('[Game] Load Game Success', props<{ game: Game }>());
export const loadGameFailure = createAction('[Game] Load Game Failure', props<{ error: string }>());

/**
 * Top Bar status actions
 */
export const loadGameStatus = createAction('[Game] Load Game Status', props<{ gameId: string }>());

export const loadGameStatusSuccess = createAction(
  '[Game] Load Game Status Success',
  props<{
    payload: {
      block: number;
      day: number;
      turn: number;
      phase: 'CRISIS' | 'CONFLICT';
      victoryProgress: number;
      missionPoints: number;
      demoralizationPoints: number;
      resourcePoints: number;
      victoryTarget: number;
    };
  }>()
);

export const loadGameStatusFailure = createAction(
  '[Game] Load Game Status Failure',
  props<{ error: string }>()
);

/**
 * WebSocket: server→client 'gameStateUpdated'
 */
export const gameStateUpdatedViaWs = createAction(
  '[Game] Game State Updated (WS)',
  props<{
    payload: {
      block: number;
      day: number;
      turn: number;
      phase: 'CRISIS' | 'CONFLICT';
      victoryProgress: number;
      missionPoints: number;
      demoralizationPoints: number;
      resourcePoints: number;
      victoryTarget: number;
    };
  }>()
);

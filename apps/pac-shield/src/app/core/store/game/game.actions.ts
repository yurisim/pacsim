import { createAction, props } from '@ngrx/store';
import { Game } from '../../../shared/models/generated';

export const loadGameByRoomCode = createAction('[Game] Load Game by Room Code', props<{ roomCode: string }>());
export const loadGameById = createAction('[Game] Load Game by ID', props<{ gameId: string }>());

export const loadGameSuccess = createAction('[Game] Load Game Success', props<{ game: Game }>());
export const loadGameFailure = createAction('[Game] Load Game Failure', props<{ error: string }>());

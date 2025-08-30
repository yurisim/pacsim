import { createAction, props } from '@ngrx/store';
import { Game } from '../../../shared/models/generated';

export const loadGame = createAction('[Game] Load Game', props<{ roomCode: string }>());
export const loadGameSuccess = createAction('[Game] Load Game Success', props<{ game: Game }>());
export const loadGameFailure = createAction('[Game] Load Game Failure', props<{ error: string }>());

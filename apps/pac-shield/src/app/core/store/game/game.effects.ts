import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { Game } from '../../../shared/models/generated';
import { ApiService } from '../../../shared/services/api.service';
import * as GameActions from './game.actions';

@Injectable()
export class GameEffects {
  private actions$ = inject(Actions);
  private apiService = inject(ApiService);

  loadGameById$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GameActions.loadGameById),
      switchMap(({ gameId }) =>
        this.apiService.get<Game>(`game/${gameId}`).pipe(
          map((game) => GameActions.loadGameSuccess({ game })),
          catchError((error) => of(GameActions.loadGameFailure({ error: error.message })))
        )
      )
    )
  );
}

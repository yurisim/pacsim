import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, mergeMap } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';
import { WebSocketService } from '../../../shared/services/websocket.service';
import * as GameActions from './game.actions';
import { Game } from '../../../generated';

@Injectable()
export class GameEffects {
  private actions$ = inject(Actions);
  private apiService = inject(ApiService);
  private wsService = inject(WebSocketService);

  // Existing: load full Game by ID
  loadGameById$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GameActions.loadGameById),
      switchMap(({ gameId }) =>
        this.apiService.get<Game>(`game/${gameId}`).pipe(
          map((game) => GameActions.loadGameSuccess({ game })),
          catchError((error) =>
            of(GameActions.loadGameFailure({ error: error.message }))
          )
        )
      )
    )
  );

  // Top Bar: Load minimal status from REST
  loadGameStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GameActions.loadGameStatus),
      switchMap(({ gameId }) =>
        this.apiService.getGameStatus(gameId).pipe(
          map((payload) => GameActions.loadGameStatusSuccess({ payload })),
          catchError((error) =>
            of(GameActions.loadGameStatusFailure({ error: error.message || 'Failed to load game status' }))
          )
        )
      )
    )
  );

  // Top Bar: Subscribe to WS updates after status load is requested (component connects socket first)
  listenGameStateUpdates$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GameActions.loadGameStatus),
      // Start listening; assumes WebSocketService.connectToGameNamespace() already called by component
      mergeMap(() =>
        this.wsService.listenGameStateUpdated().pipe(
          map((payload) => GameActions.gameStateUpdatedViaWs({ payload })),
          // If socket not connected, listen() completes; we won't emit failure actions here
          catchError(() => of())
        )
      )
    )
  );
}

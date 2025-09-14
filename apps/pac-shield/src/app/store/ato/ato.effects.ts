import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';
import * as AtoActions from './ato.actions';
import { ATOLine } from '../../generated/aTOLine/aTOLine.entity';

/**
 * NgRx Effects for ATO operations
 */
@Injectable()
export class AtoEffects {
  private readonly apiUrl = '/api/ato';

  private actions$ = inject(Actions);
  private http = inject(HttpClient);


  // =============================================================================
  // Load Current ATO Lines Effect
  // =============================================================================
  loadCurrentAtoLines$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AtoActions.loadCurrentAtoLines),
      mergeMap(({ gameId }) =>
        this.http.get<ATOLine[]>(`${this.apiUrl}/game/${gameId}/current`).pipe(
          map(lines => AtoActions.loadCurrentAtoLinesSuccess({ lines })),
          catchError(error =>
            of(AtoActions.loadCurrentAtoLinesFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  // =============================================================================
  // Load PPR Queue Effect
  // =============================================================================
  loadPprQueue$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AtoActions.loadPprQueue),
      mergeMap(({ gameId }) =>
        this.http.get<ATOLine[]>(`${this.apiUrl}/game/${gameId}/ppr-queue`).pipe(
          map(queue => AtoActions.loadPprQueueSuccess({ queue })),
          catchError(error =>
            of(AtoActions.loadPprQueueFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  // =============================================================================
  // Create ATO Line Effect
  // =============================================================================
  createAtoLine$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AtoActions.createAtoLine),
      mergeMap(({ flightPlan }) =>
        this.http.post<ATOLine>(this.apiUrl, flightPlan).pipe(
          map(line => AtoActions.createAtoLineSuccess({ line })),
          catchError(error =>
            of(AtoActions.createAtoLineFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  // =============================================================================
  // Update ATO Line Effect
  // =============================================================================
  updateAtoLine$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AtoActions.updateAtoLine),
      mergeMap(({ id, updates }) =>
        this.http.put<ATOLine>(`${this.apiUrl}/${id}`, updates).pipe(
          map(line => AtoActions.updateAtoLineSuccess({ line })),
          catchError(error =>
            of(AtoActions.updateAtoLineFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  // =============================================================================
  // Delete ATO Line Effect
  // =============================================================================
  deleteAtoLine$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AtoActions.deleteAtoLine),
      mergeMap(({ id }) =>
        this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`).pipe(
          map(() => AtoActions.deleteAtoLineSuccess({ id })),
          catchError(error =>
            of(AtoActions.deleteAtoLineFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  // =============================================================================
  // PPR Approval Effects
  // =============================================================================
  approvePpr$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AtoActions.approvePpr),
      mergeMap(({ id }) =>
        this.http.post<ATOLine>(`${this.apiUrl}/${id}/approve-ppr`, {}).pipe(
          map(line => AtoActions.approvePprSuccess({ line })),
          catchError(error =>
            of(AtoActions.approvePprFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  denyPpr$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AtoActions.denyPpr),
      mergeMap(({ id }) =>
        this.http.post<ATOLine>(`${this.apiUrl}/${id}/deny-ppr`, {}).pipe(
          map(line => AtoActions.denyPprSuccess({ line })),
          catchError(error =>
            of(AtoActions.denyPprFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  bulkApprovePpr$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AtoActions.bulkApprovePpr),
      mergeMap(({ gameId, atoLineIds }) =>
        this.http.post<ATOLine[]>(`${this.apiUrl}/game/${gameId}/bulk-approve-ppr`, { atoLineIds }).pipe(
          map(lines => AtoActions.bulkApprovePprSuccess({ lines })),
          catchError(error =>
            of(AtoActions.bulkApprovePprFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  // =============================================================================
  // Refresh ATO Data Effect
  // =============================================================================
  refreshAtoData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AtoActions.refreshAtoData),
      mergeMap(({ gameId }) => [
        AtoActions.loadCurrentAtoLines({ gameId }),
        AtoActions.loadPprQueue({ gameId })
      ])
    )
  );

  // =============================================================================
  // Error Handling Helper
  // =============================================================================
  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.message) {
      return error.message;
    }
    return `HTTP ${error.status}: ${error.statusText}`;
  }
}
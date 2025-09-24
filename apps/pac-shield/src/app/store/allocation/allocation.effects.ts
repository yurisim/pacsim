import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { map, mergeMap, catchError, tap } from 'rxjs/operators';
import * as AllocationActions from './allocation.actions';
import { AllocationCycle } from '../../generated/allocationCycle/allocationCycle.entity';
import { AircraftRequest } from '../../generated/aircraftRequest/aircraftRequest.entity';
import { AircraftAllocation } from '../../generated/aircraftAllocation/aircraftAllocation.entity';
import { AircraftInstance } from '../../generated/aircraftInstance/aircraftInstance.entity';
import { AllocationWebSocketService } from '../../shared/services/allocation-websocket.service';
import { environment } from '../../../environments/environment';

/**
 * NgRx Effects for allocation operations
 */
@Injectable()
export class AllocationEffects {
  private readonly apiUrl = `${environment.apiUrl}/allocation`;

  private actions$ = inject(Actions);
  private http = inject(HttpClient);
  private webSocketService = inject(AllocationWebSocketService);

  // =============================================
  //            ALLOCATION CYCLE EFFECTS
  // =============================================

  loadLatestAllocationCycle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.loadLatestAllocationCycle),
      mergeMap(({ gameId }) =>
        this.http.get<AllocationCycle | null>(`${this.apiUrl}/cycles/game/${gameId}/latest`).pipe(
          map(cycle => AllocationActions.loadLatestAllocationCycleSuccess({ cycle })),
          catchError(error =>
            of(AllocationActions.loadLatestAllocationCycleFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  createAllocationCycle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.createAllocationCycle),
      mergeMap(({ gameId, turn }) =>
        this.http.post<AllocationCycle>(`${this.apiUrl}/cycles`, { gameId, turn }).pipe(
          map(cycle => AllocationActions.createAllocationCycleSuccess({ cycle })),
          catchError(error =>
            of(AllocationActions.createAllocationCycleFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  updateAllocationCycleStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.updateAllocationCycleStatus),
      mergeMap(({ cycleId, status }) =>
        this.http.put<AllocationCycle>(`${this.apiUrl}/cycles/${cycleId}`, { status }).pipe(
          map(cycle => AllocationActions.updateAllocationCycleStatusSuccess({ cycle })),
          catchError(error =>
            of(AllocationActions.updateAllocationCycleStatusFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  // =============================================
  //            AIRCRAFT POOL EFFECTS
  // =============================================

  loadUnallocatedAircraftPool$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.loadUnallocatedAircraftPool),
      mergeMap(({ gameId, turn }) => {
        const params = new URLSearchParams({ gameId: gameId.toString() });
        if (turn !== undefined) {
          params.append('turn', turn.toString());
        }
        return this.http.get<AircraftInstance[]>(`${this.apiUrl}/pool?${params}`).pipe(
          map(aircraft => AllocationActions.loadUnallocatedAircraftPoolSuccess({ aircraft })),
          catchError(error =>
            of(AllocationActions.loadUnallocatedAircraftPoolFailure({
              error: this.getErrorMessage(error)
            }))
          )
        );
      })
    )
  );

  // =============================================
  //            AIRCRAFT REQUEST EFFECTS
  // =============================================

  loadRequestsForCycle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.loadRequestsForCycle),
      mergeMap(({ cycleId }) =>
        this.http.get<AircraftRequest[]>(`${this.apiUrl}/requests/cycle/${cycleId}`).pipe(
          map(requests => AllocationActions.loadRequestsForCycleSuccess({ requests })),
          catchError(error =>
            of(AllocationActions.loadRequestsForCycleFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  loadRequestsForTeam$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.loadRequestsForTeam),
      mergeMap(({ teamId }) =>
        this.http.get<AircraftRequest[]>(`${this.apiUrl}/requests/team/${teamId}`).pipe(
          map(requests => AllocationActions.loadRequestsForTeamSuccess({ requests })),
          catchError(error =>
            of(AllocationActions.loadRequestsForTeamFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  createAircraftRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.createAircraftRequest),
      mergeMap((requestData) =>
        this.http.post<AircraftRequest>(`${this.apiUrl}/requests`, requestData).pipe(
          map(request => AllocationActions.createAircraftRequestSuccess({ request })),
          catchError(error =>
            of(AllocationActions.createAircraftRequestFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  updateAircraftRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.updateAircraftRequest),
      mergeMap(({ requestId, updates }) =>
        this.http.put<AircraftRequest>(`${this.apiUrl}/requests/${requestId}`, updates).pipe(
          map(request => AllocationActions.updateAircraftRequestSuccess({ request })),
          catchError(error =>
            of(AllocationActions.updateAircraftRequestFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  deleteAircraftRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.deleteAircraftRequest),
      mergeMap(({ requestId }) =>
        this.http.delete<{ success: boolean }>(`${this.apiUrl}/requests/${requestId}`).pipe(
          map(() => AllocationActions.deleteAircraftRequestSuccess({ requestId })),
          catchError(error =>
            of(AllocationActions.deleteAircraftRequestFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  // =============================================
  //            CFACC ALLOCATION EFFECTS
  // =============================================

  reviewAircraftRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.reviewAircraftRequest),
      mergeMap(({ requestId, status, quantityAllocated, cfaccNotes }) =>
        this.http.put<AircraftRequest>(`${this.apiUrl}/requests/${requestId}/review`, {
          status,
          quantityAllocated,
          cfaccNotes
        }).pipe(
          map(request => AllocationActions.reviewAircraftRequestSuccess({ request })),
          catchError(error =>
            of(AllocationActions.reviewAircraftRequestFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  createAircraftAllocation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.createAircraftAllocation),
      mergeMap((allocationData) =>
        this.http.post<AircraftAllocation>(`${this.apiUrl}/allocations`, allocationData).pipe(
          map(allocation => AllocationActions.createAircraftAllocationSuccess({ allocation })),
          catchError(error =>
            of(AllocationActions.createAircraftAllocationFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  deleteAircraftAllocation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.deleteAircraftAllocation),
      mergeMap(({ allocationId }) =>
        this.http.delete<{ success: boolean }>(`${this.apiUrl}/allocations/${allocationId}`).pipe(
          map(() => AllocationActions.deleteAircraftAllocationSuccess({ allocationId })),
          catchError(error =>
            of(AllocationActions.deleteAircraftAllocationFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  loadAllocationsForCycle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.loadAllocationsForCycle),
      mergeMap(({ cycleId }) =>
        this.http.get<AircraftAllocation[]>(`${this.apiUrl}/allocations/cycle/${cycleId}`).pipe(
          map(allocations => AllocationActions.loadAllocationsForCycleSuccess({ allocations })),
          catchError(error =>
            of(AllocationActions.loadAllocationsForCycleFailure({
              error: this.getErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  // =============================================
  //            BULK OPERATIONS EFFECTS
  // =============================================

  refreshAllocationData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.refreshAllocationData),
      mergeMap(({ gameId }) => [
        AllocationActions.loadLatestAllocationCycle({ gameId }),
        AllocationActions.loadUnallocatedAircraftPool({ gameId }),
      ])
    )
  );

  // =============================================
  //            NOTIFICATION EFFECTS
  // =============================================

  acknowledgeNotification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.acknowledgeNotification),
      tap(({ notificationId, gameId, teamId }) => {
        // Send acknowledgment via WebSocket
        this.webSocketService.acknowledgeNotification(notificationId, gameId, teamId);
      }),
      map(({ notificationId }) => AllocationActions.acknowledgeNotificationSuccess({ notificationId })),
      catchError(({ notificationId, error }) =>
        of(AllocationActions.acknowledgeNotificationFailure({
          notificationId,
          error: error?.message || 'Failed to acknowledge notification'
        }))
      )
    )
  );

  loadNotificationHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.loadNotificationHistory),
      mergeMap(({ gameId, teamId }) => {
        const params = new URLSearchParams({ gameId: gameId.toString() });
        if (teamId) {
          params.append('teamId', teamId.toString());
        }
        // TODO: Implement notification history endpoint when backend supports it
        // For now, return empty array
        return of([]).pipe(
          map(notifications => AllocationActions.loadNotificationHistorySuccess({ notifications })),
          catchError(error =>
            of(AllocationActions.loadNotificationHistoryFailure({
              error: this.getErrorMessage(error)
            }))
          )
        );
      })
    )
  );

  initializeWebSocket$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.initializeAllocationWebSocket),
      tap(({ gameId, teamId }) => {
        this.webSocketService.connect({
          gameId,
          teamId,
          reconnect: true
        });
      })
    ),
    { dispatch: false }
  );

  // Auto-mark notifications as read when notification center is opened
  markNotificationAsRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.markNotificationAsRead),
      map(({ notificationId }) => AllocationActions.markNotificationAsReadSuccess({ notificationId }))
    )
  );

  // =============================================
  //            WEBSOCKET EVENT HANDLERS
  // =============================================

  // Handle real-time WebSocket events from the server
  // These are already handled by the WebSocket service and dispatched as actions
  // The effects here handle the business logic after receiving the events

  onAircraftRequestCreated$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.aircraftRequestCreated),
      tap(({ request }) => {
        console.log('New aircraft request created via WebSocket:', request);
        // Additional business logic can be added here
      })
    ),
    { dispatch: false }
  );

  onAircraftRequestReviewed$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.aircraftRequestReviewed),
      tap(({ request }) => {
        console.log('Aircraft request reviewed via WebSocket:', request);
        // Additional business logic can be added here
      })
    ),
    { dispatch: false }
  );

  onAircraftAllocated$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.aircraftAllocated),
      tap(({ allocation }) => {
        console.log('Aircraft allocated via WebSocket:', allocation);
        // Additional business logic can be added here
      })
    ),
    { dispatch: false }
  );

  // =============================================
  //            ERROR HANDLING HELPER
  // =============================================

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

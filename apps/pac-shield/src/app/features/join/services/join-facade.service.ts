import { Injectable, DestroyRef, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Subject, Observable, of, timer } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../shared/services/auth.service';
import {
  AccountFormValue,
  JoinState,
  JoinStep,
  JoinViewModel,
  NameCheckState,
  RoomStatus,
} from '../models/join.models';

@Injectable({ providedIn: 'root' })
export class JoinFacadeService {
  private readonly MIN_ROOM_SPINNER_MS = 800;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  // In-memory state store
  private readonly stateSubject = new BehaviorSubject<JoinState>(this.initialState());
  private readonly state$ = this.stateSubject.asObservable();

  // Request subjects for coalescing/cancelling
  private readonly roomCodeRequests$ = new Subject<string>();
  private readonly nameCheckRequests$ = new Subject<{ roomCode: string; name: string }>();

  // Public read-only streams
  readonly step$ = this.state$.pipe(map((s) => s.step), distinctUntilChanged());
  readonly roomStatus$ = this.state$.pipe(map((s) => s.room), distinctUntilChanged());
  readonly nameCheck$ = this.state$.pipe(map((s) => s.nameCheck), distinctUntilChanged());
  readonly isBusy$ = this.state$.pipe(map((s) => s.busy), distinctUntilChanged());
  readonly error$ = this.state$.pipe(map((s) => s.error), distinctUntilChanged());
  readonly jwtSession$ = this.state$.pipe(map((s) => s.jwt), distinctUntilChanged());

  readonly viewModel$: Observable<JoinViewModel> = this.state$.pipe(
    map((s) => {
      const accountForm: AccountFormValue = s.account ?? {
        gameId: s.room.code ?? '',
        playerName: s.jwt.player?.name ?? '',
      };
      return {
        step: s.step,
        room: s.room,
        nameCheck: s.nameCheck,
        busy: s.busy,
        error: s.error,
        jwt: s.jwt,
        accountForm,
        pinForm: { pin: '' },
        newPersonForm: { newPlayerName: '' },
        canSubmitAccount: !s.busy && s.room.status === 'valid' && !!(accountForm.playerName || '').trim(),
        canVerifyPin: !s.busy,
        canCreateNewPerson: !s.busy && s.nameCheck.available === true,
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    // Wire room code validation pipeline (latest wins, min spinner time)
    this.roomCodeRequests$
      .pipe(
        debounceTime(0), // immediate; OTP completion triggers explicit call
        distinctUntilChanged(),
        switchMap((code) => {
          const start = Date.now();
          return this.auth.validateRoomCode(code).pipe(
            map((resp) => ({ ok: true as const, valid: resp.valid })),
            catchError(() => of({ ok: false as const, valid: false })),
            switchMap((result) => {
              const elapsed = Date.now() - start;
              const remaining = Math.max(0, this.MIN_ROOM_SPINNER_MS - elapsed);
              return timer(remaining).pipe(map(() => result));
            })
          );
        })
      )
      .subscribe((result) => {
        const prev = this.stateSubject.value;
        const nextRoom: RoomStatus =
          result.ok && result.valid
            ? { status: 'valid', message: null, code: prev.room.code }
            : {
                status: result.ok ? 'invalid' : 'invalid',
                message: result.ok ? 'Invalid room code' : 'Error validating room code',
                code: prev.room.code,
              };
        
        // When room is valid, also update the account gameId to preserve it across state changes
        const nextAccount = result.ok && result.valid 
          ? { ...(prev.account ?? { gameId: '', playerName: '' }), gameId: prev.room.code ?? '' }
          : prev.account;
          
        this.stateSubject.next({
          ...prev,
          room: nextRoom,
          account: nextAccount,
          error: null,
        });
      });

    // Wire name availability check pipeline (debounced, latest wins)
    this.nameCheckRequests$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (a, b) => a.roomCode === b.roomCode && a.name.trim() === b.name.trim()
        ),
        switchMap(({ roomCode, name }) =>
          this.auth.checkPlayerNameAvailability(roomCode, name).pipe(
            map((r) => ({ available: r.isAvailable as boolean, error: null as string | null })),
            catchError(() => of({ available: null, error: 'Error checking name availability.' }))
          )
        )
      )
      .subscribe(({ available, error }) => {
        const prev = this.stateSubject.value;
        const nameCheck: NameCheckState = {
          pending: false,
          available,
          error,
        };
        this.stateSubject.next({ ...prev, nameCheck, error: null });
      });

    // Reflect step changes to query param (?step=...)
    this.step$.subscribe((step) => this.persistStepToUrl(step));
  }

  // Public API

  setStepFromUrl(qp?: string | null): void {
    const step = this.safeStepFromParam(qp);
    if (!step) return;
    const prev = this.stateSubject.value;
    this.stateSubject.next({ ...prev, step });
  }

  validateRoom(roomCode: string): void {
    const code = (roomCode || '').toUpperCase();
    const prev = this.stateSubject.value;
    this.stateSubject.next({
      ...prev,
      room: { status: 'pending', message: null, code },
      error: null,
    });
    this.roomCodeRequests$.next(code);
  }

  updateAccountDraft(patch: Partial<AccountFormValue>): void {
    const prev = this.stateSubject.value;
    this.stateSubject.next({
      ...prev,
      account: { ...(prev.account ?? { gameId: '', playerName: '' }), ...patch },
    });
  }

  join(gameId: string, playerName: string): void {
    const st = this.stateSubject.value;
    if (st.busy) return;
    if (st.room.status !== 'valid') return;

    this.patchState({ busy: true, error: null });

    this.auth
      .joinGame(gameId, playerName)
      .pipe(
        take(1),
        finalize(() => this.patchState({ busy: false }))
      )
      .subscribe({
        next: () => {
          const currentGameId = this.auth.getGameId();
          const gid = currentGameId ?? gameId;
          this.router.navigate(['/lobby', gid]);
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 404) {
              // Invalid room — reflect as room validation error
              const prev = this.stateSubject.value;
              this.stateSubject.next({
                ...prev,
                room: { ...prev.room, status: 'invalid', message: 'Invalid room code' },
              });
              return;
            }
            if (err.status === 400 && (err.error?.code === 'NAME_CONFLICT')) {
              // Transition to conflict step
              const prev = this.stateSubject.value;
              this.stateSubject.next({
                ...prev,
                step: JoinStep.NameConflict,
                error: null,
              });
              return;
            }
            this.patchState({ error: err.error?.message || 'Join failed' });
          } else {
            this.patchState({ error: (err as Error)?.message || 'Join failed' });
          }
        },
      });
  }

  verifyPin(roomCode: string, playerName: string, pin: string): void {
    const st = this.stateSubject.value;
    if (st.busy) return;

    this.patchState({ busy: true, error: null });

    this.auth
      .joinGameWithPin(roomCode, playerName, pin)
      .pipe(
        take(1),
        finalize(() => this.patchState({ busy: false }))
      )
      .subscribe({
        next: () => {
          const currentGameId = this.auth.getGameId();
          const gid = currentGameId ?? roomCode;
          this.router.navigate(['/lobby', gid]);
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            if (err.error?.code === 'INVALID_PIN') {
              this.patchState({ error: 'The PIN you entered is incorrect. Please try again.' });
              return;
            }
            if (err.error?.code === 'NO_PIN_SET') {
              this.patchState({ error: 'This player name exists but has no PIN set. Please choose "I\'m a new person" to create a new player.' });
              return;
            }
            this.patchState({ error: err.error?.message || 'PIN verification failed' });
          } else {
            this.patchState({ error: (err as Error)?.message || 'PIN verification failed' });
          }
        },
      });
  }

  checkNewName(roomCode: string, newName: string): void {
    const prev = this.stateSubject.value;
    this.stateSubject.next({
      ...prev,
      nameCheck: { pending: true, available: null, error: null },
      error: null,
    });
    this.nameCheckRequests$.next({ roomCode, name: newName });
  }

  createNewPlayer(roomCode: string, newName: string): void {
    const st = this.stateSubject.value;
    if (st.busy) return;
    if (st.nameCheck.available !== true) return;

    this.patchState({ busy: true, error: null });

    this.auth
      .joinGame(roomCode, newName)
      .pipe(
        take(1),
        finalize(() => this.patchState({ busy: false }))
      )
      .subscribe({
        next: () => {
          const currentGameId = this.auth.getGameId();
          const gid = currentGameId ?? roomCode;
          this.router.navigate(['/lobby', gid]);
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            this.patchState({ error: err.error?.message || 'Failed to create new player' });
          } else {
            this.patchState({ error: (err as Error)?.message || 'Failed to create new player' });
          }
        },
      });
  }

  continueExistingGame(): void {
    const st = this.stateSubject.value;
    const gid = st.jwt.gameId;
    if (st.jwt.hasValid && gid) {
      this.router.navigate(['/lobby', gid]);
    }
  }

  switchToNewPerson(): void {
    const prev = this.stateSubject.value;
    this.stateSubject.next({ ...prev, step: JoinStep.NewPerson, error: null });
  }

  resetConflictFlow(): void {
    const prev = this.stateSubject.value;
    this.stateSubject.next({
      ...prev,
      step: JoinStep.AccountRoom,
      nameCheck: { pending: false, available: null, error: null },
      error: null,
    });
  }

  // URL reflection

  persistStepToUrl(step: JoinStep): void {
    const stepParam = this.stepToParam(step);
    const qp: any = stepParam ? { step: stepParam } : {};
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // Helpers

  private initialState(): JoinState {
    const hasValid = this.auth.isAuthenticated();
    const player = this.auth.getPlayer();
    const gameId = this.auth.getGameId();

    return {
      step: JoinStep.AccountRoom,
      room: { status: 'idle', message: null, code: '' },
      nameCheck: { pending: false, available: null, error: null },
      busy: false,
      error: null,
      jwt: { hasValid, player, gameId },
      account: {
        gameId: '',
        playerName: player?.name ?? '',
      },
    };
  }

  private patchState(patch: Partial<JoinState>): void {
    const prev = this.stateSubject.value;
    this.stateSubject.next({ ...prev, ...patch });
  }

  private stepToParam(step: JoinStep): string | null {
    switch (step) {
      case JoinStep.AccountRoom:
        return 'account';
      case JoinStep.NameConflict:
        return 'conflict';
      case JoinStep.NewPerson:
        return 'new';
      case JoinStep.Done:
        return 'done';
      default:
        return null;
    }
  }

  private safeStepFromParam(param?: string | null): JoinStep | null {
    switch ((param || '').toLowerCase()) {
      case 'account':
        return JoinStep.AccountRoom;
      case 'conflict':
        return JoinStep.NameConflict;
      case 'new':
        return JoinStep.NewPerson;
      case 'done':
        return JoinStep.Done;
      default:
        return null;
    }
  }
}

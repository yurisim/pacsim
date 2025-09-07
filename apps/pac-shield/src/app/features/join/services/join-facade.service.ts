import { Injectable, DestroyRef, inject, signal, computed, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, of, timer } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, switchMap, take } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../shared/services/auth.service';
import {
  AccountFormValue,
  JoinState,
  JoinStep,
  JoinViewModel,
  JwtSessionState,
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

  // Signal-based state management
  private readonly stepSignal = signal<JoinStep>(JoinStep.AccountRoom);
  private readonly roomStatusSignal = signal<RoomStatus>({ status: 'idle', message: null, code: '' });
  private readonly nameCheckSignal = signal<NameCheckState>({ pending: false, available: null, error: null });
  private readonly busySignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly jwtSessionSignal = signal<JwtSessionState>({ hasValid: false, player: null, gameId: null });
  private readonly accountFormSignal = signal<AccountFormValue>({ gameId: '', playerName: '' });
  private readonly pinFormSignal = signal<{ pin: string }>({ pin: '' });
  private readonly newPersonFormSignal = signal<{ newPlayerName: string }>({ newPlayerName: '' });

  // Request subjects for coalescing/cancelling (keep these as observables for async operations)
  private readonly roomCodeRequests$ = new Subject<string>();
  private readonly nameCheckRequests$ = new Subject<{ roomCode: string; name: string }>();

  // Public read-only signals (computed from private signals)
  readonly step = this.stepSignal.asReadonly();
  readonly roomStatus = this.roomStatusSignal.asReadonly();
  readonly nameCheck = this.nameCheckSignal.asReadonly();
  readonly isBusy = this.busySignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly jwtSession = this.jwtSessionSignal.asReadonly();

  // Computed viewModel signal that replaces the complex observable pipeline
  readonly viewModel = computed<JoinViewModel>(() => {
    const accountForm: AccountFormValue = {
      gameId: this.roomStatusSignal().code ?? '',
      playerName: this.accountFormSignal().playerName || (this.jwtSessionSignal().player?.name ?? ''),
    };

    return {
      step: this.stepSignal(),
      room: this.roomStatusSignal(),
      nameCheck: this.nameCheckSignal(),
      busy: this.busySignal(),
      error: this.errorSignal(),
      jwt: this.jwtSessionSignal(),
      accountForm,
      pinForm: this.pinFormSignal(),
      newPersonForm: this.newPersonFormSignal(),
      canSubmitAccount: !this.busySignal() && this.roomStatusSignal().status === 'valid' && !!(accountForm.playerName || '').trim(),
      canVerifyPin: !this.busySignal(),
      canCreateNewPerson: !this.busySignal() && this.nameCheckSignal().available === true,
    };
  });

  constructor() {
    // Initialize signals with initial state
    const initialState = this.initialState();
    this.stepSignal.set(initialState.step);
    this.roomStatusSignal.set(initialState.room);
    this.nameCheckSignal.set(initialState.nameCheck);
    this.busySignal.set(initialState.busy);
    this.errorSignal.set(initialState.error);
    this.jwtSessionSignal.set(initialState.jwt);
    this.accountFormSignal.set(initialState.account ?? { gameId: '', playerName: '' });
    this.pinFormSignal.set({ pin: '' });
    this.newPersonFormSignal.set({ newPlayerName: '' });
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
        const prevRoom = this.roomStatusSignal();
        const nextRoom: RoomStatus =
          result.ok && result.valid
            ? { status: 'valid', message: null, code: prevRoom.code }
            : {
                status: result.ok ? 'invalid' : 'invalid',
                message: result.ok ? 'Invalid room code' : 'Error validating room code',
                code: prevRoom.code,
              };

        this.roomStatusSignal.set(nextRoom);

        // When room is valid, also update the account gameId to preserve it across state changes
        if (result.ok && result.valid) {
          const prevAccount = this.accountFormSignal();
          this.accountFormSignal.set({
            ...prevAccount,
            gameId: prevRoom.code ?? ''
          });
        }

        this.errorSignal.set(null);
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
        const nameCheck: NameCheckState = {
          pending: false,
          available,
          error,
        };
        this.nameCheckSignal.set(nameCheck);
        this.errorSignal.set(null);
      });

    // Reflect step changes to query param (?step=...) using effect
    effect(() => {
      const step = this.stepSignal();
      this.persistStepToUrl(step);
    });
  }

  // Public API

  setStepFromUrl(qp?: string | null): void {
    const step = this.safeStepFromParam(qp);
    if (!step) return;
    this.stepSignal.set(step);
  }

  validateRoom(roomCode: string): void {
    const code = (roomCode || '').toUpperCase();
    this.roomStatusSignal.set({ status: 'pending', message: null, code });
    this.errorSignal.set(null);
    this.roomCodeRequests$.next(code);
  }

  updateAccountDraft(patch: Partial<AccountFormValue>): void {
    const prev = this.accountFormSignal();
    this.accountFormSignal.set({
      ...(prev ?? { gameId: '', playerName: '' }),
      ...patch
    });
  }

  join(gameId: string, playerName: string): void {
    if (this.busySignal()) return;
    if (this.roomStatusSignal().status !== 'valid') return;

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
              const prevRoom = this.roomStatusSignal();
              this.roomStatusSignal.set({ ...prevRoom, status: 'invalid', message: 'Invalid room code' });
              return;
            }
            if (err.status === 400 && (err.error?.code === 'NAME_CONFLICT')) {
              // Transition to conflict step
              this.stepSignal.set(JoinStep.NameConflict);
              this.errorSignal.set(null);
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
    if (this.busySignal()) return;

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
    this.nameCheckSignal.set({ pending: true, available: null, error: null });
    this.errorSignal.set(null);
    this.nameCheckRequests$.next({ roomCode, name: newName });
  }

  createNewPlayer(roomCode: string, newName: string): void {
    if (this.busySignal()) return;
    if (this.nameCheckSignal().available !== true) return;

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
    const jwt = this.jwtSessionSignal();
    const gid = jwt.gameId;
    if (jwt.hasValid && gid) {
      this.router.navigate(['/lobby', gid]);
    }
  }

  switchToNewPerson(): void {
    this.stepSignal.set(JoinStep.NewPerson);
    this.errorSignal.set(null);
  }

  resetConflictFlow(): void {
    this.stepSignal.set(JoinStep.AccountRoom);
    this.nameCheckSignal.set({ pending: false, available: null, error: null });
    this.errorSignal.set(null);
  }

  // URL reflection

  persistStepToUrl(step: JoinStep): void {
    const stepParam = this.stepToParam(step);
    const qp = stepParam ? { step: stepParam } : {};
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

  // Replace patchState with individual signal updates
  private patchState(patch: Partial<JoinState>): void {
    if (patch.step !== undefined) this.stepSignal.set(patch.step);
    if (patch.room !== undefined) this.roomStatusSignal.set(patch.room);
    if (patch.nameCheck !== undefined) this.nameCheckSignal.set(patch.nameCheck);
    if (patch.busy !== undefined) this.busySignal.set(patch.busy);
    if (patch.error !== undefined) this.errorSignal.set(patch.error);
    if (patch.jwt !== undefined) this.jwtSessionSignal.set(patch.jwt);
    if (patch.account !== undefined) this.accountFormSignal.set(patch.account ?? { gameId: '', playerName: '' });
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

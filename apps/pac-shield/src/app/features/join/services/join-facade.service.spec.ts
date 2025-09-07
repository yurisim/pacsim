import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { JoinFacadeService } from './join-facade.service';
import { AuthService } from '../../../shared/services/auth.service';
import { JoinStep } from '../models/join.models';

@Component({ template: '' })
class MockLobbyComponent {}

class AuthServiceStub {
  validateRoomCode = jest.fn().mockReturnValue(of({ valid: true }));
  joinGame = jest.fn().mockReturnValue(of({ token: 't', player: { id: '1', name: 'Bob', sessionId: 's' } }));
  joinGameWithPin = jest.fn().mockReturnValue(of({ token: 't', player: { id: '1', name: 'Bob', sessionId: 's' } }));
  checkPlayerNameAvailability = jest.fn().mockReturnValue(of({ isAvailable: true }));
  getGameId = jest.fn().mockReturnValue('ABC123');
  isAuthenticated = jest.fn().mockReturnValue(false);
  getPlayer = jest.fn().mockReturnValue(null);
}

describe('JoinFacadeService', () => {
  let service: JoinFacadeService;
  let auth: AuthServiceStub;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([
        { path: 'lobby/:gameId', component: MockLobbyComponent }
      ])],
      providers: [{ provide: AuthService, useClass: AuthServiceStub }],
    });
    service = TestBed.inject(JoinFacadeService);
    auth = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    router = TestBed.inject(Router);
  });

  it('validateRoom should set pending then valid after min spinner time', fakeAsync(() => {
    const roomStates: string[] = [];
    const sub = service.roomStatus$.subscribe((rs) => roomStates.push(rs.status));
    service.validateRoom('abc123');

    // Immediately after call: pending
    expect(roomStates[roomStates.length - 1]).toBe('pending');

    // After min spinner time (800ms), expect valid
    tick(800);
    expect(roomStates[roomStates.length - 1]).toBe('valid');

    sub.unsubscribe();
  }));

  it('join should navigate to lobby on success', fakeAsync(() => {
    // Arrange: make room valid first
    service.validateRoom('ABC123');
    tick(800);

    const routerSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    service.join('ABC123', 'Bob');
    tick(); // complete join observable

    // Should navigate to lobby with gameId
    expect(routerSpy).toHaveBeenCalledWith(['/lobby', 'ABC123']);

    routerSpy.mockRestore();
  }));

  it('join should transition to NameConflict on 400 NAME_CONFLICT', fakeAsync(() => {
    // Arrange: valid room
    service.validateRoom('ABC123');
    tick(800);

    auth.joinGame.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { code: 'NAME_CONFLICT', message: 'Name conflict' },
          })
      )
    );

    const steps: JoinStep[] = [];
    const sub = service.step$.subscribe((s) => steps.push(s));

    service.join('ABC123', 'Bob');
    tick();

    expect(steps.includes(JoinStep.NameConflict)).toBe(true);
    sub.unsubscribe();
  }));

  it('verifyPin should set error on INVALID_PIN', fakeAsync(() => {
    auth.joinGameWithPin.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { code: 'INVALID_PIN', message: 'Invalid pin' },
          })
      )
    );

    const errs: (string | null)[] = [];
    const sub = service.error$.subscribe((e) => errs.push(e));

    service.verifyPin('ABC123', 'Bob', '1234');
    tick();

    expect(errs.filter((e) => !!e).pop()).toContain('incorrect');

    sub.unsubscribe();
  }));

  it('checkNewName should update nameCheck.available', fakeAsync(() => {
    const avail: (boolean | null)[] = [];
    const sub = service.nameCheck$.subscribe((nc) => avail.push(nc.available));

    service.checkNewName('ABC123', 'NewGuy');
    // debounce 300ms in pipeline
    tick(300);

    // After pipeline resolves, latest emission should be true
    expect(avail.includes(true)).toBe(true);
    sub.unsubscribe();
  }));
});

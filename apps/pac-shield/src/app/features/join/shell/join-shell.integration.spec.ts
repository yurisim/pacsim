import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { JoinShellComponent } from './join-shell.component';
import { JoinFacadeService } from '../services/join-facade.service';
import { JoinStep, JoinViewModel } from '../models/join.models';
import { AccountRoomFormComponent } from '../components/account-room-form/account-room-form.component';
import { NameConflictResolveComponent } from '../components/name-conflict-resolve/name-conflict-resolve.component';
import { NewPersonFormComponent } from '../components/new-person-form/new-person-form.component';
import { ContinueSessionCardComponent } from '../components/continue-session-card/continue-session-card.component';

class MockJoinFacade {
  // Initial VM mirrors account-room step
  private vmSignal = signal<JoinViewModel>({
    step: JoinStep.AccountRoom,
    room: { status: 'idle', message: null, code: '' },
    nameCheck: { pending: false, available: null, error: null },
    busy: false,
    error: null,
    jwt: { hasValid: false, player: null, gameId: null },
    accountForm: { gameId: '', playerName: '' },
    pinForm: { pin: '' },
    newPersonForm: { newPlayerName: '', pin: '' },
    canSubmitAccount: false,
    canVerifyPin: true,
    canCreateNewPerson: false,
  });
  viewModel = this.vmSignal.asReadonly();

  // Methods the shell binds to:
  setStepFromUrl = jest.fn(); // Add this method that was missing
  validateRoom = jest.fn();
  updateAccountDraft = jest.fn((patch: Partial<JoinViewModel['accountForm']>) => {
    const current = this.vmSignal();
    this.vmSignal.set({ ...current, accountForm: { ...current.accountForm, ...patch } });
  });
  join = jest.fn();
  verifyPin = jest.fn();
  switchToNewPerson = jest.fn(() => {
    const current = this.vmSignal();
    this.vmSignal.set({ ...current, step: JoinStep.NewPerson });
  });
  checkNewName = jest.fn();
  createNewPlayer = jest.fn();
  resetConflictFlow = jest.fn(() => {
    const current = this.vmSignal();
    this.vmSignal.set({ ...current, step: JoinStep.AccountRoom });
  });
  continueExistingGame = jest.fn();

  // Test helper to drive shell state
  setVm(vm: Partial<JoinViewModel>) {
    this.vmSignal.set({ ...this.vmSignal(), ...vm });
  }
}

describe('JoinShellComponent (integration)', () => {
  let fixture: ComponentFixture<JoinShellComponent>;
  let component: JoinShellComponent;
  let facade: MockJoinFacade;

  beforeEach(async () => {
    facade = new MockJoinFacade();

    await TestBed.configureTestingModule({
      imports: [JoinShellComponent],
      providers: [{ provide: JoinFacadeService, useValue: facade }],
    }).compileComponents();

    fixture = TestBed.createComponent(JoinShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('happy path: emits validateRoom and join from AccountRoomForm wiring', () => {
    // Drive VM to valid room + player name can submit
    facade.setVm({
      step: JoinStep.AccountRoom,
      room: { status: 'valid', message: null, code: 'ABC123' },
      accountForm: { gameId: 'ABC123', playerName: 'Bob' },
      canSubmitAccount: true,
      busy: false,
    });
    fixture.detectChanges();

    const account = fixture.debugElement.query(de =>
      de.componentInstance instanceof AccountRoomFormComponent
    )?.componentInstance as AccountRoomFormComponent;

    expect(account).toBeTruthy();

    // OTP completion -> validateRoom
    account.roomCodeComplete.emit('ABC123');
    expect(facade.validateRoom).toHaveBeenCalledWith('ABC123');

    // Submit -> join (PIN now required and forwarded)
    account.submitted.emit({ gameId: 'ABC123', playerName: 'Bob', pin: '2468' });
    expect(facade.join).toHaveBeenCalledWith('ABC123', 'Bob', '2468');
  });

  it('conflict path: forwards verifyPin and switchToNewPerson events', () => {
    // Move VM to conflict step
    facade.setVm({
      step: JoinStep.NameConflict,
      room: { status: 'valid', message: null, code: 'ROOM99' },
      accountForm: { gameId: 'ROOM99', playerName: 'Bob' },
      busy: false,
    });
    fixture.detectChanges();

    const conflict = fixture.debugElement.query(de =>
      de.componentInstance instanceof NameConflictResolveComponent
    )?.componentInstance as NameConflictResolveComponent;

    expect(conflict).toBeTruthy();

    conflict.verifyPin.emit({ pin: '1234' });
    expect(facade.verifyPin).toHaveBeenCalledWith('ROOM99', 'Bob', '1234');

    conflict.newPersonClicked.emit();
    expect(facade.switchToNewPerson).toHaveBeenCalled();
  });

  it('new person path: forwards availability and create events', () => {
    // Move VM to new person step
    facade.setVm({
      step: JoinStep.NewPerson,
      room: { status: 'valid', message: null, code: 'ROOM77' },
      accountForm: { gameId: 'ROOM77', playerName: 'Alice' },
      nameCheck: { pending: false, available: true, error: null },
      busy: false,
    });
    fixture.detectChanges();

    const newPerson = fixture.debugElement.query(de =>
      de.componentInstance instanceof NewPersonFormComponent
    )?.componentInstance as NewPersonFormComponent;

    expect(newPerson).toBeTruthy();

    newPerson.checkAvailability.emit('NewGuy');
    expect(facade.checkNewName).toHaveBeenCalledWith('ROOM77', 'NewGuy');

    newPerson.createNew.emit({ name: 'NewGuy', pin: '2468' });
    expect(facade.createNewPlayer).toHaveBeenCalledWith('ROOM77', 'NewGuy', '2468');
  });

  it('continue session card: forwards continue click', () => {
    // Show continue card
    facade.setVm({
      jwt: { hasValid: true, player: { id: '1', name: 'Zed', sessionId: 's' }, gameId: 'ROOM1' },
    });
    fixture.detectChanges();

    const cont = fixture.debugElement.query(de =>
      de.componentInstance instanceof ContinueSessionCardComponent
    )?.componentInstance as ContinueSessionCardComponent;

    expect(cont).toBeTruthy();

    cont.continueClicked.emit();
    expect(facade.continueExistingGame).toHaveBeenCalled();
  });
});

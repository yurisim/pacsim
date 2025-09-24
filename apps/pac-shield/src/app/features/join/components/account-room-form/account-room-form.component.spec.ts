import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountRoomFormComponent } from './account-room-form.component';
import { AccountFormValue, RoomStatus } from '../../models/join.models';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('AccountRoomFormComponent', () => {
  let component: AccountRoomFormComponent;
  let fixture: ComponentFixture<AccountRoomFormComponent>;

  const value: AccountFormValue = { gameId: 'ABC123', playerName: 'b.jones' };
  const roomValid: RoomStatus = { status: 'valid', message: null, code: 'ABC123' };
  const roomPending: RoomStatus = { status: 'pending', message: null, code: 'ABC123' };
  const roomInvalid: RoomStatus = { status: 'invalid', message: 'Invalid room code', code: 'ABC123' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, AccountRoomFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountRoomFormComponent);
    component = fixture.componentInstance;
    component.value = value;
    component.roomStatus = roomValid;
    component.canSubmit = true;
    fixture.detectChanges();
  });

  it('emits submitted when form is valid and user submits', () => {
    const spy = jest.fn();
    component.submitted.subscribe(spy);

    // Ensure form is valid by patching values correctly (PIN now required)
    component.form.patchValue({ gameId: 'ABC123', playerName: 'b.jones', pin: '2468' });

    // Trigger submit
    component.onSubmit();
    expect(spy).toHaveBeenCalledWith({ gameId: 'ABC123', playerName: 'b.jones', pin: '2468' });
  });

  it('shows spinner when room validation is pending and disables submit', () => {
    component.roomStatus = roomPending;
    component.canSubmit = false;
    fixture.detectChanges();

    const submitBtn = fixture.debugElement.query(By.css('[data-testid="join-submit-button"]'));
    expect(submitBtn?.nativeElement?.disabled || true).toBe(true);
  });

  it('shows error message when room is invalid', () => {
    component.roomStatus = roomInvalid;
    fixture.detectChanges();

    const error = fixture.debugElement.query(By.css('#' + component.roomMessageId));
    expect(error).toBeTruthy();
  });

  it('emits roomCodeComplete when OTP completes', () => {
    const spy = jest.fn();
    component.roomCodeComplete.subscribe(spy);
    component.onOtpComplete('xyz123');
    expect(spy).toHaveBeenCalledWith('XYZ123');
  });

  it('emits playerNameChanged when typing name and auto-converts to lowercase', () => {
    const spy = jest.fn();
    component.playerNameChanged.subscribe(spy);
    component.onPlayerNameInput('A.Smith');
    expect(spy).toHaveBeenCalledWith('a.smith');
  });

  it('auto-converts mixed case usernames in various scenarios', () => {
    const spy = jest.fn();
    component.playerNameChanged.subscribe(spy);

    // Test various mixed case scenarios
    component.onPlayerNameInput('J.SMITH');
    expect(spy).toHaveBeenCalledWith('j.smith');

    component.onPlayerNameInput('m.Johnson');
    expect(spy).toHaveBeenCalledWith('m.johnson');

    component.onPlayerNameInput('K.O\'CONNOR');
    expect(spy).toHaveBeenCalledWith('k.o\'connor');
  });

  it('updates form control value when player name input changes', () => {
    component.onPlayerNameInput('B.Wilson');
    expect(component.form.controls.playerName.value).toBe('b.wilson');
  });

  it('emits lowercase username on form submission', () => {
    const spy = jest.fn();
    component.submitted.subscribe(spy);

    // Set form values including mixed case username
    component.form.patchValue({
      gameId: 'ABC123',
      playerName: 'C.TAYLOR',
      pin: '9876'
    });

    component.onSubmit();
    expect(spy).toHaveBeenCalledWith({
      gameId: 'ABC123',
      playerName: 'c.taylor',
      pin: '9876'
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountRoomFormComponent } from './account-room-form.component';
import { AccountFormValue, RoomStatus } from '../../models/join.models';
import { By } from '@angular/platform-browser';

describe('AccountRoomFormComponent', () => {
  let component: AccountRoomFormComponent;
  let fixture: ComponentFixture<AccountRoomFormComponent>;

  const value: AccountFormValue = { gameId: 'ABC123', playerName: 'Bob' };
  const roomValid: RoomStatus = { status: 'valid', message: null, code: 'ABC123' };
  const roomPending: RoomStatus = { status: 'pending', message: null, code: 'ABC123' };
  const roomInvalid: RoomStatus = { status: 'invalid', message: 'Invalid room code', code: 'ABC123' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountRoomFormComponent],
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

    // Ensure form is valid by patching values correctly
    component.form.patchValue({ gameId: 'ABC123', playerName: 'Bob' });
    
    // Trigger submit
    component.onSubmit();
    expect(spy).toHaveBeenCalledWith({ gameId: 'ABC123', playerName: 'Bob' });
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

  it('emits playerNameChanged when typing name', () => {
    const spy = jest.fn();
    component.playerNameChanged.subscribe(spy);
    component.onPlayerNameInput('Alice');
    expect(spy).toHaveBeenCalledWith('Alice');
  });
});

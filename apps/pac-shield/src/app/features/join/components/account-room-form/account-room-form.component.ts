import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { InputOtpComponent } from '../../../../shared/components/input-otp/input-otp.component';
import { AccountFormValue, RoomStatus } from '../../models/join.models';
import { roomCodeValidator } from '../../validators/room-code.validator';
import { mapFieldError } from '../../utils/error-presenter';

type AccountForm = FormGroup<{
  gameId: FormControl<string>;
  playerName: FormControl<string>;
}>;

@Component({
  selector: 'app-account-room-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    InputOtpComponent,
  ],
  templateUrl: './account-room-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountRoomFormComponent implements OnChanges {
  private fb = inject(FormBuilder).nonNullable;

  @Input({ required: true }) value: AccountFormValue = { gameId: '', playerName: '' };
  @Input({ required: true }) roomStatus: RoomStatus = { status: 'idle', message: null, code: '' };
  @Input() canSubmit = false;
  @Input() isBusy = false;

  @Output() roomCodeChanged = new EventEmitter<string>();
  @Output() roomCodeComplete = new EventEmitter<string>();
  @Output() playerNameChanged = new EventEmitter<string>();
  @Output() submitted = new EventEmitter<AccountFormValue>();

  form: AccountForm = this.fb.group({
    gameId: this.fb.control('', { validators: [roomCodeValidator(6)] }),
    playerName: this.fb.control('', { validators: [Validators.required] }),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value) {
      const v = this.value;
      // Avoid emitting when patching inputs from parent
      this.form.patchValue({ gameId: v.gameId ?? '', playerName: v.playerName ?? '' }, { emitEvent: false });
    }
  }

  onOtpComplete(code: string): void {
    const upper = (code || '').toUpperCase();
    this.form.controls.gameId.setValue(upper);
    this.roomCodeComplete.emit(upper);
  }

  onGameIdInput(value: string): void {
    const upper = (value || '').toUpperCase();
    this.form.controls.gameId.setValue(upper, { emitEvent: false });
    this.roomCodeChanged.emit(upper);
  }

  onPlayerNameInput(value: string): void {
    this.playerNameChanged.emit(value);
  }

  onSubmit(): void {
    if (this.form.valid) {
      const val = this.form.getRawValue();
      this.submitted.emit({ gameId: val.gameId, playerName: val.playerName });
    }
  }

  roomMessageId = 'room-status-message';
  nameErrorId = 'player-name-error';

  fieldError(control: FormControl): string | null {
    return mapFieldError(control);
  }

  get isRoomPending(): boolean {
    return this.roomStatus.status === 'pending';
  }
  get isRoomValid(): boolean {
    return this.roomStatus.status === 'valid';
  }
  get isRoomInvalid(): boolean {
    return this.roomStatus.status === 'invalid';
  }
}

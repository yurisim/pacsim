import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AccountFormValue, RoomStatus } from '../../models/join.models';
import { roomCodeValidator } from '../../validators/room-code.validator';
import { mapFieldError } from '../../utils/error-presenter';
import { RoomCodeFieldComponent } from '../room-code-field/room-code-field.component';
import { StatusBannerComponent } from '../status-banner/status-banner.component';
import { AccountSelectorComponent } from '../account-selector/account-selector.component';
import { pinValidator } from '../../validators/pin.validator';
import { nameFormatValidator } from '../../validators/name-format.validator';
import { InputOtpComponent } from '../../../../shared/components/input-otp/input-otp.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';

type AccountForm = FormGroup<{
  gameId: FormControl<string>;
  playerName: FormControl<string>;
  pin: FormControl<string>;
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
    MatButtonModule,
    RoomCodeFieldComponent,
    StatusBannerComponent,
    AccountSelectorComponent,
    InputOtpComponent,
  ],
  templateUrl: './account-room-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component Intent: Main form component for game joining workflow, handling
 * room code input, player name entry, and account selection with validation.
 *
 * This component provides:
 * - Room code input with OTP-style interface and validation
 * - Player name input with required validation
 * - Account selector integration for returning players
 * - Real-time form validation and error display
 * - Status banner integration for room validation feedback
 * - Event emission for parent component coordination
 * - Form state management and change detection optimization
 */
export class AccountRoomFormComponent implements OnChanges {
  private fb = inject(FormBuilder).nonNullable;

  @Input({ required: true }) value: AccountFormValue = { gameId: '', playerName: '' };
  @Input({ required: true }) roomStatus: RoomStatus = { status: 'idle', message: null, code: '' };
  @Input() canSubmit = false;
  @Input() isBusy = false;
  // Controls PIN visibility and helper messaging when name is checked/available
  @Input() nameAvailable?: boolean;

  @Output() roomCodeChanged = new EventEmitter<string>();
  @Output() roomCodeComplete = new EventEmitter<string>();
  @Output() playerNameChanged = new EventEmitter<string>();
  // Debounced availability request emitted when room is valid and name length >= 2
  @Output() nameAvailabilityRequested = new EventEmitter<string>();
  @Output() submitted = new EventEmitter<AccountFormValue>();

  form: AccountForm = this.fb.group({
    gameId: this.fb.control('', { validators: [roomCodeValidator(6)] }),
    playerName: this.fb.control('', { validators: [Validators.required, nameFormatValidator()] }),
    // Required PIN for securing name
    pin: this.fb.control('', { validators: [Validators.required, pinValidator(4)] }),
  });

  constructor() {
    // Manual name checking only - no automatic checking
  }

  /**
   * Method Intent: Handle input property changes to synchronize form values
   * with parent component state while preventing unnecessary event emissions.
   *
   * This method handles:
   * - Reactive updates when parent changes form values
   * - Form patching without triggering validation events
   * - Null/undefined value handling for safe updates
   * - Preventing circular event emission during synchronization
   *
   * @param changes - Angular SimpleChanges object containing changed properties
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value) {
      const v = this.value;
      // Avoid emitting when patching inputs from parent
      this.form.patchValue({ gameId: v.gameId ?? '', playerName: v.playerName ?? '', pin: v.pin ?? '' }, { emitEvent: false });
    }
  }

  // Legacy handler kept for spec compatibility
  onOtpComplete(code: string): void {
    const upper = (code || '').toUpperCase();
    this.form.controls.gameId.setValue(upper);
    this.roomCodeComplete.emit(upper);
  }

  // New handler for RoomCodeField (void "complete" event)
  onRoomCodeComplete(): void {
    const code = (this.form.controls.gameId.value || '').toUpperCase();
    this.form.controls.gameId.setValue(code);
    this.roomCodeComplete.emit(code);
  }

  onGameIdInput(value: string): void {
    const upper = (value || '').toUpperCase();
    this.form.controls.gameId.setValue(upper, { emitEvent: false });
    this.roomCodeChanged.emit(upper);
  }

  onPlayerNameInput(value: string): void {
    const lowercaseValue = value.toLowerCase();
    this.form.controls.playerName.setValue(lowercaseValue, { emitEvent: false });
    this.playerNameChanged.emit(lowercaseValue);
  }

  // Adapter for AccountSelector output
  onAccountChange(account: { name: string } | null): void {
    const name = (account?.name ?? '').toString().toLowerCase();
    this.form.controls.playerName.setValue(name);
    this.playerNameChanged.emit(name);
  }

  /**
   * Method Intent: Handle form submission with validation, extracting form values
   * and emitting them to parent component for processing.
   *
   * This method handles:
   * - Form validation before submission
   * - Raw value extraction from form controls
   * - Event emission with structured form data
   * - Prevention of invalid form submissions
   * - Type-safe data transformation for parent consumption
   */
  onSubmit(): void {
    const gameIdCtrl = this.form.controls.gameId;
    const playerNameCtrl = this.form.controls.playerName;
    const pinCtrl = this.form.controls.pin;

    // Require room+name+pin to all be valid before submit.
    if (gameIdCtrl.valid && playerNameCtrl.valid && pinCtrl.valid) {
      const val = this.form.getRawValue();
      const pin = (val.pin || '').trim();
      this.submitted.emit({
        gameId: val.gameId,
        playerName: val.playerName.toLowerCase(),
        pin,
      });
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

  canCheckName(): boolean {
    const name = (this.form.controls.playerName.value || '').toString().trim().toLowerCase();
    return this.isRoomValid && name.length >= 2 && !this.isBusy;
  }

  onCheckNameClick(): void {
    if (!this.canCheckName()) return;

    const name = (this.form.controls.playerName.value || '').toString().trim().toLowerCase();
    this.nameAvailabilityRequested.emit(name);
  }
}

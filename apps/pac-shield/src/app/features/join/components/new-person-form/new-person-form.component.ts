import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { NewPersonFormValue, NameCheckState } from '../../models/join.models';
import { mapFieldError } from '../../utils/error-presenter';
import { pinValidator } from '../../validators/pin.validator';
import { InputOtpComponent } from '../../../../shared/components/input-otp/input-otp.component';

type NewPersonForm = FormGroup<{
  newPlayerName: FormControl<string>;
  pin: FormControl<string>;
}>;

@Component({
  selector: 'app-new-person-form',
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
  templateUrl: './new-person-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component Intent: Handles the "I'm a new person" flow when a player name conflict occurs,
 * allowing users to create a unique player identity with name availability checking.
 *
 * This component provides:
 * - New player name input with validation (required, minimum length)
 * - Real-time name availability checking with visual feedback
 * - Form state management for name conflict resolution
 * - Integration with parent component for conflict resolution workflow
 * - Loading states and error handling for availability checks
 * - Back navigation to previous conflict resolution step
 */
export class NewPersonFormComponent implements OnChanges {
  private fb = inject(FormBuilder).nonNullable;

  @Input({ required: true }) value: NewPersonFormValue = { newPlayerName: '', pin: '' };
  @Input({ required: true }) nameCheck: NameCheckState = { pending: false, available: null, error: null };
  @Input() isBusy = false;

  @Output() backClicked = new EventEmitter<void>();
  @Output() checkAvailability = new EventEmitter<string>();
  @Output() createNew = new EventEmitter<{ name: string; pin: string }>();

  form: NewPersonForm = this.fb.group({
    newPlayerName: this.fb.control('', { validators: [Validators.required, Validators.minLength(2)] }),
    pin: this.fb.control('', { validators: [pinValidator(4)] }),
  });

  /**
   * Method Intent: Handle input property changes to synchronize form values
   * with parent component state while preventing unnecessary validation events.
   *
   * This method handles:
   * - Reactive updates when parent changes the form value
   * - Form patching without triggering validation cycles
   * - Null/undefined value handling for safe updates
   * - Preventing circular event emission during synchronization
   *
   * @param changes - Angular SimpleChanges object containing changed properties
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value) {
      this.form.patchValue(
        { newPlayerName: this.value.newPlayerName ?? '', pin: this.value.pin ?? '' },
        { emitEvent: false }
      );
    }
  }

  onBack(): void {
    this.backClicked.emit();
  }

  /**
   * Method Intent: Trigger name availability checking for the entered player name.
   *
   * This method handles:
   * - Form value extraction and whitespace trimming
   * - Validation that a name is provided before checking
   * - Event emission to parent component for availability verification
   * - Preventing empty name checks
   */
  onCheck(): void {
    const name = (this.form.controls.newPlayerName.value || '').trim();
    if (name) {
      this.checkAvailability.emit(name);
    }
  }

  /**
   * Method Intent: Create a new player with the validated name when availability
   * is confirmed and form is valid.
   *
   * This method handles:
   * - Form value extraction and whitespace trimming
   * - Validation that name is available before creation
   * - Event emission to parent component for player creation
   * - Preventing creation with unavailable or invalid names
   */
  onCreate(): void {
    const name = (this.form.controls.newPlayerName.value || '').trim();
    const pin = (this.form.controls.pin.value || '').trim();
    if (name && this.nameCheck.available === true && this.form.controls.pin.valid) {
      this.createNew.emit({ name, pin });
    }
  }

  get showAvailable(): boolean {
    return this.nameCheck.available === true && !this.nameCheck.pending;
  }

  get showUnavailable(): boolean {
    return this.nameCheck.available === false && !this.nameCheck.pending;
  }

  get disabledCheck(): boolean {
    return this.form.invalid || this.nameCheck.pending;
  }

  get disabledCreate(): boolean {
    return this.isBusy || this.nameCheck.available !== true || this.form.controls.pin.invalid;
  }

  fieldError(ctrl: FormControl): string | null {
    return mapFieldError(ctrl);
  }
}

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InputOtpComponent } from '../../../../shared/components/input-otp/input-otp.component';
import { PinFormValue } from '../../models/join.models';
import { pinValidator } from '../../validators/pin.validator';
import { mapFieldError } from '../../utils/error-presenter';

type PinForm = FormGroup<{
  pin: FormControl<string>;
}>;

@Component({
  selector: 'app-name-conflict-resolve',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    InputOtpComponent,
  ],
  templateUrl: './name-conflict-resolve.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component Intent: Handles player name conflict resolution by providing PIN verification
 * for existing players or alternative creation of new player identities.
 *
 * This component provides:
 * - PIN input form with OTP-style interface for existing player verification
 * - Visual feedback for PIN validation and error states
 * - Alternative "I'm a new person" option for conflict resolution
 * - Back navigation to previous join steps
 * - Loading states and error message display
 * - Form validation with proper button state management
 * - Integration with parent component for conflict resolution workflow
 */
export class NameConflictResolveComponent {
  private fb = inject(FormBuilder).nonNullable;

  @Input({ required: true }) roomCode = '';
  @Input({ required: true }) playerName = '';
  @Input() isBusy = false;
  @Input() errorMessage: string | null = null;

  @Output() backClicked = new EventEmitter<void>();
  @Output() verifyPin = new EventEmitter<PinFormValue>();
  @Output() newPersonClicked = new EventEmitter<void>();

  pinForm: PinForm = this.fb.group({
    pin: this.fb.control('', { validators: [pinValidator(4)] }),
  });

  pinErrorId = 'pin-error';

  onBack(): void {
    this.backClicked.emit();
  }

  /**
   * Method Intent: Handle PIN verification submission when form is valid,
   * emitting the PIN value to parent component for server-side verification.
   *
   * This method handles:
   * - Form validation before submission
   * - PIN value extraction from form control
   * - Event emission with PIN data for parent processing
   * - Prevention of invalid PIN submissions
   */
  onVerify(): void {
    if (this.pinForm.valid) {
      this.verifyPin.emit({ pin: this.pinForm.controls.pin.value });
    }
  }

  /**
   * Method Intent: Handle automatic PIN verification when user completes
   * entering a 4-digit PIN through the OTP input component.
   *
   * This method handles:
   * - PIN length validation (must be 4 digits)
   * - Form value synchronization with OTP input
   * - Delayed verification to allow UI feedback
   * - Automatic submission when PIN is complete
   *
   * @param pin - The complete PIN string from OTP input
   */
  onPinComplete(pin: string): void {
    if ((pin || '').length === 4) {
      this.pinForm.controls.pin.setValue(pin);
      setTimeout(() => this.onVerify(), 200);
    }
  }

  onNewPerson(): void {
    this.newPersonClicked.emit();
  }

  isVerifyButtonDisabled(): boolean {
    const pin = this.pinForm.controls.pin.value;
    return this.pinForm.invalid || !pin || pin.length !== 4 || this.isBusy;
  }

  fieldError(ctrl: FormControl): string | null {
    return mapFieldError(ctrl);
  }
}

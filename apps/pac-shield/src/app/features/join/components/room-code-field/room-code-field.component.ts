import { ChangeDetectionStrategy, Component, EventEmitter, forwardRef, Input, OnDestroy, AfterViewInit, Output, ViewChild } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputOtpComponent } from '../../../../shared/components/input-otp/input-otp.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-room-code-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputOtpComponent],
  templateUrl: './room-code-field.component.html',
  styleUrls: ['./room-code-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RoomCodeFieldComponent),
      multi: true,
    },
  ],
})
/**
 * Component Intent: Custom form control component for room code input using OTP-style
 * interface with validation, accessibility, and reactive forms integration.
 *
 * This component provides:
 * - OTP-style input for multi-character room codes
 * - ControlValueAccessor implementation for reactive forms
 * - Auto-focus and keyboard navigation support
 * - Completion event emission for parent handling
 * - Error state display and accessibility attributes
 * - Automatic uppercase conversion and validation
 * - Disabled state handling for form validation
 * - Memory leak prevention with proper subscription cleanup
 */
export class RoomCodeFieldComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  @Input() length = 6;
  @Input() placeholder = '';
  @Input() errors: Record<string, any> | null = null;
  @Input() autofocus = false;
  @Input() disabled = false;
  @Input() dataTestId?: string;
  @Input() ariaLabel = '6-character Room Code';

  @Output() complete = new EventEmitter<void>();

  @ViewChild(InputOtpComponent) otp?: InputOtpComponent;

  inner = new FormControl<string>('', { nonNullable: true });

  private sub?: Subscription;
  private onChange?: (val: string) => void;
  private onTouched?: () => void;

  /**
   * Method Intent: Handle component initialization after view is ready,
   * implementing autofocus functionality for the first OTP input field.
   *
   * This method handles:
   * - Delayed execution to ensure DOM is ready
   * - First OTP input field selection and focus
   * - Safe DOM querying with null checks
   * - Keyboard navigation setup for accessibility
   * - Preventing focus issues during component lifecycle
   */
  ngAfterViewInit(): void {
    if (this.autofocus && this.otp) {
      queueMicrotask(() => this.otp!.focusFirst());
    }
  }

  // ControlValueAccessor
  writeValue(value: string | null): void {
    const v = (value ?? '').toString().toUpperCase();
    this.inner.setValue(v, { emitEvent: false });
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
    this.sub?.unsubscribe();
    this.sub = this.inner.valueChanges.subscribe((v) => this.onChange?.((v ?? '').toString().toUpperCase()));
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) this.inner.disable({ emitEvent: false });
    else this.inner.enable({ emitEvent: false });
  }

  // Event handlers
  /**
   * Method Intent: Handle OTP input completion by normalizing the value,
   * updating the form control, and emitting completion events.
   *
   * This method handles:
   * - Value normalization to uppercase for consistency
   * - Form control synchronization with normalized value
   * - Completion event emission for parent handling
   * - Touch state marking for form validation
   * - Event emission triggering for reactive forms
   * - Maintaining backward compatibility with existing behavior
   */
  onOtpComplete(): void {
    // Normalize to uppercase to mirror previous behavior
    const code = (this.inner.value || '').toUpperCase();
    this.inner.setValue(code, { emitEvent: true });
    // Emit completion signal (void per contract)
    this.complete.emit();
    // Mark touched for forms
    this.onTouched?.();
  }

  onOtpFocus(): void {
    this.onTouched?.();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

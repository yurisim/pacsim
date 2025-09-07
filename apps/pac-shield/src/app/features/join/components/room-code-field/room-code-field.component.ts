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

  ngAfterViewInit(): void {
    if (this.autofocus) {
      // Focus first OTP input after view init
      setTimeout(() => {
        const el = document.querySelector('input[data-otp-index="0"]') as HTMLInputElement | null;
        if (el) {
          el.focus();
          el.select();
        }
      });
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

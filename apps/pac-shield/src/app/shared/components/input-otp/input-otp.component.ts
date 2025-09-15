import { Component, Input, Output, EventEmitter, forwardRef, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-input-otp',
  standalone: true,
  imports: [CommonModule, MatInputModule, MatFormFieldModule],
  templateUrl: './input-otp.component.html',
  styleUrls: ['./input-otp.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputOtpComponent),
      multi: true
    }
  ]
})
export class InputOtpComponent implements ControlValueAccessor {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  @Input() length = 4;
  @Input() mask = false;
  @Input() disabled = false;
  @Input() placeholder = '';
  @Input() integerOnly = true;
  @Input() ariaLabel = 'OTP Input';

  @Output() complete = new EventEmitter<string>();

  values: string[] = [];
  private onChange = (_value: string) => {
    // This will be overridden by registerOnChange
  };
  private onTouched = () => {
    // This will be overridden by registerOnTouched
  };

  constructor() {
    this.initializeValues();
  }

  private initializeValues(): void {
    this.values = new Array(this.length).fill('');
  }

  onInputChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Handle integer only validation
    if (this.integerOnly && value && !/^\d$/.test(value)) {
      input.value = this.values[index] || '';
      return;
    }

    // Update values array
    this.values[index] = value;

    // Move to next input if value entered and not last input
    if (value && index < this.length - 1) {
      this.focusNext(index);
    }

    // Emit the complete value
    const completeValue = this.values.join('');
    this.onChange(completeValue);

    // Check if OTP is complete
    if (completeValue.length === this.length && !this.values.includes('')) {
      this.complete.emit(completeValue);
    }
  }

  onInputKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    // Handle backspace
    if (event.key === 'Backspace') {
      if (input.value === '' && index > 0) {
        // Move to previous input if current is empty
        this.focusPrevious(index);
      } else {
        // Clear current input
        this.values[index] = '';
        input.value = '';
        this.onChange(this.values.join(''));
      }
    }
    // Handle arrow keys
    else if (event.key === 'ArrowLeft' && index > 0) {
      this.focusPrevious(index);
    } else if (event.key === 'ArrowRight' && index < this.length - 1) {
      this.focusNext(index);
    }
    // Handle paste
    else if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.handlePaste();
    }
  }

  onInputPaste(event: ClipboardEvent, index: number): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    this.handlePasteData(pastedData, index);
  }

  private handlePaste(): void {
    navigator.clipboard.readText().then(text => {
      this.handlePasteData(text, 0);
    });
  }

  private handlePasteData(pastedData: string, startIndex: number): void {
    const cleanData = this.integerOnly ? pastedData.replace(/\D/g, '') : pastedData;
    const chars = cleanData.split('').slice(0, this.length - startIndex);

    chars.forEach((char, i) => {
      const index = startIndex + i;
      if (index < this.length) {
        this.values[index] = char;
        // This is now handled by the values array and Angular's rendering
      }
    });

    // Focus on next empty input or last input
    const nextEmptyIndex = this.values.findIndex((val, i) => i >= startIndex && val === '');
    const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : Math.min(startIndex + chars.length, this.length - 1);
    this.focusIndex(focusIndex);

    const completeValue = this.values.join('');
    this.onChange(completeValue);

    if (completeValue.length === this.length && !this.values.includes('')) {
      this.complete.emit(completeValue);
    }
  }

  private focusNext(index: number): void {
    const nextIndex = Math.min(index + 1, this.length - 1);
    this.focusIndex(nextIndex);
  }

  private focusPrevious(index: number): void {
    const prevIndex = Math.max(index - 1, 0);
    this.focusIndex(prevIndex);
  }

  private getInputElement(index: number): HTMLInputElement | null {
    return this.otpInputs?.toArray()[index]?.nativeElement ?? null;
  }

  focusIndex(index: number, select = true): void {
    setTimeout(() => {
      const el = this.getInputElement(index);
      if (el && !el.disabled) {
        el.focus();
        if (select) {
          el.select();
        }
      }
    });
  }

  focusFirst(): void {
    this.focusIndex(0);
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    if (value) {
      const chars = value.split('').slice(0, this.length);
      this.values = [...chars, ...new Array(this.length - chars.length).fill('')];

      // Update input elements
      // No longer need to manually update inputs, Angular handles it via `values`
    } else {
      this.initializeValues();
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputFocus(): void {
    this.onTouched();
  }

  trackByIndex(index: number): number {
    return index;
  }

  clear(): void {
    this.initializeValues();
    this.onChange('');

    // Clear all input elements
    // Angular will clear inputs based on `values` array change. We just need to focus.
    this.focusFirst();
  }
}

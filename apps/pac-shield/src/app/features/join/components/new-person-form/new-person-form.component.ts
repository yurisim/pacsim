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

type NewPersonForm = FormGroup<{
  newPlayerName: FormControl<string>;
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
  ],
  templateUrl: './new-person-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewPersonFormComponent implements OnChanges {
  private fb = inject(FormBuilder).nonNullable;

  @Input({ required: true }) value: NewPersonFormValue = { newPlayerName: '' };
  @Input({ required: true }) nameCheck: NameCheckState = { pending: false, available: null, error: null };
  @Input() isBusy = false;

  @Output() backClicked = new EventEmitter<void>();
  @Output() checkAvailability = new EventEmitter<string>();
  @Output() createNew = new EventEmitter<string>();

  form: NewPersonForm = this.fb.group({
    newPlayerName: this.fb.control('', { validators: [Validators.required, Validators.minLength(2)] }),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value) {
      this.form.patchValue({ newPlayerName: this.value.newPlayerName ?? '' }, { emitEvent: false });
    }
  }

  onBack(): void {
    this.backClicked.emit();
  }

  onCheck(): void {
    const name = (this.form.controls.newPlayerName.value || '').trim();
    if (name) {
      this.checkAvailability.emit(name);
    }
  }

  onCreate(): void {
    const name = (this.form.controls.newPlayerName.value || '').trim();
    if (name && this.nameCheck.available === true) {
      this.createNew.emit(name);
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
    return this.isBusy || this.nameCheck.available !== true;
  }

  fieldError(ctrl: FormControl): string | null {
    return mapFieldError(ctrl);
  }
}

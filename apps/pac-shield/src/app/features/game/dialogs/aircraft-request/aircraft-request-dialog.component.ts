import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import * as AllocationActions from '../../../../store/allocation/allocation.actions';
import * as AllocationSelectors from '../../../../store/allocation/allocation.selectors';
import { AircraftType } from '../../../../generated/enums';

export interface AircraftRequestDialogData {
  allocationCycleId: number;
  teamId: number;
  currentTurn: number;
}

export interface AircraftRequestDialogResult {
  allocationCycleId: number;
  teamId: number;
  aircraftType: AircraftType;
  quantityRequested: number;
  missionJustification: string;
  priority: number;
  rationale: string;
}

@Component({
  selector: 'app-aircraft-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="aircraft-request-dialog">
      <div mat-dialog-title class="dialog-header">
        <mat-icon class="title-icon">flight_takeoff</mat-icon>
        <div class="title-content">
          <h2>Request Aircraft</h2>
          <p class="subtitle">Submit mobility aircraft request for Turn {{ data.currentTurn }}</p>
        </div>
      </div>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="requestForm" class="request-form">

          <!-- Aircraft Type Selection -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Aircraft Type</mat-label>
            <mat-select formControlName="aircraftType" required>
              <mat-option value="C17">C-17 Globemaster III</mat-option>
              <mat-option value="C130">C-130 Hercules</mat-option>
              <mat-option value="C5">C-5 Galaxy</mat-option>
            </mat-select>
            <mat-hint>Select the type of mobility aircraft required</mat-hint>
            <mat-error *ngIf="requestForm.get('aircraftType')?.hasError('required')">
              Aircraft type is required
            </mat-error>
          </mat-form-field>

          <!-- Quantity Requested -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Quantity Requested</mat-label>
            <input
              matInput
              type="number"
              formControlName="quantityRequested"
              min="1"
              max="10"
              required
            >
            <mat-hint>Number of aircraft needed (1-10)</mat-hint>
            <mat-error *ngIf="requestForm.get('quantityRequested')?.hasError('required')">
              Quantity is required
            </mat-error>
            <mat-error *ngIf="requestForm.get('quantityRequested')?.hasError('min')">
              Minimum quantity is 1
            </mat-error>
            <mat-error *ngIf="requestForm.get('quantityRequested')?.hasError('max')">
              Maximum quantity is 10
            </mat-error>
          </mat-form-field>

          <!-- Mission Justification -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Mission Justification</mat-label>
            <mat-select formControlName="missionJustification" required>
              <mat-option value="FOS Establishment">FOS Establishment</mat-option>
              <mat-option value="Resupply Operations">Resupply Operations</mat-option>
              <mat-option value="MEDCOM Support">MEDCOM Support</mat-option>
              <mat-option value="Personnel Transport">Personnel Transport</mat-option>
              <mat-option value="Equipment Delivery">Equipment Delivery</mat-option>
              <mat-option value="Emergency Response">Emergency Response</mat-option>
              <mat-option value="Tactical Repositioning">Tactical Repositioning</mat-option>
            </mat-select>
            <mat-hint>Primary mission purpose for requested aircraft</mat-hint>
            <mat-error *ngIf="requestForm.get('missionJustification')?.hasError('required')">
              Mission justification is required
            </mat-error>
          </mat-form-field>

          <!-- Priority Level -->
          <div class="priority-section">
            <label class="priority-label" for="priority-slider">Priority Level: {{ requestForm.get('priority')?.value }}</label>
            <mat-slider
              class="priority-slider"
              id="priority-slider"
              min="1"
              max="5"
              step="1"
              discrete
              showTickMarks
            >
              <input matSliderThumb formControlName="priority">
            </mat-slider>
            <div class="priority-hints">
              <span class="priority-hint-low">5 - Routine</span>
              <span class="priority-hint-high">1 - Critical</span>
            </div>
          </div>

          <!-- Detailed Rationale -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Detailed Rationale</mat-label>
            <textarea
              matInput
              formControlName="rationale"
              rows="4"
              maxlength="500"
              required
              placeholder="Provide detailed justification for this aircraft request, including operational requirements, timelines, and strategic importance..."
            ></textarea>
            <mat-hint align="end">
              {{ requestForm.get('rationale')?.value?.length || 0 }}/500 characters
            </mat-hint>
            <mat-error *ngIf="requestForm.get('rationale')?.hasError('required')">
              Detailed rationale is required
            </mat-error>
            <mat-error *ngIf="requestForm.get('rationale')?.hasError('minlength')">
              Rationale must be at least 50 characters
            </mat-error>
          </mat-form-field>

          <!-- Form Validation Summary -->
          <div *ngIf="formError$ | async as error" class="error-message">
            <mat-icon>error</mat-icon>
            <span>{{ error }}</span>
          </div>

        </form>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button
          mat-button
          (click)="onCancel()"
          [disabled]="isSubmitting$ | async"
        >
          Cancel
        </button>
        <button
          mat-flat-button
          color="primary"
          (click)="onSubmit()"
          [disabled]="!requestForm.valid || (isSubmitting$ | async)"
        >
          <mat-spinner
            *ngIf="isSubmitting$ | async"
            diameter="20"
            class="button-spinner"
          ></mat-spinner>
          <span *ngIf="(isSubmitting$ | async) === false">Submit Request</span>
          <span *ngIf="(isSubmitting$ | async) === true">Submitting...</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .aircraft-request-dialog {
      min-width: 600px;
      max-width: 800px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px 24px 16px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .title-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--md-sys-color-primary);
    }

    .title-content h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .subtitle {
      margin: 4px 0 0;
      font-size: 14px;
      color: var(--md-sys-color-on-surface-variant);
    }

    .dialog-content {
      padding: 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .request-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .full-width {
      width: 100%;
    }

    .priority-section {
      padding: 16px 0;
    }

    .priority-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      margin-bottom: 12px;
    }

    .priority-slider {
      width: 100%;
      margin: 12px 0;
    }

    .priority-hints {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant);
      margin-top: 8px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background-color: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
      border-radius: 8px;
      font-size: 14px;
    }

    .error-message mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .dialog-actions {
      padding: 16px 24px 24px;
      justify-content: flex-end;
      gap: 12px;
    }

    .button-spinner {
      margin-right: 8px;
    }

    /* Material 3 form field styling */
    mat-form-field {
      --mdc-filled-text-field-container-color: var(--md-sys-color-surface-variant);
      --mdc-outlined-text-field-outline-color: var(--md-sys-color-outline);
    }

    /* Responsive adjustments */
    @media (max-width: 600px) {
      .aircraft-request-dialog {
        min-width: 95vw;
        max-width: 95vw;
      }
    }
  `]
})
export class AircraftRequestDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Injected services
  private dialogRef = inject(MatDialogRef<AircraftRequestDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as AircraftRequestDialogData;
  private fb = inject(FormBuilder);
  private store = inject(Store);

  requestForm: FormGroup;

  // Observable streams
  isSubmitting$ = this.store.select(AllocationSelectors.selectFormLoading);
  formError$ = this.store.select(AllocationSelectors.selectFormError);

  constructor() {
    this.requestForm = this.createForm();
  }

  ngOnInit(): void {
    // Initialize form with data
    this.requestForm.patchValue({
      allocationCycleId: this.data.allocationCycleId,
      teamId: this.data.teamId,
    });

    // Clear any existing errors
    this.store.dispatch(AllocationActions.clearAllocationErrors());

    // Listen for successful submission
    this.store.select(AllocationSelectors.selectFormLoading)
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        if (!loading && this.requestForm.valid) {
          // Check if we just completed a successful submission
          combineLatest([
            this.store.select(AllocationSelectors.selectFormError),
            this.store.select(AllocationSelectors.selectAllRequests)
          ]).pipe(takeUntil(this.destroy$))
            .subscribe(([error, requests]) => {
              if (!error && requests.length > 0) {
                // Success - close dialog
                this.dialogRef.close(true);
              }
            });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      allocationCycleId: [null, Validators.required],
      teamId: [null, Validators.required],
      aircraftType: [null, Validators.required],
      quantityRequested: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      missionJustification: [null, Validators.required],
      priority: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
      rationale: [null, [Validators.required, Validators.minLength(50), Validators.maxLength(500)]]
    });
  }

  onSubmit(): void {
    if (this.requestForm.valid) {
      const formValue = this.requestForm.value;

      this.store.dispatch(AllocationActions.createAircraftRequest({
        allocationCycleId: formValue.allocationCycleId,
        teamId: formValue.teamId,
        aircraftType: formValue.aircraftType,
        quantityRequested: formValue.quantityRequested,
        missionJustification: formValue.missionJustification,
        priority: formValue.priority,
        rationale: formValue.rationale
      }));
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

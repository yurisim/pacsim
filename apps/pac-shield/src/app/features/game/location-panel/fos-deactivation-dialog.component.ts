import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface FosDeactivationDialogData {
  fosName: string;
  fosDisplayNumber: number;
  currentTurn: number;
  assignedTeamName?: string;
}

export interface FosDeactivationDialogResult {
  confirmed: boolean;
}

@Component({
  selector: 'app-fos-deactivation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="fos-deactivation-dialog">
      <div mat-dialog-title class="flex items-center gap-3 pb-4">
        <mat-icon class="md-sys-color-error text-[32px]">power_settings_new</mat-icon>
        <div>
          <h2 class="md-typescale-headline-small font-medium mb-1">Deactivate {{ data.fosName }}</h2>
          <p class="md-typescale-body-medium md-sys-color-on-surface-variant">
            Confirm FOS deactivation and team assignment removal
          </p>
        </div>
      </div>

      <div mat-dialog-content class="py-4">
        <div class="deactivation-details md-sys-bg-surface-container-highest md-shape-corner-sm p-4 mb-6">
          <div class="flex items-center gap-3 mb-3">
            <mat-icon class="md-sys-color-primary">info</mat-icon>
            <span class="md-typescale-title-medium font-medium">Deactivation Details</span>
          </div>
          <div class="details-grid space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="md-sys-color-on-surface-variant">FOS ID:</span>
              <span class="font-medium">{{ data.fosDisplayNumber }}</span>
            </div>
            <div class="flex justify-between">
              <span class="md-sys-color-on-surface-variant">Current Turn:</span>
              <span class="font-medium">{{ data.currentTurn }}</span>
            </div>
            <div class="flex justify-between">
              <span class="md-sys-color-on-surface-variant">Status:</span>
              <span class="font-medium md-sys-color-error">Active → Inactive</span>
            </div>
            @if (data.assignedTeamName) {
              <div class="flex justify-between">
                <span class="md-sys-color-on-surface-variant">Currently Assigned:</span>
                <span class="font-medium">{{ data.assignedTeamName }}</span>
              </div>
            }
          </div>
        </div>

        <div class="warning-message md-sys-bg-error-container md-shape-corner-sm p-4">
          <div class="flex items-start gap-3">
            <mat-icon class="md-sys-color-error mt-0.5">warning</mat-icon>
            <div class="flex-1">
              <p class="md-typescale-body-medium font-medium md-sys-color-on-error-container mb-1">
                Are you sure you want to deactivate this FOS?
              </p>
              <p class="md-typescale-body-small md-sys-color-on-error-container opacity-90">
                This action will remove the FOS from active duty and unassign it from the current team.
                The FOS can be reactivated later if needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div mat-dialog-actions class="flex gap-3 pt-4">
        <button
          mat-button
          (click)="onCancel()"
          class="flex-1">
          Cancel
        </button>
        <button
          mat-button="filled"
          color="warn"
          (click)="onConfirm()"
          class="flex-1">
          <mat-icon class="mr-2">power_settings_new</mat-icon>
          Deactivate FOS
        </button>
      </div>
    </div>
  `,
  styles: [`
    .fos-deactivation-dialog {
      width: 100%;
      max-width: 480px;
    }

    .details-grid {
      line-height: 1.5;
    }

    .warning-message {
      border-left: 4px solid rgb(var(--md-sys-color-error));
    }

    mat-dialog-actions {
      margin: 0;
      padding: 16px 0 0 0;
    }
  `]
})
export class FosDeactivationDialogComponent {
  data = inject<FosDeactivationDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FosDeactivationDialogComponent>);

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  onConfirm(): void {
    this.dialogRef.close({ confirmed: true });
  }
}
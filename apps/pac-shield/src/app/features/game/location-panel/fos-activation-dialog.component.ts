import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { Team } from '../../../generated';

export interface FosActivationDialogData {
  fosName: string;
  fosIdNumber: number;
  availableTeams: Team[];
  currentTurn: number;
}

export interface FosActivationDialogResult {
  confirmed: boolean;
  selectedTeamId?: number;
}

@Component({
  selector: 'app-fos-activation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule
  ],
  template: `
    <div class="fos-activation-dialog">
      <div mat-dialog-title class="flex items-center gap-3 pb-4">
        <mat-icon class="md-sys-color-accent text-[32px]">festival</mat-icon>
        <div>
          <h2 class="md-typescale-headline-small font-medium mb-1">Activate {{ data.fosName }}</h2>
          <p class="md-typescale-body-medium md-sys-color-on-surface-variant">
            Confirm FOS activation and team assignment
          </p>
        </div>
      </div>

      <div mat-dialog-content class="py-4">
        <div class="activation-details md-sys-bg-surface-container-highest md-shape-corner-sm p-4 mb-6">
          <div class="flex items-center gap-3 mb-3">
            <mat-icon class="md-sys-color-primary">info</mat-icon>
            <span class="md-typescale-title-medium font-medium">Activation Details</span>
          </div>
          <div class="details-grid space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="md-sys-color-on-surface-variant">FOS ID:</span>
              <span class="font-medium">{{ data.fosIdNumber }}</span>
            </div>
            <div class="flex justify-between">
              <span class="md-sys-color-on-surface-variant">Current Turn:</span>
              <span class="font-medium">{{ data.currentTurn }}</span>
            </div>
            <div class="flex justify-between">
              <span class="md-sys-color-on-surface-variant">Status:</span>
              <span class="font-medium md-sys-color-tertiary">Inactive → Active</span>
            </div>
          </div>
        </div>

        <div class="team-selection">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Assign to Team</mat-label>
            <mat-select [(value)]="selectedTeamId" required>
              @for (team of data.availableTeams; track team.id) {
                <mat-option [value]="team.id">
                  {{ team.name }} ({{ team.type }})
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
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
          [disabled]="!selectedTeamId"
          (click)="onConfirm()"
          class="flex-1">
          <mat-icon class="mr-2">power_settings_new</mat-icon>
          Activate FOS
        </button>
      </div>
    </div>
  `,
  styles: [`
    .fos-activation-dialog {
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

    mat-form-field {
      margin-bottom: 8px;
    }
  `]
})
export class FosActivationDialogComponent {
  data = inject<FosActivationDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FosActivationDialogComponent>);

  selectedTeamId: number | null = null;

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  onConfirm(): void {
    if (this.selectedTeamId) {
      this.dialogRef.close({
        confirmed: true,
        selectedTeamId: this.selectedTeamId
      });
    }
  }
}

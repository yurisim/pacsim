import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { AircraftType } from '../../../../generated/enums';
import { Team } from '../../../../generated/team/team.entity';
import { environment } from '../../../../../environments/environment';

export interface AircraftSpawnDialogData {
  gameId: number;
  teams: Team[];
}

export interface AircraftSpawnResult {
  type: AircraftType;
  subtype?: string;
  teamId: number;
  strength: number;
  rangeHexes: number;
  locationFosId?: string;
  locationHex?: string;
}

/**
 * Dialog for GM to spawn new aircraft instances
 */
@Component({
  selector: 'app-aircraft-spawn-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>flight_takeoff</mat-icon>
      Spawn Aircraft
    </h2>

    <mat-dialog-content>
      <form [formGroup]="spawnForm" class="flex flex-col gap-4">
        <!-- Aircraft Type -->
        <mat-form-field appearance="outline">
          <mat-label>Aircraft Type</mat-label>
          <mat-select formControlName="type" (selectionChange)="onTypeChange()">
            <mat-option value="C130">C-130 Hercules (AW)</mat-option>
            <mat-option value="C17">C-17 Globemaster (ME)</mat-option>
            <mat-option value="C5">C-5 Galaxy</mat-option>
            <mat-option value="F16">F-16 Fighting Falcon (VIP)</mat-option>
            <mat-option value="F22">F-22 Raptor (RPT)</mat-option>
          </mat-select>
          <mat-hint>Callsign prefix shown in parentheses</mat-hint>
        </mat-form-field>

        <!-- C5 Subtype (only shown for C5) -->
        @if (spawnForm.get('type')?.value === 'C5') {
          <mat-form-field appearance="outline">
            <mat-label>C-5 Variant</mat-label>
            <mat-select formControlName="subtype">
              <mat-option value="BOBCAT">Bobcat (BO)</mat-option>
              <mat-option value="RHINO">Rhino (RH)</mat-option>
            </mat-select>
          </mat-form-field>
        }

        <!-- Team Assignment -->
        <mat-form-field appearance="outline">
          <mat-label>Assign to Team</mat-label>
          <mat-select formControlName="teamId">
            @for (team of data.teams; track team.id) {
              <mat-option [value]="team.id">{{ team.type }} ({{ team.name }})</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Starting Location -->
        <div class="text-sm font-medium mb-2">Starting Location</div>

        <mat-form-field appearance="outline">
          <mat-label>FOS/MOB ID</mat-label>
          <input matInput formControlName="locationFosId" placeholder="e.g., ANDERSEN, KADENA">
          <mat-hint>Forward Operating Site identifier</mat-hint>
        </mat-form-field>

        <div class="text-center text-xs text-gray-500">OR</div>

        <mat-form-field appearance="outline">
          <mat-label>Hex Coordinate</mat-label>
          <input matInput formControlName="locationHex" placeholder="e.g., 0x1234">
          <mat-hint>Hex grid coordinate</mat-hint>
        </mat-form-field>

        @if (spawnForm.hasError('locationRequired')) {
          <div class="text-red-500 text-xs">
            Either FOS ID or Hex coordinate is required
          </div>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSpawn()"
        [disabled]="!spawnForm.valid || isSpawning">
        @if (isSpawning) {
          <ng-container>
            <mat-icon class="animate-spin">refresh</mat-icon>
            Spawning...
          </ng-container>
        } @else {
          <ng-container>
            <mat-icon>add</mat-icon>
            Spawn Aircraft
          </ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 400px;
      max-width: 500px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class AircraftSpawnDialogComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private dialogRef = inject(MatDialogRef<AircraftSpawnDialogComponent>);
  readonly data: AircraftSpawnDialogData = inject(MAT_DIALOG_DATA);

  isSpawning = false;

  spawnForm: FormGroup;

  constructor() {
    this.spawnForm = this.fb.group({
      type: ['C130', Validators.required],
      subtype: [null],
      teamId: [null, Validators.required],
      locationFosId: [''],
      locationHex: [''],
    }, {
      validators: this.locationValidator
    });

    // Set default team to first team
    if (this.data.teams.length > 0) {
      this.spawnForm.patchValue({ teamId: this.data.teams[0].id });
    }
  }

  /**
   * Custom validator to ensure either locationFosId or locationHex is provided
   */
  private locationValidator(form: FormGroup) {
    const fosId = form.get('locationFosId')?.value;
    const hex = form.get('locationHex')?.value;

    if (!fosId && !hex) {
      return { locationRequired: true };
    }
    return null;
  }

  /**
   * Update default values when aircraft type changes
   */
  onTypeChange(): void {
    const type = this.spawnForm.get('type')?.value;

    // Clear subtype if not C5
    if (type !== 'C5') {
      this.spawnForm.patchValue({ subtype: null });
    } else if (type === 'C5' && !this.spawnForm.get('subtype')?.value) {
      // Set default subtype for C5
      this.spawnForm.patchValue({ subtype: 'BOBCAT' });
    }
  }

  /**
   * Spawn the aircraft via API
   */
  async onSpawn(): Promise<void> {
    if (!this.spawnForm.valid) {
      return;
    }

    this.isSpawning = true;

    try {
      const formValue = this.spawnForm.value;
      const payload = {
        gameId: this.data.gameId,
        type: formValue.type,
        subtype: formValue.type === 'C5' ? formValue.subtype : null,
        teamId: formValue.teamId,
        locationFosId: formValue.locationFosId || undefined,
        locationHex: formValue.locationHex || undefined,
      };

      const result = await this.http.post(
        `${environment.apiUrl}/allocation/aircraft/spawn`,
        payload
      ).toPromise();

      // Close dialog with success result
      this.dialogRef.close(result);
    } catch (error) {
      console.error('Failed to spawn aircraft:', error);
      alert('Failed to spawn aircraft. Check console for details.');
      this.isSpawning = false;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

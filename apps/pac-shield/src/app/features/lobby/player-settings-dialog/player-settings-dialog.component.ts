import { Component, input, output, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { playerRole, PlayerRole } from '../../../generated/enums';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface PlayerSettings {
  name: string;
  role: PlayerRole;
}

interface PlayerSettingsDialogData {
  currentName: string;
  currentRole: PlayerRole;
}

@Component({
  selector: 'app-player-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-settings-dialog.component.html',
  styleUrls: ['./player-settings-dialog.component.scss'],
})
export class PlayerSettingsDialogComponent {
  // Keep legacy inputs/outputs for backward compatibility with old overlay usage.
  // Default visible to true so content renders when opened via MatDialog (no binding provided).
  visible = input<boolean>(true);
  currentName = input<string>('');
  currentRole = input<PlayerRole>('PLAYER');

  save = output<PlayerSettings>();
  cancelled = output<void>();

  name = '';
  role: PlayerRole | null = null;
  roleOptions: PlayerRole[] = [...playerRole];

  // Optional injections so the component works both with and without MatDialog.
  private dialogRef = inject(MatDialogRef<PlayerSettingsDialogComponent, PlayerSettings>, { optional: true });
  private dialogData = inject(MAT_DIALOG_DATA, { optional: true }) as PlayerSettingsDialogData | null;

  constructor() {
    // If opened via MatDialog, initialize from injected data.
    if (this.dialogData) {
      this.name = this.dialogData.currentName ?? '';
      this.role = this.dialogData.currentRole ?? 'PLAYER';
    }

    // Legacy behavior: when used as an inline overlay, initialize on visible() change.
    // When opened via MatDialog, do NOT overwrite injected dialog data.
    effect(() => {
      // Only mirror inputs when not using MatDialog (legacy inline usage)
      if (!this.dialogRef && this.visible()) {
        this.name = this.currentName();
        this.role = this.currentRole();
      }
    });
  }

  get isFormValid(): boolean {
    return this.name.trim().length > 0 && this.role !== null && this.role !== undefined;
  }

  saveSettings(): void {
    if (!this.isFormValid || this.role === null) return;
    const payload: PlayerSettings = {
      name: this.name.trim(),
      role: this.role,
    };
    if (this.dialogRef) {
      this.dialogRef.close(payload);
    } else {
      this.save.emit(payload);
    }
  }

  cancelSettings(): void {
    this.name = this.currentName();
    this.role = this.currentRole();
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.cancelled.emit();
    }
  }
}

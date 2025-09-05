import { Component, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { playerRole, PlayerRole } from '../../../generated/enums';

export interface PlayerSettings {
  name: string;
  role: PlayerRole;
}

@Component({
  selector: 'app-player-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-settings-dialog.component.html',
  styleUrls: ['./player-settings-dialog.component.scss'],
})
export class PlayerSettingsDialogComponent {
  visible = input<boolean>(false);
  currentName = input<string>('');
  currentRole = input<PlayerRole>('PLAYER');

  save = output<PlayerSettings>();
  cancelled = output<void>();

  name = '';
  role: PlayerRole | null = null;
  roleOptions: PlayerRole[] = [...playerRole];

  constructor() {
    effect(() => {
      if (this.visible()) {
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
    this.save.emit({
      name: this.name.trim(),
      role: this.role,
    });
  }

  cancelSettings(): void {
    this.name = this.currentName();
    this.role = this.currentRole();
    this.cancelled.emit();
  }
}

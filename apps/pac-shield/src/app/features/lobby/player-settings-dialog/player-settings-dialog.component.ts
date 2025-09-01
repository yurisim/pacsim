import { Component, input, output, OnInit, effect, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { playerRole, PlayerRole } from '../../../generated/enums';

export interface PlayerSettings {
  name: string;
  role: PlayerRole;
}

@Component({
  selector: 'app-player-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    AutoCompleteModule,
  ],
  templateUrl: './player-settings-dialog.component.html',
  styleUrls: ['./player-settings-dialog.component.scss'],
})
export class PlayerSettingsDialogComponent implements OnInit {
  visible = input<boolean>(false);
  currentName = input<string>('');
  currentRole = input<PlayerRole>('PLAYER');

  save = output<PlayerSettings>();
  cancelled = output<void>();

  name = '';
  role: { label: string; value: PlayerRole } | null = null;
  roleOptions: { label: string; value: PlayerRole }[] = [];

  readonly allRoleOptions = playerRole.map(role => ({
    label: this.formatRoleLabel(role),
    value: role
  }));

  constructor() {
    // Watch for dialog visibility changes and update form when opened
    effect(() => {
      if (this.visible()) {
        this.name = this.currentName();
        this.role = this.allRoleOptions.find(option => option.value === this.currentRole()) || null;
      }
    });
  }

  ngOnInit() {
    this.roleOptions = [...this.allRoleOptions];
  }

  filterRoles(event: any): void {
    const query = event.query.toLowerCase();
    this.roleOptions = this.allRoleOptions.filter(option =>
      option.label.toLowerCase().includes(query)
    );
  }

  private formatRoleLabel(role: PlayerRole): string {
    switch (role) {
      case 'GM':
        return 'Game Master';
      default:
        return role.charAt(0) + role.slice(1).toLowerCase().replace('_', ' ');
    }
  }

  get isFormValid(): boolean {
    return this.name.trim().length > 0;
  }

  saveSettings(): void {
    if (this.isFormValid && this.role) {
      this.save.emit({
        name: this.name.trim(),
        role: this.role.value,
      });
    }
  }

  cancelSettings(): void {
    this.name = this.currentName();
    this.role = this.allRoleOptions.find(option => option.value === this.currentRole()) || null;
    this.cancelled.emit();
  }
}

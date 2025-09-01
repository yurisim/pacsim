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
  role: { label: string; value: PlayerRole } | PlayerRole | null = null;
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
        return 'GM';
      case 'PLAYER':
        return 'PLAYER';
      case 'COMMANDER':
        return 'COMMANDER';
      case 'DEPUTY':
        return 'DEPUTY';
      case 'STRATEGIST':
        return 'STRATEGIST';
      default:
        return role;
    }
  }

  get isFormValid(): boolean {
    return this.name.trim().length > 0 && this.role !== null && this.role !== undefined;
  }

  saveSettings(): void {
    if (this.isFormValid) {
      // Handle both object and string values from AutoComplete
      const roleValue = typeof this.role === 'object' ? this.role!.value : this.role as PlayerRole;
      const payload = {
        name: this.name.trim(),
        role: roleValue,
      };
      this.save.emit(payload);
    }
  }

  cancelSettings(): void {
    console.log('🚫 Dialog cancelSettings called');
    this.name = this.currentName();
    this.role = this.allRoleOptions.find(option => option.value === this.currentRole()) || null;
    console.log('🚫 Emitting cancelled event');
    this.cancelled.emit();
  }
}

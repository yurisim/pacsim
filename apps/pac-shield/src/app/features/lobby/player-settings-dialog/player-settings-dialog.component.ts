import { Component, inject, input, output } from '@angular/core';
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
export class PlayerSettingsDialogComponent {
  visible = input<boolean>(false);
  currentName = input<string>('');
  currentRole = input<PlayerRole>('PLAYER');
  
  save = output<PlayerSettings>();
  cancel = output<void>();

  name = '';
  role: PlayerRole = 'PLAYER';
  roleOptions: { label: string; value: PlayerRole }[] = [];
  
  readonly allRoleOptions = playerRole.map(role => ({
    label: this.formatRoleLabel(role),
    value: role
  }));

  ngOnInit() {
    this.name = this.currentName();
    this.role = this.currentRole();
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
    if (this.isFormValid) {
      const roleValue = typeof this.role === 'object' ? (this.role as any).value : this.role;
      this.save.emit({
        name: this.name.trim(),
        role: roleValue,
      });
    }
  }

  cancelSettings(): void {
    this.name = this.currentName();
    this.role = this.currentRole();
    this.cancel.emit();
  }
}
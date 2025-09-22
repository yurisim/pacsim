import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AccessStatus } from '../../../generated/enums';

export interface CountryAccessDialogData {
  action: 'grant' | 'revoke' | 'overflight';
  country: string;
  accessLevel: AccessStatus;
}

@Component({
  selector: 'app-country-access-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './country-access-dialog.component.html',
  styleUrls: ['./country-access-dialog.component.scss']
})
export class CountryAccessDialogComponent {
  private dialogRef = inject(MatDialogRef<CountryAccessDialogComponent, boolean>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: CountryAccessDialogData) {}

  get title(): string {
    switch (this.data.action) {
      case 'grant': return 'Grant Full Access';
      case 'revoke': return 'Revoke Access';
      case 'overflight': return 'Set Overflight Only';
      default: return 'Update Country Access';
    }
  }

  get description(): string {
    const country = this.data.country;
    switch (this.data.action) {
      case 'grant':
        return `Grant full military access to ${country}? This will allow all aircraft operations including landing, refueling, and basing within the country.`;
      case 'revoke':
        return `Revoke all access to ${country}? This will prohibit all military aircraft operations within the country's airspace and territory.`;
      case 'overflight':
        return `Set ${country} to overflight only? This will allow aircraft to fly over the country but not land or operate from bases within it.`;
      default:
        return 'Update country access permissions?';
    }
  }

  get icon(): string {
    switch (this.data.action) {
      case 'grant': return 'check_circle';
      case 'revoke': return 'cancel';
      case 'overflight': return 'flight';
      default: return 'help';
    }
  }

  get confirmButtonText(): string {
    switch (this.data.action) {
      case 'grant': return 'Grant Access';
      case 'revoke': return 'Revoke Access';
      case 'overflight': return 'Set Overflight Only';
      default: return 'Confirm';
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
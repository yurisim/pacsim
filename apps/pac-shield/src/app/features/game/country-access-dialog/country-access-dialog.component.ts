import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AccessStatus } from '../../../generated/enums';

/**
 * Dialog data describing a country access change request.
 * @interface
 * @property action Type of access change being requested
 * @property country ISO3 code or display name of the target country
 * @property accessLevel Access level to confirm in this dialog
 */
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
/**
 * Confirmation dialog for managing country access levels (Full, Overflight, None).
 *
 * Presents a contextual title, description, and icon derived from the supplied data.
 * Emits true/false via MatDialogRef to indicate user confirmation or cancellation.
 *
 * @class CountryAccessDialogComponent
 */
export class CountryAccessDialogComponent {
  private dialogRef = inject(MatDialogRef<CountryAccessDialogComponent, boolean>);

  /**
   * Dialog input data injected via Angular's inject() API.
   */
  public data = inject<CountryAccessDialogData>(MAT_DIALOG_DATA);

  /**
   * Human-readable dialog title derived from the action type.
   * @returns Title string appropriate for the requested action
   */
  get title(): string {
    switch (this.data.action) {
      case 'grant': return 'Grant Full Access';
      case 'revoke': return 'Revoke Access';
      case 'overflight': return 'Set Overflight Only';
      default: return 'Update Country Access';
    }
  }

  /**
   * Contextual description that explains the operational impact of the chosen action.
   * @returns Explanatory text describing consequences of the update
   */
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

  /**
   * Material icon name representing the current action.
   * @returns Icon string to render in the dialog header
   */
  get icon(): string {
    switch (this.data.action) {
      case 'grant': return 'check_circle';
      case 'revoke': return 'cancel';
      case 'overflight': return 'flight';
      default: return 'help';
    }
  }

  /**
   * Primary action button text derived from the action type.
   * @returns Call-to-action label for the confirm button
   */
  get confirmButtonText(): string {
    switch (this.data.action) {
      case 'grant': return 'Grant Access';
      case 'revoke': return 'Revoke Access';
      case 'overflight': return 'Set Overflight Only';
      default: return 'Confirm';
    }
  }

  /**
   * Dismisses the dialog indicating the action was cancelled.
   * @returns void
   */
  cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * Confirms the requested access change and closes the dialog with a positive result.
   * @returns void
   */
  confirm(): void {
    this.dialogRef.close(true);
  }
}

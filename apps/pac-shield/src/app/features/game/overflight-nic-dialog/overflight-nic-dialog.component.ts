import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-overflight-nic-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './overflight-nic-dialog.component.html'
})
/**
 * Confirmation dialog for setting a country's access to "Overflight Only".
 *
 * The dialog presents two actions:
 * - Cancel: closes the dialog with false
 * - Set Overflight Only: closes the dialog with true
 *
 * Consumers should inspect the boolean emitted by MatDialogRef.afterClosed()
 * to determine the user's intent and perform the corresponding API update.
 *
 * @class OverflightNicDialogComponent
 */
export class OverflightNicDialogComponent {
  /**
   * Material dialog reference used to close this dialog with a boolean result.
   * Returns true when the user confirms "Set Overflight Only", false when cancelled.
   * @private
   */
  private dialogRef = inject(MatDialogRef<OverflightNicDialogComponent, boolean>);

  /**
   * Closes the dialog indicating the user cancelled the action.
   * @returns void
   * @example
   * // Example: open the dialog and handle a cancellation
   * const ref = dialog.open(OverflightNicDialogComponent);
   * ref.afterClosed().subscribe((confirmed) => {
   *   if (!confirmed) {
   *     // user cancelled
   *   }
   * });
   */
  cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * Closes the dialog indicating the user confirmed "Overflight Only".
   * @returns void
   * @example
   * // Example: open the dialog and proceed when confirmed
   * const ref = dialog.open(OverflightNicDialogComponent);
   * ref.afterClosed().subscribe((confirmed) => {
   *   if (confirmed) {
   *     // proceed with setting Overflight Only
   *   }
   * });
   */
  submit(): void {
    this.dialogRef.close(true);
  }
}

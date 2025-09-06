import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private defaultConfig: MatSnackBarConfig = {
    duration: 3000,
    horizontalPosition: 'right',
    verticalPosition: 'top',
  };

  private snackBar = inject(MatSnackBar);

  success(message: string, action = 'OK', config?: MatSnackBarConfig): void {
    this.open(message, action, ['snack-success'], config);
  }

  info(message: string, action = 'OK', config?: MatSnackBarConfig): void {
    this.open(message, action, ['snack-info'], config);
  }

  warn(message: string, action = 'OK', config?: MatSnackBarConfig): void {
    this.open(message, action, ['snack-warn'], config);
  }

  error(message: string, action = 'Dismiss', config?: MatSnackBarConfig): void {
    this.open(message, action, ['snack-error'], config);
  }

  private open(
    message: string,
    action: string,
    panelClass: string[],
    config?: MatSnackBarConfig
  ): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass,
      ...config,
    });
  }
}

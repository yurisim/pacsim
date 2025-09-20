import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

/**
 * Notification service for displaying user feedback messages using Angular Material snackbars.
 * Provides consistent styling and positioning for success, info, warning, and error messages.
 * Uses Material Design toast patterns for non-intrusive user notifications.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  /** Default configuration for all snackbar notifications */
  private defaultConfig: MatSnackBarConfig = {
    duration: 3000,
    horizontalPosition: 'right',
    verticalPosition: 'top',
  };

  private snackBar = inject(MatSnackBar);

  /**
   * Displays a success notification with green styling.
   * Used for confirming successful operations like saves, updates, or completions.
   * @param message - The success message to display to the user
   * @param action - Text for the action button (default: 'OK')
   * @param config - Optional snackbar configuration to override defaults
   * @example
   * notificationService.success('Player joined team successfully');
   */
  success(message: string, action = 'OK', config?: MatSnackBarConfig): void {
    this.open(message, action, ['snack-success'], config);
  }

  /**
   * Displays an informational notification with blue styling.
   * Used for providing general information or status updates to the user.
   * @param message - The informational message to display
   * @param action - Text for the action button (default: 'OK')
   * @param config - Optional snackbar configuration to override defaults
   * @example
   * notificationService.info('New turn started');
   */
  info(message: string, action = 'OK', config?: MatSnackBarConfig): void {
    this.open(message, action, ['snack-info'], config);
  }

  /**
   * Displays a warning notification with orange/yellow styling.
   * Used for alerting users to potential issues or important considerations.
   * @param message - The warning message to display
   * @param action - Text for the action button (default: 'OK')
   * @param config - Optional snackbar configuration to override defaults
   * @example
   * notificationService.warn('Team roster is locked');
   */
  warn(message: string, action = 'OK', config?: MatSnackBarConfig): void {
    this.open(message, action, ['snack-warn'], config);
  }

  /**
   * Displays an error notification with red styling.
   * Used for communicating failures, validation errors, or critical issues.
   * @param message - The error message to display
   * @param action - Text for the action button (default: 'Dismiss')
   * @param config - Optional snackbar configuration to override defaults
   * @example
   * notificationService.error('Failed to join team');
   */
  error(message: string, action = 'Dismiss', config?: MatSnackBarConfig): void {
    this.open(message, action, ['snack-error'], config);
  }

  /**
   * Internal method for opening snackbars with consistent configuration.
   * Merges default config with custom styling classes and optional overrides.
   * @param message - The message text to display
   * @param action - The action button text
   * @param panelClass - CSS classes for styling the notification type
   * @param config - Optional configuration overrides
   */
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

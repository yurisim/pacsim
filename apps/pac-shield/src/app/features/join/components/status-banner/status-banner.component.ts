import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-status-banner',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './status-banner.component.html',
  styleUrls: ['./status-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'h-6 flex items-center justify-center gap-2 mt-2 transition-all duration-300 ease-out',
    'aria-live': 'polite',
    '[attr.data-testid]': 'dataTestId'
  }
})
/**
 * Component Intent: Display status information with appropriate visual indicators
 * and accessibility features for form validation and loading states.
 *
 * This component provides:
 * - Visual feedback for different states (idle, checking, valid, invalid)
 * - Loading spinner for async operations
 * - Icon indicators for success/error states
 * - Accessible ARIA live region for screen readers
 * - Flexible message display supporting single or multiple messages
 */
export class StatusBannerComponent {
  @Input() state: 'idle' | 'checking' | 'valid' | 'invalid' = 'idle';
  @Input() message: string | string[] | null | undefined = null;
  @Input() dataTestId?: string;

  /**
   * Method Intent: Convert message input to string format for display.
   *
   * This method handles:
   * - Null/undefined message values
   * - Single string messages
   * - Array of messages (joined with spaces)
   * - Filtering out empty strings from arrays
   *
   * @param msg - The message to convert (string, string array, or null/undefined)
   * @returns Formatted string or null if no valid message
   */
  asString(msg: string | string[] | null | undefined): string | null {
    if (!msg) return null;
    return Array.isArray(msg) ? msg.filter(Boolean).join(' ') : msg;
  }
}

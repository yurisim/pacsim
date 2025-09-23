import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-country-access-toggle',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './country-access-toggle.component.html',
  styleUrls: ['./country-access-toggle.component.scss']
})
export class CountryAccessToggleComponent {
  @Output() toggleVisibility = new EventEmitter<boolean>();
  @Output() openDiceRollDialog = new EventEmitter<void>();

  // Signal for toggle state
  isVisible = signal(false);

  // Long-press detection state
  private longPressTimer: number | null = null;
  private readonly LONG_PRESS_DURATION = 500; // 500ms

  onToggle(): void {
    const newState = !this.isVisible();
    this.isVisible.set(newState);
    this.toggleVisibility.emit(newState);
  }

  /**
   * Handle mouse/touch start for long-press detection
   */
  onPressStart(event: Event): void {
    // Clear any existing timer
    this.clearLongPressTimer();

    // Start new long-press timer
    this.longPressTimer = window.setTimeout(() => {
      this.onLongPress();
    }, this.LONG_PRESS_DURATION);
  }

  /**
   * Handle mouse/touch end - clear timer if still active
   */
  onPressEnd(event: Event): void {
    this.clearLongPressTimer();
  }

  /**
   * Handle long-press completion - open dice roll dialog
   */
  private onLongPress(): void {
    this.clearLongPressTimer();
    this.openDiceRollDialog.emit();
  }

  /**
   * Clear the long-press timer
   */
  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
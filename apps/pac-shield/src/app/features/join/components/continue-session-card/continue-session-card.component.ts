import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Player } from '../../../../models/player.model';

@Component({
  selector: 'app-continue-session-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './continue-session-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component Intent: Displays a card for continuing an existing player session,
 * showing player information and providing a continue button for session resumption.
 *
 * This component provides:
 * - Player avatar display with name initial
 * - Player name and game context information
 * - Continue button for session resumption
 * - Event emission for continue action handling
 * - Null-safe player data handling
 * - Material Design card layout with proper spacing
 */
export class ContinueSessionCardComponent {
  @Input({ required: true }) player: Player | null = null;
  @Input() gameId: string | null = null;
  @Output() continueClicked = new EventEmitter<void>();

  /**
   * Method Intent: Handle continue button click and emit event to parent
   * component for session resumption processing.
   *
   * This method handles:
   * - Button click event processing
   * - Event emission for parent component handling
   * - Session continuation workflow initiation
   */
  onContinue(): void {
    this.continueClicked.emit();
  }

  /**
   * Getter Intent: Extract and format the first initial from the player's name
   * for avatar display purposes.
   *
   * This getter handles:
   * - Safe null/undefined player access
   * - Name string extraction and uppercase conversion
   * - Single character extraction for avatar display
   * - Fallback handling for empty names
   *
   * @returns Uppercase first character of player name or empty string
   */
  get initial(): string {
    return (this.player?.name || '').charAt(0).toUpperCase();
  }
}

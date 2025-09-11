import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface AccountSummary {
  id?: string | number;
  name: string;
}

@Component({
  selector: 'app-account-selector',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './account-selector.component.html',
  styleUrls: ['./account-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component Intent: Provides an input field for selecting or entering account/player names
 * with autocomplete-like behavior and validation feedback.
 *
 * This component provides:
 * - Text input for account name entry with real-time updates
 * - Support for pre-populated account lists for selection
 * - Error state display and accessibility attributes
 * - Disabled state handling for form validation
 * - Event emission for account selection changes
 * - Null emission for empty input to clear selections
 */
export class AccountSelectorComponent {
  // Presentational inputs
  @Input() accounts: AccountSummary[] = [];
  @Input() selectedAccount: AccountSummary | null = null;
  @Input() disabled = false;
  @Input() errorText: string | null = null;

  // A11y: allow container to wire aria-describedby to error block id
  @Input() ariaDescribedById?: string;

  // Presentation-only output
  @Output() accountChange = new EventEmitter<AccountSummary | null>();

  /**
   * Method Intent: Handle name input changes and emit account selection updates
   * to parent component with proper null handling for empty inputs.
   *
   * This method handles:
   * - Input value sanitization and null checking
   * - Empty input detection and null emission
   * - Account object construction with existing ID preservation
   * - Event emission for parent component processing
   * - Maintaining selected account state when updating name
   *
   * @param value - The input value from the name field
   */
  onNameInput(value: string): void {
    const name = value ?? '';
    // Emit null when empty to allow container to treat as no selection/name
    if (!name.trim()) {
      this.accountChange.emit(null);
      return;
    }
    const next: AccountSummary = {
      ...(this.selectedAccount ?? { id: undefined }),
      name,
    };
    this.accountChange.emit(next);
  }
}

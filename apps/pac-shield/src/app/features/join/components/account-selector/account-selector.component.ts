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

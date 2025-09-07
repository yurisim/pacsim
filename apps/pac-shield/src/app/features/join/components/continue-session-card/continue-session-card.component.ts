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
export class ContinueSessionCardComponent {
  @Input({ required: true }) player: Player | null = null;
  @Input() gameId: string | null = null;
  @Output() continueClicked = new EventEmitter<void>();

  onContinue(): void {
    this.continueClicked.emit();
  }

  get initial(): string {
    return (this.player?.name || '').charAt(0).toUpperCase();
  }
}

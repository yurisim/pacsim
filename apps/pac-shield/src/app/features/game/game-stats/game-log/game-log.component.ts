import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

/**
 * Game log list
 */
@Component({
  selector: 'app-game-log',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule, MatCardModule, MatDividerModule],
  templateUrl: './game-log.component.html',
})
export class GameLogComponent {
  @Input() log: string[] = [];
}
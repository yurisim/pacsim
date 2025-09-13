import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

/**
 * Read-only ATO table (no actions yet).
 */
@Component({
  selector: 'app-ato-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatIconModule],
  templateUrl: './ato-table.component.html',
})
export class AtoTableComponent {
  @Input() lines: any[] = [];
  displayedColumns = ['callSign', 'type', 'origin', 'destination', 'intent', 'ppr'];
}
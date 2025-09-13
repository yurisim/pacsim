import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

/**
 * CSpOC board (LEO/MEO/GEO tracks)
 */
@Component({
  selector: 'app-cspoc-board',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatChipsModule, MatIconModule],
  templateUrl: './cspoc-board.component.html',
})
export class CspocBoardComponent {}
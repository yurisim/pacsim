import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

/**
 * CAOC dashboard (ATO/PPR/apportionment placeholders)
 */
@Component({
  selector: 'app-caoc-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatIconModule],
  templateUrl: './caoc-dashboard.component.html',
})
export class CaocDashboardComponent {}
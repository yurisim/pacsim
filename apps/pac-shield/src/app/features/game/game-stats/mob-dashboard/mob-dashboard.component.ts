import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

/**
 * MOB dashboard (inventory & load planning placeholders)
 */
@Component({
  selector: 'app-mob-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatIconModule, MatChipsModule],
  templateUrl: './mob-dashboard.component.html',
})
export class MobDashboardComponent {}
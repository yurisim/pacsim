import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

/**
 * MEDCOM dashboard (hospitals status and supplies)
 */
@Component({
  selector: 'app-medcom-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatChipsModule, MatIconModule],
  templateUrl: './medcom-dashboard.component.html',
})
export class MedcomDashboardComponent {
  hospitals = [
    { name: 'Kadena', beds: 20, patients: 0 },
    { name: 'Yokota', beds: 20, patients: 0 },
    { name: 'Andersen', beds: 20, patients: 0 },
    { name: 'JBPHH', beds: 20, patients: 0 },
  ];
}
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

/**
 * FOS dashboard (RFI, MOG, 16 tasks)
 */
@Component({
  selector: 'app-fos-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatChipsModule, MatIconModule],
  templateUrl: './fos-dashboard.component.html',
})
export class FosDashboardComponent {
  rfiCategories = [
    'CFR', 'Mobility', 'Ramp', 'ATC', 'Equipment',
    'Bed Down', 'Fuel', 'Security', 'Community', 'Medical'
  ];
  tasks = [
    '1 Bed Down', '2 Power', '3 C2', '4 Contracts',
    '5 Ramp Sec', '6 Perimeter Sec', '7 Missile Def', '8 Hardening',
    '9 Airfield Ops', '10 Mobility', '11 ICT', '12 SFO',
    '13 Host Nation', '14 Health & Welfare', '15 Base Recovery', '16 Logistics'
  ];
}
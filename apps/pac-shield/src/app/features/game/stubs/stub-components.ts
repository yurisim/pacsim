import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

/**
 * Stub: Generic token renderer for game assets (aircraft, personnel, equipment, threats).
 * Uses Material 3 tokens and compact visuals. No interactivity yet.
 */
@Component({
  selector: 'app-game-token',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatChipsModule],
  template: `
    <mat-card class="md-elevation-1 md-shape-corner-sm md-sys-bg-surface-container p-2">
      <div class="flex items-center gap-2">
        <mat-icon [fontIcon]="icon"></mat-icon>
        <div class="flex-1">
          <div class="md-typescale-title-medium">{{ label }}</div>
          <div class="md-typescale-body-small md-sys-color-on-surface-variant">
            {{ subLabel }}
          </div>
        </div>
        @if (badge) {
          <mat-chip class="md-sys-bg-primary-container md-sys-color-on-primary-container">
            {{ badge }}
          </mat-chip>
        }
      </div>
    </mat-card>
  `,
})
export class GameTokenComponent {
  @Input() asset: any;

  get label(): string {
    return this.asset?.name || this.asset?.type || 'Token';
  }

  get subLabel(): string {
    const loc = this.asset?.location ? `@ ${this.asset.location}` : 'Unplaced';
    const status = this.asset?.status ? ` • ${this.asset.status}` : '';
    return `${loc}${status}`;
  }

  get badge(): string | null {
    if (this.asset?.strength) return `STR ${this.asset.strength}`;
    if (this.asset?.range) return `R ${this.asset.range}`;
    return null;
  }

  get icon(): string {
    const t = (this.asset?.type || '').toLowerCase();
    if (t.includes('f-') || t.includes('fighter')) return 'flight';
    if (t.includes('c-1') || t.includes('c-5') || t.includes('c-17')) return 'local_shipping';
    if (t.includes('person') || t.includes('mra')) return 'diversity_3';
    if (t.includes('equipment')) return 'construction';
    if (t.includes('threat') || t.includes('pla')) return 'warning';
    if (t.includes('sat') || t.includes('gps')) return 'satellite_alt';
    return 'category';
  }
}

/**
 * Stub: Scoreboard with MPs, DPs, RPs and victory progress.
 */
@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressBarModule, MatDividerModule],
  template: `
    <mat-card class="md-elevation-1 md-shape-corner-md md-sys-bg-surface-container p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <mat-icon fontIcon="leaderboard" class="md-sys-color-primary"></mat-icon>
          <div class="md-typescale-title-medium">Scoreboard</div>
        </div>
        <div class="md-typescale-label-medium md-sys-color-on-surface-variant">
          Phase: {{ gamePhase }} • Day {{ gameDay }} • Turn {{ gameTurn }}
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3 mt-4">
        <mat-card class="md-elevation-1 p-3 text-center">
          <div class="md-typescale-headline-small md-sys-color-primary">{{ missionPoints }}</div>
          <div class="md-typescale-body-small md-sys-color-on-surface-variant">Mission Points</div>
        </mat-card>
        <mat-card class="md-elevation-1 p-3 text-center">
          <div class="md-typescale-headline-small md-sys-color-error">{{ demoralizationPoints }}</div>
          <div class="md-typescale-body-small md-sys-color-on-surface-variant">Demoralization</div>
        </mat-card>
        <mat-card class="md-elevation-1 p-3 text-center">
          <div class="md-typescale-headline-small md-sys-color-tertiary">{{ resourcePoints }}</div>
          <div class="md-typescale-body-small md-sys-color-on-surface-variant">Resource Points</div>
        </mat-card>
      </div>

      <mat-divider class="my-4"></mat-divider>

      <div class="md-typescale-label-medium mb-1">Victory Progress</div>
      <mat-progress-bar
        [value]="victoryProgress"
        mode="determinate"
        class="md-shape-corner-full"
      />
      <div class="md-typescale-body-small md-sys-color-on-surface-variant mt-1">
        {{ missionPoints }} / {{ victoryTarget }} MPs
      </div>
    </mat-card>
  `,
})
export class ScoreboardComponent {
  @Input() missionPoints = 0;
  @Input() demoralizationPoints = 0;
  @Input() resourcePoints = 0;
  @Input() victoryTarget = 100;
  @Input() gameTurn = 1;
  @Input() gameDay = 1;
  @Input() gamePhase: 'CRISIS' | 'CONFLICT' = 'CRISIS';

  get victoryProgress(): number {
    if (this.victoryTarget <= 0) return 0;
    return Math.max(0, Math.min(100, (this.missionPoints / this.victoryTarget) * 100));
    }
}

/**
 * Stub: Read-only ATO table (no actions yet).
 */
@Component({
  selector: 'app-ato-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatIconModule],
  template: `
    <mat-card class="md-elevation-1 md-shape-corner-md md-sys-bg-surface-container p-2">
      <div class="flex items-center gap-2 p-2">
        <mat-icon fontIcon="assignment"></mat-icon>
        <div class="md-typescale-title-medium">Air Tasking Order</div>
      </div>

      <div class="overflow-auto">
        <table mat-table [dataSource]="lines" class="w-full">
          <ng-container matColumnDef="callSign">
            <th mat-header-cell *matHeaderCellDef>Call Sign</th>
            <td mat-cell *matCellDef="let l">{{ l.callSign || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let l">{{ l.type || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="origin">
            <th mat-header-cell *matHeaderCellDef>Origin</th>
            <td mat-cell *matCellDef="let l">{{ l.origin || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="destination">
            <th mat-header-cell *matHeaderCellDef>Destination</th>
            <td mat-cell *matCellDef="let l">{{ l.destination || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="intent">
            <th mat-header-cell *matHeaderCellDef>Intent</th>
            <td mat-cell *matCellDef="let l">{{ l.intent || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="ppr">
            <th mat-header-cell *matHeaderCellDef>PPR</th>
            <td mat-cell *matCellDef="let l">{{ l.pprStatus || 'Pending' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>

      @if (!lines?.length) {
        <div class="p-3 md-typescale-body-small md-sys-color-on-surface-variant">
          No ATO lines yet.
        </div>
      }
    </mat-card>
  `,
})
export class AtoTableComponent {
  @Input() lines: any[] = [];
  displayedColumns = ['callSign', 'type', 'origin', 'destination', 'intent', 'ppr'];
}

/**
 * Stub: Game log list
 */
@Component({
  selector: 'app-game-log',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule, MatCardModule, MatDividerModule],
  template: `
    <mat-card class="md-elevation-1 md-shape-corner-md md-sys-bg-surface-container p-2">
      <div class="flex items-center gap-2 p-2">
        <mat-icon fontIcon="list_alt"></mat-icon>
        <div class="md-typescale-title-medium">Game Log</div>
      </div>
      <mat-divider></mat-divider>
      <mat-nav-list>
        @for (entry of log; track $index) {
          <a mat-list-item>
            <mat-icon matListItemIcon fontIcon="chevron_right"></mat-icon>
            <div matListItemTitle>{{ entry }}</div>
            <div matListItemLine class="md-sys-color-on-surface-variant">Recent</div>
          </a>
        }
      </mat-nav-list>
      @if (!log?.length) {
        <div class="p-3 md-typescale-body-small md-sys-color-on-surface-variant">
          No events yet.
        </div>
      }
    </mat-card>
  `,
})
export class GameLogComponent {
  @Input() log: string[] = [];
}

/**
 * Stub: MOB dashboard (inventory & load planning placeholders)
 */
@Component({
  selector: 'app-mob-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatIconModule, MatChipsModule],
  template: `
    <mat-card class="md-elevation-1 md-shape-corner-md md-sys-bg-surface-container p-3">
      <div class="flex items-center gap-2 mb-2">
        <mat-icon fontIcon="domain"></mat-icon>
        <div class="md-typescale-title-medium">MOB Dashboard</div>
      </div>
      <mat-divider></mat-divider>

      <div class="mt-3">
        <div class="md-typescale-label-medium mb-1">On-Station Personnel</div>
        <div class="flex flex-wrap gap-2">
          <mat-chip>Refueling</mat-chip>
          <mat-chip>Airfield Ops</mat-chip>
          <mat-chip>Security Forces</mat-chip>
        </div>
      </div>

      <div class="mt-3">
        <div class="md-typescale-label-medium mb-1">Commodities</div>
        <div class="flex flex-wrap gap-2">
          <mat-chip class="md-sys-bg-primary-container md-sys-color-on-primary-container">Fuel</mat-chip>
          <mat-chip>Bomb</mat-chip>
          <mat-chip>Missile</mat-chip>
          <mat-chip>Food</mat-chip>
          <mat-chip>Water</mat-chip>
        </div>
      </div>

      <div class="mt-3">
        <div class="md-typescale-label-medium mb-1">Aircraft Inventory</div>
        <div class="flex flex-wrap gap-2">
          <mat-chip>F-16 x16</mat-chip>
          <mat-chip>F-22 x16</mat-chip>
          <mat-chip>C-17 x2</mat-chip>
        </div>
      </div>

      <div class="mt-3">
        <div class="md-typescale-label-medium mb-1">Load Plans</div>
        <div class="md-typescale-body-small md-sys-color-on-surface-variant">
          Placeholder for aircraft load planner summaries.
        </div>
      </div>
    </mat-card>
  `,
})
export class MobDashboardComponent {}

/**
 * Stub: FOS dashboard (RFI, MOG, 16 tasks)
 */
@Component({
  selector: 'app-fos-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatChipsModule, MatIconModule],
  template: `
    <mat-card class="md-elevation-1 md-shape-corner-md md-sys-bg-surface-container p-3">
      <div class="flex items-center gap-2 mb-2">
        <mat-icon fontIcon="flight_takeoff"></mat-icon>
        <div class="md-typescale-title-medium">FOS Dashboard</div>
      </div>
      <mat-divider></mat-divider>

      <div class="mt-3">
        <div class="md-typescale-label-medium mb-1">RFI Status</div>
        <div class="flex flex-wrap gap-2">
          @for (rfi of rfiCategories; track rfi) {
            <mat-chip>{{ rfi }}: ?</mat-chip>
          }
        </div>
      </div>

      <div class="mt-3">
        <div class="md-typescale-label-medium mb-1">MOG</div>
        <div class="flex items-center gap-2">
          <mat-icon fontIcon="local_parking"></mat-icon>
          <div class="md-typescale-body-medium">2 C-17 & 7 Fighters (placeholder)</div>
        </div>
      </div>

      <div class="mt-3">
        <div class="md-typescale-label-medium mb-1">Airfield Tasks (16)</div>
        <div class="grid grid-cols-2 gap-2">
          @for (task of tasks; track task) {
            <mat-chip class="interactive-surface">{{ task }}</mat-chip>
          }
        </div>
      </div>
    </mat-card>
  `,
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

/**
 * Stub: CAOC dashboard (ATO/PPR/apportionment placeholders)
 */
@Component({
  selector: 'app-caoc-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatIconModule],
  template: `
    <mat-card class="md-elevation-1 md-shape-corner-md md-sys-bg-surface-container p-3">
      <div class="flex items-center gap-2 mb-2">
        <mat-icon fontIcon="radar"></mat-icon>
        <div class="md-typescale-title-medium">CAOC Dashboard</div>
      </div>
      <mat-divider></mat-divider>

      <div class="mt-3 grid grid-cols-2 gap-3">
        <mat-card class="p-3 md-elevation-1">
          <div class="md-typescale-label-medium">Apportionment</div>
          <div class="md-typescale-body-small md-sys-color-on-surface-variant">Placeholder</div>
        </mat-card>
        <mat-card class="p-3 md-elevation-1">
          <div class="md-typescale-label-medium">PPR Queue</div>
          <div class="md-typescale-body-small md-sys-color-on-surface-variant">0 pending</div>
        </mat-card>
      </div>
    </mat-card>
  `,
})
export class CaocDashboardComponent {}

/**
 * Stub: CSpOC board (LEO/MEO/GEO tracks)
 */
@Component({
  selector: 'app-cspoc-board',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatChipsModule, MatIconModule],
  template: `
    <mat-card class="md-elevation-1 md-shape-corner-md md-sys-bg-surface-container p-3">
      <div class="flex items-center gap-2 mb-2">
        <mat-icon fontIcon="satellite_alt"></mat-icon>
        <div class="md-typescale-title-medium">CSpOC Board</div>
      </div>
      <mat-divider></mat-divider>

      <div class="mt-3 space-y-3">
        <div>
          <div class="md-typescale-label-medium mb-1">LEO</div>
          <div class="flex flex-wrap gap-2">
            <mat-chip>ISR</mat-chip>
            <mat-chip>COMM</mat-chip>
            <mat-chip>GPS</mat-chip>
          </div>
        </div>
        <div>
          <div class="md-typescale-label-medium mb-1">MEO</div>
          <div class="flex flex-wrap gap-2">
            <mat-chip>MW</mat-chip>
            <mat-chip>SDA</mat-chip>
          </div>
        </div>
        <div>
          <div class="md-typescale-label-medium mb-1">GEO</div>
          <div class="flex flex-wrap gap-2">
            <mat-chip>COMM</mat-chip>
            <mat-chip>WX</mat-chip>
          </div>
        </div>
      </div>
    </mat-card>
  `,
})
export class CspocBoardComponent {}

/**
 * Stub: MEDCOM dashboard (hospitals status and supplies)
 */
@Component({
  selector: 'app-medcom-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatChipsModule, MatIconModule],
  template: `
    <mat-card class="md-elevation-1 md-shape-corner-md md-sys-bg-surface-container p-3">
      <div class="flex items-center gap-2 mb-2">
        <mat-icon fontIcon="medical_services"></mat-icon>
        <div class="md-typescale-title-medium">MEDCOM Dashboard</div>
      </div>
      <mat-divider></mat-divider>

      <div class="mt-3 grid grid-cols-2 gap-3">
        @for (h of hospitals; track h.name) {
          <mat-card class="p-3 md-elevation-1">
            <div class="md-typescale-label-medium">{{ h.name }}</div>
            <div class="md-typescale-body-small md-sys-color-on-surface-variant">
              Beds: {{ h.beds }} • Patients: {{ h.patients }}
            </div>
          </mat-card>
        }
      </div>

      <div class="mt-3">
        <div class="md-typescale-label-medium mb-1">Medical Supplies</div>
        <div class="flex flex-wrap gap-2">
          <mat-chip>Bandages</mat-chip>
          <mat-chip>Pharma</mat-chip>
          <mat-chip>IVs</mat-chip>
          <mat-chip>O2</mat-chip>
        </div>
      </div>
    </mat-card>
  `,
})
export class MedcomDashboardComponent {
  hospitals = [
    { name: 'Kadena', beds: 20, patients: 0 },
    { name: 'Yokota', beds: 20, patients: 0 },
    { name: 'Andersen', beds: 20, patients: 0 },
    { name: 'JBPHH', beds: 20, patients: 0 },
  ];
}

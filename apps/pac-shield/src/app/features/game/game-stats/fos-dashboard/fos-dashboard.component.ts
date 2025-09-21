import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, OnDestroy, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../../../../shared/services/api.service';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../core/store/app.state';
import { selectHexGrid } from '../../../../core/store/game/game.selectors';
import { Subscription, combineLatest, of } from 'rxjs';
import { take } from 'rxjs/operators';
import { PlayerRoleService } from '../../../../shared/services/player-role.service';
import { FOS_LOCATIONS } from '../../../../shared/config/static-locations.config';

/**
 * Ownership Overview (repurposed FOS dashboard)
 * - Lists owned FOS for the current game
 * - Compact read-only mini-map showing owned FOS as markers
 * - Drill-in deep link to game board with panel/view query params
 * - Role-aware defaults: MOB Commander -> own team; GM -> all (with client filter)
 */
@Component({
  selector: 'app-fos-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatIconModule, MatButtonModule],
  templateUrl: './fos-dashboard.component.html',
})
export class FosDashboardComponent implements OnChanges, OnDestroy {
  @Input() currentGameId: number | null = null;

  private api = inject(ApiService);
  private router = inject(Router);
  private store = inject<Store<AppState>>(Store as any);
  private playerRole = inject(PlayerRoleService);

  isLoading = false;
  errorMsg: string | null = null;

  // Data (list + client-side filter for GM/CFACC)
  items: Array<{
    fosDisplayNumber: number;
    ownerTeamId?: number | null;
    ownerTeamName?: string | null;
    status: 'ACTIVE' | 'DORMANT';
    assessed?: boolean;
  }> = [];
  teamFilter: number | 'ALL' = 'ALL';
  showTeamFilter = false;

  // Derived options for GM/CFACC team filter
  get teamsForFilter(): Array<{ id: number; name: string }> {
    const seen = new Map<number, string>();
    for (const it of this.items) {
      if (it.ownerTeamId != null) {
        const id = it.ownerTeamId;
        // Prefer provided name; fallback to generic
        const name = (it.ownerTeamName && it.ownerTeamName.trim().length > 0)
          ? it.ownerTeamName
          : `Team ${id}`;
        if (!seen.has(id)) {
          seen.set(id, name);
        }
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }

  // Mini-map state
  private hexGridMap: Record<string, string> | null = null;
  private subs = new Subscription();

  // Mini-map visual config
  miniWidth = 240;
  miniHeight = 160;
  hexSize = 12; // visual size unit
  markers: Array<{ dn: number; x: number; y: number; color: string; title: string }> = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentGameId']) {
      // Subscribe to hex grid mapping once (provided by HexGridComponent on the page)
      this.subs.add(
        this.store.select(selectHexGrid).subscribe(map => {
          this.hexGridMap = map;
          this.recomputeMarkers();
        })
      );
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private load(): void {
    if (!this.currentGameId) {
      this.items = [];
      this.recomputeMarkers();
      return;
    }
    this.isLoading = true;
    this.errorMsg = null;

    // Resolve role and team for role-aware default
    const role$ = this.playerRole.currentRole$ || of(null);
    const teamId$ = this.playerRole.currentTeamId$ || of(null);

    combineLatest([role$.pipe(take(1)), teamId$.pipe(take(1))]).subscribe({
      next: ([role, teamId]) => {
        const isCommander = role === 'COMMANDER';
        const isGM = role === 'GM';

        // MOB Commander -> only own team; GM -> all; others -> all
        const paramsBase = new HttpParams().set('gameId', String(this.currentGameId));
        const params = isCommander && teamId ? paramsBase.set('teamId', String(teamId)) : paramsBase;

        this.showTeamFilter = !isCommander; // hide filter for MOB Commander

        this.api.get<Array<{
          fosDisplayNumber: number;
          ownerTeamName?: string | null;
          teamId?: number | null;
          isActive: boolean;
          assessed?: boolean;
        }>>('fos/owned', params).subscribe({
          next: (rows) => {
            const r = rows || [];
            this.items = r.map(row => ({
              fosDisplayNumber: row.fosDisplayNumber,
              ownerTeamId: row.teamId ?? null,
              ownerTeamName: row.ownerTeamName ?? null,
              status: row.isActive ? 'ACTIVE' : 'DORMANT',
              assessed: row.assessed ?? false
            }));
            // Default filter value for GM/others: ALL (no filter). For Commander: implicit by API.
            this.teamFilter = 'ALL';
            this.isLoading = false;
            this.recomputeMarkers();
          },
          error: (err) => {
            console.error('Failed to load owned FOS:', err);
            this.errorMsg = 'Failed to load ownership overview';
            this.isLoading = false;
            this.recomputeMarkers();
          }
        });
      },
      error: (err) => {
        console.error('Failed to resolve role/team:', err);
        this.errorMsg = 'Failed to resolve role/team';
        this.isLoading = false;
      }
    });
  }

  // List items after applying client-side filter (GM/CFACC)
  get filteredItems(): typeof this.items {
    if (this.teamFilter === 'ALL') return this.items;
    return this.items.filter(i => i.ownerTeamId === this.teamFilter);
  }

  onTeamFilterChange(value: string): void {
    if (value === 'ALL') {
      this.teamFilter = 'ALL';
    } else {
      const parsed = Number(value);
      this.teamFilter = Number.isFinite(parsed) ? (parsed as number) : 'ALL';
    }
    this.recomputeMarkers();
  }

  openFos(dn: number): void {
    if (!this.currentGameId) return;
    this.router.navigate(
      ['/game', this.currentGameId],
      { queryParams: { fos: dn, panel: 'fos', view: 'rfi' } }
    );
  }

  // --- Mini-map helpers ---

  private recomputeMarkers(): void {
    const mapping = this.hexGridMap;
    if (!mapping) {
      this.markers = [];
      return;
    }

    const visible = this.filteredItems;
    const pts: Array<{ dn: number; x: number; y: number; color: string; title: string }> = [];

    for (const it of visible) {
      const dn = it.fosDisplayNumber;
      const fosKey = this.numberToFosId(dn);
      const staticFos = (FOS_LOCATIONS as any)[fosKey];
      if (!staticFos) continue;

      const h3 = staticFos.h3Index as string;
      const visual = mapping[h3];
      if (!visual) continue;

      const { row, col } = this.parseVisualCoord(visual);
      const { x, y } = this.axialToPixel(row, col);

      const color = it.status === 'ACTIVE' ? '#2E7D32' /* green */ : '#FFA000' /* amber */;
      pts.push({
        dn,
        x,
        y,
        color,
        title: `FOS ${dn} • ${it.status}${it.ownerTeamName ? ' • ' + it.ownerTeamName : ''}`
      });
    }

    this.markers = pts;
  }

  private numberToFosId(fosDisplayNumber: number): string {
    return `fos-${fosDisplayNumber.toString().padStart(2, '0')}`;
  }

  private parseVisualCoord(coord: string): { row: number; col: number } {
    // Expected like "505" or "506A" -> take numeric part for row/col
    const m = coord.match(/^(\d)(\d{2})/);
    const row = m ? Number(m[1]) : 5;
    const col = m ? Number(m[2]) : 5;
    return { row, col };
  }

  private axialToPixel(row: number, col: number): { x: number; y: number } {
    // Simple offset grid based on row/col numbers used for visual coordinates.
    // Not geospatially accurate - intended only for compact overview.
    const s = this.hexSize;
    const colSpacing = s * 1.1; // horizontal spacing
    const rowSpacing = s * 0.95; // vertical spacing
    const x = col * colSpacing + (row % 2 ? colSpacing / 2 : 0) + 10;
    const y = row * rowSpacing + 10;
    return { x, y };
  }
}

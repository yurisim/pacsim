import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MOB_LOCATIONS, FOS_LOCATIONS, StaticLocation } from '../../../shared/config/static-locations.config';
import { GameStatsService } from '../game-stats/game-stats.service';
import { FosService } from '../services/fos.service';
import { FosStateService } from '../../../shared/services/fos-state.service';
import { PlayerRoleService } from '../../../shared/services/player-role.service';
import { ForwardOperatingSite, Team } from '../../../generated';
import { FosActivationDialogComponent, FosActivationDialogData, FosActivationDialogResult } from './fos-activation-dialog.component';
import { FosRfiComponent } from '../fos/fos-rfi.component';
import { FosTaskBoardComponent } from '../fos/fos-task-board.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/**
 * Asset action interface - represents an action that can be performed on an asset
 */
export interface AssetAction {
  id: string;
  icon: string;
  label: string;
  tooltip?: string;
  disabled?: boolean;
  color?: 'primary' | 'accent' | 'warn';
}

/**
 * Selected tile asset interface
 */
export interface TileAsset {
  id: string;
  type: 'MOB' | 'FOS' | 'PLANE' | 'UNIT' | 'SHIP';
  name: string;
  status?: string;
  actions: AssetAction[];
}

/**
 * Component Intent: Shows assets present on the selected hex tile with available actions.
 *
 * This component displays:
 * - Tabbed interface for different asset types (MOB, FOS, Planes, etc.)
 * - List of assets on the selected tile
 * - Action buttons for each asset type
 * - Status information for selected assets
 *
 * The component uses a square grid layout for action buttons similar to the Assets widget.
 */
@Component({
  selector: 'app-location-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCardModule,
    MatTabsModule,
    MatDividerModule,
    MatButtonToggleModule,
    MatDialogModule
  ],
  templateUrl: './location-panel.component.html',
  styleUrls: ['./location-panel.component.scss']
})
export class LocationPanelComponent implements OnChanges {
  @Input() selectedHex: string | null = null;
  @Input() selectedH3Index: string | null = null; // H3 index of selected hex
  @Input() gameId: number | null = null; // Current game ID
  @Input() currentTurn = 1; // Current game turn
  @Input() availableTeams: Team[] = []; // Available teams for FOS activation
  @Input() fosMobAssignments: Record<string, string> = {}; // Maps FOS ID to MOB ID
  @Input() currentPlayerMob: string | null = null; // Current player's MOB
  @Input() isGameMaster = false; // Whether current player is GM
  @Input() panelState: 'minimized' | 'narrow' | 'full' = 'minimized';
  @Output() actionClicked = new EventEmitter<{ action: AssetAction, asset: TileAsset }>();
  @Output() panelStateChange = new EventEmitter<'minimized' | 'narrow' | 'full'>();
  @Input() initialSubview: 'none' | 'rfi' | 'tasks' = 'none'; // Deep-link support from GameBoardComponent; no-op here
  @Output() fosStatusChanged = new EventEmitter<{ fosId: string, isActive: boolean, teamId?: number }>();

  private gameStatsService = inject(GameStatsService);
  private fosService = inject(FosService);
  private fosStateService = inject(FosStateService);
  private playerRoleService = inject(PlayerRoleService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private breakpointObserver = inject(BreakpointObserver);

  // Use signals from FosStateService for reactive updates
  fosList = this.fosStateService.fosList;
  activeFosIds = this.fosStateService.activeFosIds;

  isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map(result => result.matches)),
    { initialValue: false }
  );

  isMobile = toSignal(this.breakpointObserver.observe('(max-width: 767px)'), { initialValue: { matches: false, breakpoints: {} } });

  // Selected asset for each type (using signals for reactivity)
  selectedMobAsset = signal<TileAsset | null>(null);
  selectedFosAsset = signal<TileAsset | null>(null);
  selectedPlaneAsset = signal<TileAsset | null>(null);


  // Derived context for the currently selected FOS (static + db if active)
  selectedFosStatic = computed(() => {
    const h3 = this.selectedH3Index;
    const sel = this.selectedFosAsset();
    if (!h3 || !sel) return null;
    const fosAtHex = this.getFosAtHex(h3);
    return fosAtHex.find(f => f.id === sel.id) || null;
  });

  selectedFosDisplayNumber = computed<number | null>(() => {
    const sel = this.selectedFosAsset();
    if (!sel) return null;
    const n = parseInt(sel.name.replace(/\D/g, '') || '0');
    return Number.isFinite(n) && n > 0 ? n : null;
  });

  selectedDbFos = computed<ForwardOperatingSite | null>(() => {
    const displayNum = this.selectedFosDisplayNumber();
    if (!displayNum) return null;
    return this.fosList().find(f => f.fosDisplayNumber === displayNum) || null;
  });

  selectedFosId = computed<string | null>(() => this.selectedDbFos()?.id ?? null);

  isOwner = computed<boolean>(() => {
    const selStatic = this.selectedFosStatic();
    if (!selStatic) return false;
    const ownerMob = this.fosMobAssignments[selStatic.id];
    return !!ownerMob && ownerMob === this.currentPlayerMob;
  });

  canEdit = computed<boolean>(() => this.isOwner() || this.isGameMaster);

  // Computed signal for FOS asset with reactive actions
  selectedFosAssetWithActions = computed(() => {
    const asset = this.selectedFosAsset();
    if (!asset) return null;

    // Find the FOS in the static locations and get fresh actions
    const h3Index = this.selectedH3Index;
    if (!h3Index) return asset;

    const fosAtHex = this.getFosAtHex(h3Index);
    const matchingFos = fosAtHex.find(f => f.id === asset.id);

    if (matchingFos) {
      return {
        ...asset,
        actions: this.getFosActions(matchingFos),
        status: this.getFosStatus(matchingFos)
      };
    }

    return asset;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedHex'] || changes['selectedH3Index']) {
      // Reset selections when hex changes
      this.initializeAssetSelections();
    }
  }

  /**
   * Initialize asset selections when hex changes
   */
  private initializeAssetSelections(): void {
    const mobs = this.mobAssets;
    const foss = this.fosAssets;
    const planes = this.planeAssets;

    // Select first asset of each type if available (using signals)
    this.selectedMobAsset.set(mobs.length > 0 ? mobs[0] : null);
    this.selectedFosAsset.set(foss.length > 0 ? foss[0] : null);
    this.selectedPlaneAsset.set(planes.length > 0 ? planes[0] : null);
  }

  // Get actual assets on the selected hex based on real MOB/FOS locations and game state
  get tileAssets(): TileAsset[] {
    if (!this.selectedH3Index) return [];

    const assets: TileAsset[] = [];

    // Check for MOBs at this hex
    const mobsAtHex = this.getMobsAtHex(this.selectedH3Index);
    mobsAtHex.forEach(mob => {
      assets.push({
        id: mob.id,
        type: 'MOB',
        name: mob.name,
        status: 'Operational',
        actions: this.getMobActions()
      });
    });

    // Check for FOSs at this hex
    const fosAtHex = this.getFosAtHex(this.selectedH3Index);
    fosAtHex.forEach(fos => {
      assets.push({
        id: fos.id,
        type: 'FOS',
        name: fos.name,
        status: this.getFosStatus(fos),
        actions: this.getFosActions(fos)
      });
    });

    // Get planes from game state (currently using demo data)
    const planesAtHex = this.getPlanesAtHex(this.selectedH3Index);
    assets.push(...planesAtHex);

    return assets;
  }

  /**
   * Get MOBs at the specified H3 index
   */
  private getMobsAtHex(h3Index: string): StaticLocation[] {
    return Object.values(MOB_LOCATIONS).filter(mob => mob.h3Index === h3Index);
  }

  /**
   * Get FOSs at the specified H3 index
   */
  private getFosAtHex(h3Index: string): Array<StaticLocation & { dbFos?: ForwardOperatingSite }> {
    // Get static FOS definitions at this hex
    const staticFoss = Object.values(FOS_LOCATIONS).filter(fos => fos.h3Index === h3Index);

    // Enhance with database information using signal-based FOS list
    return staticFoss.map(staticFos => {
      // Find corresponding database FOS by fosDisplayNumber
      const fosNumber = parseInt(staticFos.name.replace(/\D/g, '') || '0');
      const dbFos = this.fosList().find(f => f.fosDisplayNumber === fosNumber);

      return {
        ...staticFos,
        dbFos
      };
    });
  }

  /**
   * Get planes at the specified hex (from game state)
   */
  private getPlanesAtHex(h3Index: string): TileAsset[] {
    // For now, return demo planes based on game assets
    // In real implementation, this would filter gameAssets by location
    const planes: TileAsset[] = [];

    // Demo: Add some planes to MOB locations
    const mobsAtHex = this.getMobsAtHex(h3Index);
    if (mobsAtHex.length > 0) {
      // Add demo aircraft at MOB locations
      planes.push({
        id: 'f22-wing',
        type: 'PLANE',
        name: 'F-22 Squadron',
        status: 'Ready',
        actions: this.getAircraftActions('fighter')
      });

      if (mobsAtHex[0].name === 'Kadena') {
        planes.push({
          id: 'c17-transport',
          type: 'PLANE',
          name: 'C-17 Transport',
          status: 'Loading',
          actions: this.getAircraftActions('transport')
        });
      }
    }

    return planes;
  }

  /**
   * Get FOS status based on activation state, ownership, and color
   */
  private getFosStatus(fos: StaticLocation & { dbFos?: ForwardOperatingSite }): string {
    // Check activation status using signal-based tracking
    const isActive = this.activeFosIds().has(fos.id);
    const fosMobId = this.fosMobAssignments[fos.id];

    if (isActive) {
      if (fosMobId) {
        // Get MOB name from static locations
        const mobName = MOB_LOCATIONS[fosMobId]?.name || fosMobId;
        const isOwner = fosMobId === this.currentPlayerMob;

        if (isOwner) {
          return `Active (Your MOB)`;
        } else {
          return `Active (${mobName})`;
        }
      }
      return 'Active';
    }

    // All inactive FOSs have the same status regardless of color
    return 'Dormant';
  }

  /**
   * Get MOB actions
   */
  private getMobActions(): AssetAction[] {
    return [
      { id: 'launch', icon: 'flight_takeoff', label: 'Launch', tooltip: 'Launch aircraft from this base', color: 'primary' },
      { id: 'defend', icon: 'shield', label: 'Defend', tooltip: 'Set defensive posture' },
      { id: 'repair', icon: 'build', label: 'Repair', tooltip: 'Repair damaged assets' },
      { id: 'resupply', icon: 'inventory_2', label: 'Resupply', tooltip: 'Request supply delivery' },
      { id: 'intel', icon: 'radar', label: 'Intel', tooltip: 'Gather intelligence' },
      { id: 'upgrade', icon: 'upgrade', label: 'Upgrade', tooltip: 'Upgrade base capabilities' },
      { id: 'evacuate', icon: 'emergency', label: 'Evacuate', tooltip: 'Emergency evacuation', color: 'warn' }
    ];
  }

  /**
   * Get FOS actions based on activation status and permissions.
   *
   * Rationale (docs/user-guide.md):
   * - Keep only FOS activation state controls (Activate/Deactivate) per 5.2.3 "Selection of FOS Locations".
   * - Operational/convenience actions (Fortify, Scout, Resupply, Build Ramp, Deploy Arresting Gear/Runway Lighting, etc.)
   *   are consolidated into in-panel subviews:
   *     • RFI (3.2.1 "Request for Information", 5.2.4 "Request RFIs")
   *     • Tasks (3.6 "Airfield Capabilities" incl. Camouflage & Base Hardening, Base Recovery, Mobility Support)
   * - CAOC-only actions (e.g., PPR per 3.3) are not Location Panel buttons.
   */
  private getFosActions(fos: StaticLocation & { dbFos?: ForwardOperatingSite }): AssetAction[] {
    const actions: AssetAction[] = [];

    // Activation status via signal-based tracking
    const isActive = this.activeFosIds().has(fos.id);

    if (isActive) {
      // When active, show RFI and Tasks for all users, plus Deactivate for authorized users
      actions.push(
        {
          id: 'rfi',
          icon: 'assignment',
          label: 'RFI',
          tooltip: 'Request for Information'
        },
        {
          id: 'tasks',
          icon: 'checklist',
          label: 'Tasks',
          tooltip: 'View and manage FOS tasks'
        }
      );

      if (this.canManageFos()) {
        actions.push({
          id: 'deactivate',
          icon: 'power_settings_new',
          label: 'Deactivate',
          tooltip: 'Deactivate this FOS',
          color: 'warn'
        });
      }
    } else {
      // When inactive, show Activate (role guarded) or disabled info
      if (this.canManageFos()) {
        const tooltipText = this.isGameMaster ? 'GM: Activate this FOS' : 'Activate this FOS';
        actions.push({
          id: 'activate',
          icon: 'power_settings_new',
          label: 'Activate',
          tooltip: tooltipText,
          color: 'accent'
        });
      } else {
        actions.push({
          id: 'activate',
          icon: 'power_settings_new',
          label: 'Activate',
          tooltip: 'Only GMs and MOB Commanders can activate FOS',
          color: 'accent',
          disabled: true
        });
      }
    }

    return actions;
  }

  /**
   * Get aircraft actions based on type
   */
  private getAircraftActions(type: 'fighter' | 'transport' | 'tanker'): AssetAction[] {
    const commonActions: AssetAction[] = [
      { id: 'rtb', icon: 'flight_land', label: 'RTB', tooltip: 'Return to base' }
    ];

    switch (type) {
      case 'fighter':
        return [
          { id: 'attack', icon: 'gps_fixed', label: 'Attack', tooltip: 'Attack target', color: 'warn' },
          { id: 'patrol', icon: 'track_changes', label: 'Patrol', tooltip: 'Set patrol route' },
          { id: 'intercept', icon: 'call_merge', label: 'Intercept', tooltip: 'Intercept enemy aircraft' },
          { id: 'escort', icon: 'group', label: 'Escort', tooltip: 'Escort friendly units' },
          { id: 'refuel', icon: 'local_gas_station', label: 'Refuel', tooltip: 'Request air refueling' },
          ...commonActions
        ];
      case 'transport':
        return [
          { id: 'land', icon: 'flight_land', label: 'Land', tooltip: 'Land at destination' },
          { id: 'drop', icon: 'paragliding', label: 'Air Drop', tooltip: 'Air drop supplies' },
          { id: 'divert', icon: 'alt_route', label: 'Divert', tooltip: 'Divert to alternate' },
          { id: 'hold', icon: 'pause_circle', label: 'Hold', tooltip: 'Hold position' },
          ...commonActions
        ];
      case 'tanker':
        return [
          { id: 'refuel', icon: 'local_gas_station', label: 'Refuel', tooltip: 'Refuel aircraft' },
          { id: 'orbit', icon: 'refresh', label: 'Orbit', tooltip: 'Maintain orbit pattern' },
          ...commonActions
        ];
      default:
        return commonActions;
    }
  }

  /**
   * Get assets by type
   */
  getAssetsByType(type: string): TileAsset[] {
    return this.tileAssets.filter(asset => asset.type === type);
  }

  /**
   * Get MOB assets (sorted by name)
   */
  get mobAssets(): TileAsset[] {
    return this.getAssetsByType('MOB').sort((a, b) => {
      // Sort MOBs alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get FOS assets (sorted by numeric ID)
   */
  get fosAssets(): TileAsset[] {
    return this.getAssetsByType('FOS').sort((a, b) => {
      // Extract numbers from FOS names (e.g., "FOS 7" -> 7)
      const aNum = parseInt(a.name.replace(/\D/g, '') || '0');
      const bNum = parseInt(b.name.replace(/\D/g, '') || '0');
      return aNum - bNum;
    });
  }

  /**
   * Get plane assets (sorted by name)
   */
  get planeAssets(): TileAsset[] {
    return this.getAssetsByType('PLANE').sort((a, b) => {
      // Sort planes alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Handle action button click
   */
  onActionClick(action: AssetAction, asset: TileAsset): void {
    if (action.disabled) return;

    // Handle FOS activation specially
    if (action.id === 'activate' && asset.type === 'FOS') {
      this.handleFosActivation(asset);
      return;
    }

    // Handle FOS deactivation specially
    if (action.id === 'deactivate' && asset.type === 'FOS') {
      this.handleFosDeactivation(asset);
      return;
    }

    // Handle RFI dialog
    if (action.id === 'rfi' && asset.type === 'FOS') {
      this.openRfiDialog();
      return;
    }

    // Handle Tasks dialog
    if (action.id === 'tasks' && asset.type === 'FOS') {
      this.openTasksDialog();
      return;
    }

    // Emit for other actions
    this.actionClicked.emit({ action, asset });
    console.log(`Action '${action.id}' clicked for asset '${asset.name}'`);
  }

  /**
   * Handle FOS activation with confirmation dialog
   */
  private handleFosActivation(asset: TileAsset): void {
    if (!this.gameId || this.availableTeams.length === 0) {
      this.snackBar.open('No teams available for FOS activation', 'Close', { duration: 3000 });
      return;
    }

    const fosNumber = parseInt(asset.name.replace(/\D/g, '') || '0');

    const dialogData: FosActivationDialogData = {
      fosName: asset.name,
      fosDisplayNumber: fosNumber,
      availableTeams: this.availableTeams,
      currentTurn: this.currentTurn
    };

    const dialogRef = this.dialog.open(FosActivationDialogComponent, {
      data: dialogData,
      width: '480px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: FosActivationDialogResult) => {
      if (result?.confirmed && result.selectedTeamId) {
        this.activateFos(fosNumber, result.selectedTeamId);
      }
    });
  }

  /**
   * Handle FOS deactivation
   */
  private handleFosDeactivation(asset: TileAsset): void {
    // For demo purposes, directly emit the deactivation event
    const action: AssetAction = {
      id: 'deactivate-fos',
      icon: 'power_settings_new',
      label: 'Deactivate FOS'
    };

    // Emit the action with assetId for the game-board to handle
    this.actionClicked.emit({
      action: { ...action, id: 'deactivate-fos' },
      asset: { ...asset, id: asset.id }
    });

    console.log(`Deactivating FOS: ${asset.id}`);

  }

  /**
   * Activate FOS via API
   */
  private activateFos(fosNumber: number, teamId: number): void {
    // Use fosNumber directly - API will create FOS if it doesn't exist
    this.fosService.activateFOS(fosNumber, teamId, this.currentTurn).subscribe({
      next: (updatedFos) => {
        this.updateLocalFos(updatedFos);
        this.snackBar.open(`FOS ${fosNumber} activated successfully!`, 'Close', { duration: 3000 });

        // Force UI refresh by reinitializing asset selections
        // This ensures the buttons update immediately for the current player
        setTimeout(() => {
          this.initializeAssetSelections();
        }, 100);
      },
      error: (error) => {
        console.error('Failed to activate FOS:', error);
        this.snackBar.open('Failed to activate FOS', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Deactivate FOS via API
   */
  private deactivateFos(fosId: string): void {
    this.fosService.deactivateFOS(fosId).subscribe({
      next: (updatedFos) => {
        this.updateLocalFos(updatedFos);
        this.snackBar.open(`FOS ${updatedFos.fosDisplayNumber} deactivated successfully!`, 'Close', { duration: 3000 });

        // Force UI refresh by reinitializing asset selections
        // This ensures the buttons update immediately for the current player
        setTimeout(() => {
          this.initializeAssetSelections();
        }, 100);
      },
      error: (error) => {
        console.error('Failed to deactivate FOS:', error);
        this.snackBar.open('Failed to deactivate FOS', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Handle FOS update by notifying parent component and immediately updating local state
   * This ensures the UI updates immediately for the current player, before WebSocket events arrive
   */
  private updateLocalFos(updatedFos: ForwardOperatingSite): void {
    // Find the static FOS to get its ID
    const staticFos = Object.values(FOS_LOCATIONS).find(f => {
      const fosNumber = parseInt(f.name.replace(/\D/g, '') || '0');
      return fosNumber === updatedFos.fosDisplayNumber;
    });

    if (staticFos) {
      // Immediately update the FOS state service with the new FOS data
      // This ensures the signals are updated right away for reactive UI
      const currentFosList = this.fosStateService.fosList();
      const existingIndex = currentFosList.findIndex(fos => fos.fosDisplayNumber === updatedFos.fosDisplayNumber);

      let updatedFosList: ForwardOperatingSite[];
      if (existingIndex >= 0) {
        // Update existing FOS
        updatedFosList = [...currentFosList];
        updatedFosList[existingIndex] = updatedFos;
      } else {
        // Add new FOS
        updatedFosList = [...currentFosList, updatedFos];
      }

      // Force immediate update of the FOS state signals
      // This bypasses waiting for WebSocket updates
      this.fosStateService.updateFosImmediately(updatedFosList);

      // Notify parent of FOS status change
      this.fosStatusChanged.emit({
        fosId: staticFos.id,
        isActive: updatedFos.isActive,
        teamId: updatedFos.teamId || undefined
      });
    }
  }

  /**
   * Toggle panel state (minimized → narrow → full → minimized on desktop, minimized ↔ full on mobile)
   */
  togglePanelState(): void {
    const isMobileDevice = this.isMobile().matches;

    if (isMobileDevice) {
      // Mobile: Toggle between minimized and full
      this.panelState = this.panelState === 'minimized' ? 'full' : 'minimized';
    } else {
      // Desktop: Cycle through minimized → narrow → full → minimized
      if (this.panelState === 'minimized') {
        this.panelState = 'narrow';
      } else if (this.panelState === 'narrow') {
        this.panelState = 'full';
      } else {
        this.panelState = 'minimized';
      }
    }

    this.panelStateChange.emit(this.panelState);
  }

  /**
   * Get the appropriate icon for the current panel state
   */
  getPanelIcon(): string {
    if (this.panelState === 'minimized') {
      return 'unfold_more';
    } else if (this.panelState === 'narrow') {
      return 'fullscreen';
    } else {
      return 'fullscreen_exit';
    }
  }

  /**
   * Get the appropriate tooltip for the current panel state
   */
  getPanelTooltip(): string {
    const isMobileDevice = this.isMobile().matches;

    if (isMobileDevice) {
      return this.panelState === 'minimized' ? 'Expand' : 'Minimize';
    } else {
      if (this.panelState === 'minimized') {
        return 'Show narrow panel';
      } else if (this.panelState === 'narrow') {
        return 'Expand to full width';
      } else {
        return 'Minimize';
      }
    }
  }

  /**
   * Select a specific MOB asset
   */
  selectMobAsset(asset: TileAsset): void {
    this.selectedMobAsset.set(asset);
  }

  /**
   * Select a specific FOS asset
   */
  selectFosAsset(asset: TileAsset): void {
    this.selectedFosAsset.set(asset);
  }

  /**
   * Select a specific plane asset
   */
  selectPlaneAsset(asset: TileAsset): void {
    this.selectedPlaneAsset.set(asset);
  }

  /**
   * Check if any assets exist on the selected hex
   */
  get hasAssets(): boolean {
    return this.tileAssets.length > 0;
  }

  /**
   * Get available asset types on the hex
   */
  get availableAssetTypes(): string[] {
    const types = new Set<string>();
    this.tileAssets.forEach(asset => types.add(asset.type));
    return Array.from(types);
  }

  /**
   * Open RFI dialog for the selected FOS
   */
  openRfiDialog(): void {
    const selectedFos = this.selectedFosAsset();
    const fosDisplayNumber = this.selectedFosDisplayNumber();
    const fosId = this.selectedFosId();
    const dbFos = this.selectedDbFos();

    if (!selectedFos || !fosDisplayNumber) {
      this.snackBar.open('No FOS selected', 'Close', { duration: 3000 });
      return;
    }

    // Create a dialog component inline using the existing FosRfiComponent
    const dialogRef = this.dialog.open(FosRfiDialogComponent, {
      data: {
        fosId: fosId,
        fosDisplayNumber: fosDisplayNumber,
        fosName: selectedFos.name,
        gameId: this.gameId,
        canEdit: this.canEdit(),
        isFullyAssessed: dbFos?.isFullyAssessed ?? false
      },
      width: '100vw',
      maxWidth: 'min(95vw, 1200px)',
      maxHeight: '90vh',
      panelClass: 'fos-dialog-responsive'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('RFI dialog closed', result);
    });
  }

  /**
   * Open Tasks dialog for the selected FOS
   */
  openTasksDialog(): void {
    const selectedFos = this.selectedFosAsset();
    const fosDisplayNumber = this.selectedFosDisplayNumber();
    const fosId = this.selectedFosId();

    if (!selectedFos || !fosDisplayNumber) {
      this.snackBar.open('No FOS selected', 'Close', { duration: 3000 });
      return;
    }

    // Create a dialog component inline using the existing FosTaskBoardComponent
    const dialogRef = this.dialog.open(FosTasksDialogComponent, {
      data: {
        fosId: fosId,
        fosDisplayNumber: fosDisplayNumber,
        fosName: selectedFos.name,
        gameId: this.gameId,
        canEdit: this.canEdit()
      },
      width: '100vw',
      maxWidth: 'min(95vw, 1200px)',
      maxHeight: '90vh',
      panelClass: 'fos-dialog-responsive'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Tasks dialog closed', result);
    });
  }

  /**
   * Check if current player can manage FOS (GM or MOB Commander)
   * Now uses the centralized PlayerRoleService
   */
  private canManageFos(): boolean {
    return this.playerRoleService.canCurrentPlayerManageFos();
  }

}

/**
 * Dialog data interface for FOS dialogs
 */
export interface FosDialogData {
  fosId: string | null;
  fosDisplayNumber: number;
  fosName: string;
  gameId: number | null;
  canEdit: boolean;
  isFullyAssessed?: boolean;
}

/**
 * RFI Dialog Component - wraps the FosRfiComponent in a dialog
 */
@Component({
  selector: 'app-fos-rfi-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    FosRfiComponent
  ],
  template: `
    <div class="fos-dialog-header flex items-center justify-between p-4 border-b">
      <h2 class="md-typescale-headline-small m-0">{{ data.fosName }} - RFI</h2>
      <button mat-icon-button (click)="close()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <div class="fos-dialog-content p-4">
      <app-fos-rfi
        [fosId]="data.fosId"
        [fosDisplayNumber]="data.fosDisplayNumber"
        [gameId]="data.gameId"
        [canEdit]="data.canEdit"
        [isFullyAssessed]="data.isFullyAssessed ?? false"
      ></app-fos-rfi>
    </div>
  `,
  styles: [`
    .fos-dialog-header {
      background: var(--mat-sys-surface-container);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .fos-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }
  `]
})
export class FosRfiDialogComponent {
  // Use inject() in place of constructor injection (lint rule)
  private dialogRef = inject(MatDialogRef<FosRfiDialogComponent>);
  public data = inject<FosDialogData>(MAT_DIALOG_DATA);

  close(): void {
    this.dialogRef.close();
  }
}

/**
 * Tasks Dialog Component - wraps the FosTaskBoardComponent in a dialog
 */
@Component({
  selector: 'app-fos-tasks-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    FosTaskBoardComponent
  ],
  template: `
    <div class="fos-dialog-header flex items-center justify-between p-4 border-b">
      <h2 class="md-typescale-headline-small m-0">{{ data.fosName }} - Tasks</h2>
      <button mat-icon-button (click)="close()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <div class="fos-dialog-content p-4">
      <app-fos-task-board
        [fosId]="data.fosId"
        [fosDisplayNumber]="data.fosDisplayNumber"
        [gameId]="data.gameId"
        [canEdit]="data.canEdit"
      ></app-fos-task-board>
    </div>
  `,
  styles: [`
    .fos-dialog-header {
      background: var(--mat-sys-surface-container);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .fos-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }
  `]
})
export class FosTasksDialogComponent {
  // Use inject() in place of constructor injection (lint rule)
  private dialogRef = inject(MatDialogRef<FosTasksDialogComponent>);
  public data = inject<FosDialogData>(MAT_DIALOG_DATA);

  close(): void {
    this.dialogRef.close();
  }
}

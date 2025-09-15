import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MOB_LOCATIONS, FOS_LOCATIONS, StaticLocation } from '../../../shared/config/static-locations.config';
import { GameStatsService } from '../game-stats/game-stats.service';
import { FosService } from '../services/fos.service';
import { ForwardOperatingSite, Team } from '../../../generated';
import { FosActivationDialogComponent, FosActivationDialogData, FosActivationDialogResult } from './fos-activation-dialog.component';

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
    MatButtonToggleModule
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
  @Input() activeFosIds: Set<string> = new Set(); // Track active FOSs from parent
  @Input() fosMobAssignments: Record<string, string> = {}; // Maps FOS ID to MOB ID
  @Input() currentPlayerMob: string | null = null; // Current player's MOB
  @Input() isGameMaster = false; // Whether current player is GM
  @Input() collapsed = true;
  @Output() actionClicked = new EventEmitter<{ action: AssetAction, asset: TileAsset }>();
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() fosStatusChanged = new EventEmitter<{ fosId: string, isActive: boolean, teamId?: number }>();

  private gameStatsService = inject(GameStatsService);
  private fosService = inject(FosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Database FOSs for the current game
  gameFOSs: ForwardOperatingSite[] = [];

  // Selected asset for each type
  selectedMobAsset: TileAsset | null = null;
  selectedFosAsset: TileAsset | null = null;
  selectedPlaneAsset: TileAsset | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['gameId'] && this.gameId) {
      // Load FOSs when game changes
      this.loadGameFOSs();
    }
    if (changes['selectedHex'] || changes['selectedH3Index']) {
      // Reset selections when hex changes
      this.initializeAssetSelections();
    }
  }

  /**
   * Load FOSs for the current game
   */
  private loadGameFOSs(): void {
    if (!this.gameId) return;

    this.fosService.getFOSsForGame(this.gameId).subscribe({
      next: (foss) => {
        this.gameFOSs = foss;
      },
      error: (error) => {
        console.error('Failed to load game FOSs:', error);
        this.snackBar.open('Failed to load FOS data', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Initialize asset selections when hex changes
   */
  private initializeAssetSelections(): void {
    const mobs = this.mobAssets;
    const foss = this.fosAssets;
    const planes = this.planeAssets;

    // Select first asset of each type if available
    this.selectedMobAsset = mobs.length > 0 ? mobs[0] : null;
    this.selectedFosAsset = foss.length > 0 ? foss[0] : null;
    this.selectedPlaneAsset = planes.length > 0 ? planes[0] : null;
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

    // Enhance with database information
    return staticFoss.map(staticFos => {
      // Find corresponding database FOS by fosIdNumber
      const fosNumber = parseInt(staticFos.name.replace(/\D/g, '') || '0');
      const dbFos = this.gameFOSs.find(f => f.fosIdNumber === fosNumber);

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
    const gameAssets = this.gameStatsService.gameAssets();
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
    // Check activation status from parent component's tracking
    const isActive = this.activeFosIds.has(fos.id);
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

    // Fallback to static color-based status
    switch (fos.color) {
      case 'green': return 'Available';
      case 'yellow': return 'Limited Access';
      case 'red': return 'Contested';
      default: return 'Dormant';
    }
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
   * Get FOS actions based on activation status, ownership, and permissions
   */
  private getFosActions(fos: StaticLocation & { dbFos?: ForwardOperatingSite }): AssetAction[] {
    const baseActions: AssetAction[] = [];

    // Check activation status from parent component's tracking
    const isActive = this.activeFosIds.has(fos.id);

    // Check if player's MOB owns this FOS or is GM
    const fosMobId = this.fosMobAssignments[fos.id];
    const isOwner = fosMobId === this.currentPlayerMob;
    const hasFullControl = isOwner || this.isGameMaster;

    if (isActive) {
      // FOS is active - show operational actions based on ownership

      if (hasFullControl) {
        // Full control - owner or GM can perform all actions
        baseActions.push(
          { id: 'fortify', icon: 'security', label: 'Fortify', tooltip: 'Fortify position' },
          { id: 'deploy', icon: 'send', label: 'Deploy', tooltip: 'Deploy units from this FOS', color: 'primary' },
          { id: 'scout', icon: 'explore', label: 'Scout', tooltip: 'Scout surrounding area' },
          { id: 'resupply', icon: 'inventory_2', label: 'Resupply', tooltip: 'Request supplies' },
          { id: 'upgrade', icon: 'upgrade', label: 'Upgrade', tooltip: 'Upgrade FOS capabilities' },
          { id: 'intel', icon: 'radar', label: 'Intel', tooltip: 'Gather intelligence' },
          { id: 'transfer', icon: 'swap_horiz', label: 'Transfer', tooltip: 'Transfer control to another MOB' }
        );

        // Add deactivation for owners/GM
        baseActions.push(
          { id: 'deactivate', icon: 'power_settings_new', label: 'Deactivate', tooltip: 'Deactivate this FOS', color: 'warn' }
        );

        // GM-only actions
        if (this.isGameMaster) {
          baseActions.push(
            { id: 'gm-edit', icon: 'edit', label: 'Edit', tooltip: 'GM: Edit FOS properties', color: 'accent' },
            { id: 'gm-delete', icon: 'delete', label: 'Delete', tooltip: 'GM: Remove FOS from game', color: 'warn', disabled: false }
          );
        }
      } else {
        // Limited actions for non-owners (can only observe)
        baseActions.push(
          { id: 'view-intel', icon: 'visibility', label: 'View Intel', tooltip: 'View public information' },
          { id: 'request-access', icon: 'vpn_key', label: 'Request Access', tooltip: 'Request access from owner' }
        );

        // Show which MOB controls it
        if (fosMobId) {
          const mobName = MOB_LOCATIONS[fosMobId]?.name || fosMobId;
          baseActions.push(
            { id: 'view-owner', icon: 'home', label: mobName, tooltip: `Controlled by ${mobName} MOB`, disabled: true }
          );
        }
      }
    } else {
      // FOS is inactive - show activation option based on permissions
      if (this.isGameMaster) {
        // GM can always activate
        baseActions.push(
          { id: 'activate', icon: 'power_settings_new', label: 'Activate', tooltip: 'Activate this FOS', color: 'accent' },
          { id: 'gm-assign', icon: 'assignment_ind', label: 'Assign MOB', tooltip: 'GM: Assign to a MOB', color: 'accent' }
        );
      } else if (fos.color === 'green' || fos.color === 'yellow') {
        // Regular players can only activate politically accessible FOSs
        baseActions.push(
          { id: 'activate', icon: 'power_settings_new', label: 'Activate', tooltip: 'Activate this FOS', color: 'accent' }
        );

        if (fos.color === 'yellow') {
          baseActions.push(
            { id: 'negotiate', icon: 'handshake', label: 'Negotiate', tooltip: 'Negotiate for access', color: 'primary' }
          );
        }
      } else if (fos.color === 'red') {
        // Contested areas require special actions
        baseActions.push(
          { id: 'contest', icon: 'flag', label: 'Contest', tooltip: 'Contest control of this area', color: 'warn', disabled: !this.currentPlayerMob }
        );
      }
    }

    // Add emergency evacuation for contested areas
    if (fos.color === 'red' && fos.dbFos?.isActive) {
      baseActions.push({ id: 'evacuate', icon: 'emergency', label: 'Evacuate', tooltip: 'Emergency evacuation', color: 'warn' });
    }

    return baseActions;
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
      fosIdNumber: fosNumber,
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
    // Check if FOS already exists in database
    const dbFos = this.gameFOSs.find(f => f.fosIdNumber === fosNumber);

    if (dbFos) {
      // Update existing FOS
      this.fosService.activateFOS(dbFos.id, teamId, this.currentTurn).subscribe({
        next: (updatedFos) => {
          this.updateLocalFos(updatedFos);
          this.snackBar.open(`FOS ${fosNumber} activated successfully!`, 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Failed to activate FOS:', error);
          this.snackBar.open('Failed to activate FOS', 'Close', { duration: 3000 });
        }
      });
    } else {
      // Create new FOS in database first, then activate
      // This would require additional API endpoint for creating FOSs
      this.snackBar.open('FOS creation not implemented yet', 'Close', { duration: 3000 });
    }
  }

  /**
   * Deactivate FOS via API
   */
  private deactivateFos(fosId: number): void {
    this.fosService.deactivateFOS(fosId).subscribe({
      next: (updatedFos) => {
        this.updateLocalFos(updatedFos);
        this.snackBar.open(`FOS ${updatedFos.fosIdNumber} deactivated successfully!`, 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Failed to deactivate FOS:', error);
        this.snackBar.open('Failed to deactivate FOS', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Update local FOS array with updated FOS data
   */
  private updateLocalFos(updatedFos: ForwardOperatingSite): void {
    const index = this.gameFOSs.findIndex(f => f.id === updatedFos.id);
    if (index !== -1) {
      this.gameFOSs[index] = updatedFos;
    } else {
      this.gameFOSs.push(updatedFos);
    }

    // Find the static FOS to get its ID
    const staticFos = Object.values(FOS_LOCATIONS).find(f => {
      const fosNumber = parseInt(f.name.replace(/\D/g, '') || '0');
      return fosNumber === updatedFos.fosIdNumber;
    });

    if (staticFos) {
      // Notify parent of FOS status change
      this.fosStatusChanged.emit({
        fosId: staticFos.id,
        isActive: updatedFos.isActive,
        teamId: updatedFos.teamId || undefined
      });
    }
  }

  /**
   * Toggle collapsed state
   */
  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  /**
   * Select a specific MOB asset
   */
  selectMobAsset(asset: TileAsset): void {
    this.selectedMobAsset = asset;
  }

  /**
   * Select a specific FOS asset
   */
  selectFosAsset(asset: TileAsset): void {
    this.selectedFosAsset = asset;
  }

  /**
   * Select a specific plane asset
   */
  selectPlaneAsset(asset: TileAsset): void {
    this.selectedPlaneAsset = asset;
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

}

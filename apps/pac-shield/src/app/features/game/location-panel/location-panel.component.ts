import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MOB_LOCATIONS, FOS_LOCATIONS, StaticLocation } from '../../../shared/config/static-locations.config';
import { GameStatsService } from '../game-stats';

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
  @Input() collapsed = false;
  @Output() actionClicked = new EventEmitter<{action: AssetAction, asset: TileAsset}>();
  @Output() collapsedChange = new EventEmitter<boolean>();

  private gameStatsService = inject(GameStatsService);

  // Selected asset for each type
  selectedMobAsset: TileAsset | null = null;
  selectedFosAsset: TileAsset | null = null;
  selectedPlaneAsset: TileAsset | null = null;

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
  private getFosAtHex(h3Index: string): StaticLocation[] {
    return Object.values(FOS_LOCATIONS).filter(fos => fos.h3Index === h3Index);
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
   * Get FOS status based on color
   */
  private getFosStatus(fos: StaticLocation): string {
    switch (fos.color) {
      case 'green': return 'Active';
      case 'yellow': return 'Limited';
      case 'red': return 'Contested';
      default: return 'Unknown';
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
   * Get FOS actions based on status
   */
  private getFosActions(fos: StaticLocation): AssetAction[] {
    const baseActions: AssetAction[] = [
      { id: 'fortify', icon: 'security', label: 'Fortify', tooltip: 'Fortify position' },
      { id: 'scout', icon: 'explore', label: 'Scout', tooltip: 'Scout surrounding area' },
      { id: 'resupply', icon: 'inventory_2', label: 'Resupply', tooltip: 'Request supplies' }
    ];
    
    if (fos.color === 'green') {
      baseActions.unshift({ id: 'activate', icon: 'power_settings_new', label: 'Activate', tooltip: 'Activate this FOS', color: 'accent' });
    }
    
    if (fos.color === 'red') {
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
    if (!action.disabled) {
      this.actionClicked.emit({ action, asset });
      console.log(`Action '${action.id}' clicked for asset '${asset.name}'`);
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

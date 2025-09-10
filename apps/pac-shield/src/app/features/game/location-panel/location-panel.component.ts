import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';

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
    MatDividerModule
  ],
  templateUrl: './location-panel.component.html',
  styleUrls: ['./location-panel.component.scss']
})
export class LocationPanelComponent {
  @Input() selectedHex: string | null = null;
  @Input() collapsed = false;
  @Output() actionClicked = new EventEmitter<{action: AssetAction, asset: TileAsset}>();
  @Output() collapsedChange = new EventEmitter<boolean>();

  // Demo tile assets - in real app, this would come from game state based on selectedHex
  tileAssets: TileAsset[] = [
    {
      id: 'mob-kadena',
      type: 'MOB',
      name: 'Kadena Air Base',
      status: 'Operational',
      actions: [
        { id: 'launch', icon: 'flight_takeoff', label: 'Launch', tooltip: 'Launch aircraft from this base', color: 'primary' },
        { id: 'defend', icon: 'shield', label: 'Defend', tooltip: 'Set defensive posture' },
        { id: 'repair', icon: 'build', label: 'Repair', tooltip: 'Repair damaged assets' },
        { id: 'resupply', icon: 'inventory_2', label: 'Resupply', tooltip: 'Request supply delivery' },
        { id: 'intel', icon: 'radar', label: 'Intel', tooltip: 'Gather intelligence' },
        { id: 'upgrade', icon: 'upgrade', label: 'Upgrade', tooltip: 'Upgrade base capabilities' }
      ]
    },
    {
      id: 'fos-7',
      type: 'FOS',
      name: 'FOS 7',
      status: 'Active',
      actions: [
        { id: 'activate', icon: 'power_settings_new', label: 'Activate', tooltip: 'Activate this FOS', color: 'accent' },
        { id: 'fortify', icon: 'security', label: 'Fortify', tooltip: 'Fortify position' },
        { id: 'evacuate', icon: 'emergency', label: 'Evacuate', tooltip: 'Emergency evacuation', color: 'warn' },
        { id: 'scout', icon: 'explore', label: 'Scout', tooltip: 'Scout surrounding area' }
      ]
    },
    {
      id: 'f22-wing',
      type: 'PLANE',
      name: 'F-22 Squadron',
      status: 'Airborne',
      actions: [
        { id: 'attack', icon: 'gps_fixed', label: 'Attack', tooltip: 'Attack target', color: 'warn' },
        { id: 'patrol', icon: 'track_changes', label: 'Patrol', tooltip: 'Set patrol route' },
        { id: 'intercept', icon: 'call_merge', label: 'Intercept', tooltip: 'Intercept enemy aircraft' },
        { id: 'rtb', icon: 'flight_land', label: 'RTB', tooltip: 'Return to base' },
        { id: 'refuel', icon: 'local_gas_station', label: 'Refuel', tooltip: 'Request air refueling' },
        { id: 'escort', icon: 'group', label: 'Escort', tooltip: 'Escort friendly units' }
      ]
    },
    {
      id: 'c17-transport',
      type: 'PLANE',
      name: 'C-17 Transport',
      status: 'En Route',
      actions: [
        { id: 'land', icon: 'flight_land', label: 'Land', tooltip: 'Land at destination' },
        { id: 'drop', icon: 'paragliding', label: 'Air Drop', tooltip: 'Air drop supplies' },
        { id: 'divert', icon: 'alt_route', label: 'Divert', tooltip: 'Divert to alternate' },
        { id: 'hold', icon: 'pause_circle', label: 'Hold', tooltip: 'Hold position' }
      ]
    }
  ];

  /**
   * Get assets by type
   */
  getAssetsByType(type: string): TileAsset[] {
    return this.tileAssets.filter(asset => asset.type === type);
  }

  /**
   * Get MOB assets
   */
  get mobAssets(): TileAsset[] {
    return this.getAssetsByType('MOB');
  }

  /**
   * Get FOS assets
   */
  get fosAssets(): TileAsset[] {
    return this.getAssetsByType('FOS');
  }

  /**
   * Get plane assets
   */
  get planeAssets(): TileAsset[] {
    return this.getAssetsByType('PLANE');
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

}

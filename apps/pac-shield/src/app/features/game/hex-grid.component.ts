import { Component, Input, Output, EventEmitter, OnDestroy, inject } from '@angular/core';
import { Map } from 'maplibre-gl';
import { ThemeService } from '../../shared/services/theme.service';
import { Store } from '@ngrx/store';
import { setHexGrid } from '../../core/store/game/game.actions';
import { HexGridService, HexGridConfig } from './services/hex-grid.service';
import { Grid, Hex } from 'honeycomb-grid';

export interface HexSelectionEvent {
  hex: Hex;
  visualCoordinate: string;
}

/**
 * Interface for hex feature properties
 */
interface HexFeatureProperties {
  hexId: string;
  visualCoordLabel:string;
}

/**
 * Component Intent: Manages the H3 hex grid overlay system for the game board map.
 *
 * This component provides:
 * - H3 hex grid generation with configurable resolution and size
 * - Visual coordinate mapping system (e.g., "505", "506A")
 * - Hex selection and hover interactions
 * - Theme-aware styling with Material Design colors
 * - Proper cleanup and re-initialization on style changes
 *
 * Key responsibilities:
 * - Generate H3 hexagons around a center point
 * - Map H3 internal indexes to human-readable coordinates
 * - Handle hex selection events and visual feedback
 * - Maintain theme consistency across light/dark modes
 * - Manage MapLibre GL layers and sources lifecycle
 */
@Component({
  selector: 'app-hex-grid',
  standalone: true,
  template: ''
})
export class HexGridComponent implements OnDestroy {
  @Input() map!: Map;
  @Input() gridConfig: HexGridConfig = {
    hexSize: 100,
    centerX: 109.5,
    centerY: 18.2,
    width: 15,
    height: 15
  };

  @Output() hexSelected = new EventEmitter<HexSelectionEvent>();
  @Output() hexHovered = new EventEmitter<HexSelectionEvent | null>();

  private themeService = inject(ThemeService);
  private store = inject(Store);
  private hexGridService = inject(HexGridService);

  private selectedHexCoordinate: string | null = null;
  private hexIdToVisualCoordDictionary: Record<string, string> = {};

  private hexClickHandler?: (e: any) => void;
  private hexMouseEnterHandler?: () => void;
  private hexMouseLeaveHandler?: () => void;

  private readonly LAYER_IDS = {
    fill: 'hex-grid-fill',
    outline: 'hex-grid-outline',
    labels: 'hex-labels',
    selected: 'hex-grid-selected'
  };

  private readonly SOURCE_ID = 'hex-grid';

  initializeHexGrid(): void {
    if (!this.map) {
      console.error('HexGridComponent: Map instance not provided');
      return;
    }

    this.hexGridService.initializeGrid(this.gridConfig);
    const hexFeatures = this.generateHexFeatures();
    this.addOrUpdateSource(hexFeatures);
    this.addHexLayers();
    this.setupEventHandlers();
    this.updateColors();
  }

  private generateHexFeatures(): any[] {
    const hexes = this.hexGridService.getGrid();
    this.hexIdToVisualCoordDictionary = this.generateVisualHexCoordinates(hexes);

    // Dispatch action to save hex grid data in the store
    // this.store.dispatch(setHexGrid({ hexGrid: this.hexIdToVisualCoordDictionary }));

    const features: any[] = [];
    for (const hex of hexes) {
      const visualCoordLabel = this.hexIdToVisualCoordDictionary[hex.toString()] || hex.toString();
      const geoJson = this.hexGridService.hexToGeoJSON(hex);
      geoJson.properties = {
        hexId: hex.toString(),
        visualCoordLabel
      };
      features.push(geoJson);
    }
    return features;
  }

  private generateVisualHexCoordinates(grid: Grid<Hex>): Record<string, string> {
    const hexIdToVisualCoord: Record<string, string> = {};
    const centerHex = this.hexGridService.pointToHex(this.gridConfig.centerX, this.gridConfig.centerY);

    for (const hex of grid) {
      if (hex.equals(centerHex)) {
        hexIdToVisualCoord[hex.toString()] = '505';
        continue;
      }

      const col = 5 + (hex.q - centerHex.q);
      const row = 5 + (hex.r - centerHex.r);

      const visualCoordLabel = `${row}${col.toString().padStart(2, '0')}`;
      hexIdToVisualCoord[hex.toString()] = visualCoordLabel;
    }

    return hexIdToVisualCoord;
  }

  private addOrUpdateSource(hexFeatures: any[]): void {
    const source = this.map.getSource(this.SOURCE_ID);
    const featureCollection = {
      type: 'FeatureCollection',
      features: hexFeatures
    } as GeoJSON.FeatureCollection;

    if (!source) {
      this.map.addSource(this.SOURCE_ID, {
        type: 'geojson',
        data: featureCollection
      });
    } else {
      (source as any).setData(featureCollection);
    }
  }

  private addHexLayers(): void {
    const colors = this.getThemeColors();

    if (!this.map.getLayer(this.LAYER_IDS.fill)) {
      this.map.addLayer({
        id: this.LAYER_IDS.fill,
        type: 'fill',
        source: this.SOURCE_ID,
        paint: {
          'fill-color': colors.primary,
          'fill-opacity': 0.1
        }
      });
    }

    if (!this.map.getLayer(this.LAYER_IDS.outline)) {
      this.map.addLayer({
        id: this.LAYER_IDS.outline,
        type: 'line',
        source: this.SOURCE_ID,
        paint: {
          'line-color': colors.primary,
          'line-width': 2,
          'line-opacity': 1,
          'line-dasharray': [3, 3]
        }
      });
    }

    if (!this.map.getLayer(this.LAYER_IDS.labels)) {
      this.map.addLayer({
        id: this.LAYER_IDS.labels,
        type: 'symbol',
        source: this.SOURCE_ID,
        layout: {
          'text-field': ['get', 'visualCoordLabel'],
        },
        paint: {
          'text-color': colors.onSurfaceVariant,
          'text-opacity': 0.6
        }
      }, this.LAYER_IDS.outline);
    }

    if (!this.map.getLayer(this.LAYER_IDS.selected)) {
      this.map.addLayer({
        id: this.LAYER_IDS.selected,
        type: 'line',
        source: this.SOURCE_ID,
        paint: {
          'line-color': colors.primary,
          'line-width': 4,
          'line-opacity': 1
        },
        filter: ['==', 'visualCoordLabel', ''] as any
      });
    }
  }

  private getThemeColors(): { outlineVariant: string, onSurfaceVariant: string, primary: string } {
    const computedStyle = getComputedStyle(document.body);
    return {
      outlineVariant: computedStyle.getPropertyValue('--mat-sys-outline-variant').trim() || '#666666',
      onSurfaceVariant: computedStyle.getPropertyValue('--mat-sys-outline').trim() ||
        computedStyle.getPropertyValue('--mat-sys-on-surface-variant').trim() || '#666666',
      primary: computedStyle.getPropertyValue('--mat-sys-primary').trim() || '#0066CC'
    };
  }

  updateColors(): void {
    if (!this.map) return;
    const colors = this.getThemeColors();

    if (this.map.getLayer(this.LAYER_IDS.fill)) {
      this.map.setPaintProperty(this.LAYER_IDS.fill, 'fill-color', colors.outlineVariant);
    }
    if (this.map.getLayer(this.LAYER_IDS.outline)) {
      this.map.setPaintProperty(this.LAYER_IDS.outline, 'line-color', colors.outlineVariant);
    }
    if (this.map.getLayer(this.LAYER_IDS.labels)) {
      this.map.setPaintProperty(this.LAYER_IDS.labels, 'text-color', colors.onSurfaceVariant);
    }
    if (this.map.getLayer(this.LAYER_IDS.selected)) {
      const currentFilter = this.selectedHexCoordinate ?
        ['==', 'visualCoordLabel', this.selectedHexCoordinate] :
        ['==', 'visualCoordLabel', ''];
      this.map.removeLayer(this.LAYER_IDS.selected);
      this.map.addLayer({
        id: this.LAYER_IDS.selected,
        type: 'line',
        source: this.SOURCE_ID,
        paint: {
          'line-color': colors.primary,
          'line-width': 4,
          'line-opacity': 1
        },
        filter: currentFilter as any
      });
    }
  }

  private setupEventHandlers(): void {
    this.removeEventHandlers();

    this.hexClickHandler = (e: any) => {
      if (e.features && e.features[0]) {
        const properties = e.features[0].properties as HexFeatureProperties;
        this.selectHex(properties.visualCoordLabel);

        let selectedHex: Hex | undefined;
        for (const hex of this.hexGridService.getGrid()) {
          if (hex.toString() === properties.hexId) {
            selectedHex = hex;
            break;
          }
        }

        if (selectedHex) {
          this.hexSelected.emit({
            hex: selectedHex,
            visualCoordinate: properties.visualCoordLabel,
          });
        }
      }
    };
    this.map.on('click', this.LAYER_IDS.fill, this.hexClickHandler);

    this.hexMouseEnterHandler = () => {
      this.map.getCanvas().style.cursor = 'pointer';
    };
    this.map.on('mouseenter', this.LAYER_IDS.fill, this.hexMouseEnterHandler);

    this.hexMouseLeaveHandler = () => {
      this.map.getCanvas().style.cursor = '';
    };
    this.map.on('mouseleave', this.LAYER_IDS.fill, this.hexMouseLeaveHandler);
  }

  private removeEventHandlers(): void {
    if (this.hexClickHandler) {
      this.map.off('click', this.LAYER_IDS.fill, this.hexClickHandler);
    }
    if (this.hexMouseEnterHandler) {
      this.map.off('mouseenter', this.LAYER_IDS.fill, this.hexMouseEnterHandler);
    }
    if (this.hexMouseLeaveHandler) {
      this.map.off('mouseleave', this.LAYER_IDS.fill, this.hexMouseLeaveHandler);
    }
  }

  selectHex(visualCoordinate: string | null): void {
    this.selectedHexCoordinate = visualCoordinate;
    if (this.map && this.map.getLayer(this.LAYER_IDS.selected)) {
      const filter = visualCoordinate ?
        ['==', 'visualCoordLabel', visualCoordinate] :
        ['==', 'visualCoordLabel', ''];
      this.map.setFilter(this.LAYER_IDS.selected, filter as any);
    }
  }

  getSelectedHex(): string | null {
    return this.selectedHexCoordinate;
  }

  getVisualCoordinate(hexId: string): string | undefined {
    return this.hexIdToVisualCoordDictionary[hexId];
  }

  getHexId(visualCoordinate: string): string | undefined {
    return Object.keys(this.hexIdToVisualCoordDictionary)
      .find(key => this.hexIdToVisualCoordDictionary[key] === visualCoordinate);
  }

  ngOnDestroy(): void {
    this.removeEventHandlers();
  }

  reinitialize(): void {
    const currentSelection = this.selectedHexCoordinate;
    this.initializeHexGrid();
    if (currentSelection) {
      this.selectHex(currentSelection);
    }
  }
}

import { Component, Input, Output, EventEmitter, OnDestroy, inject } from '@angular/core';
import { Map } from 'maplibre-gl';
import { latLngToCell, cellToBoundary, cellToLatLng, gridDisk } from 'h3-js';
import { ThemeService } from '../../shared/services/theme.service';
import { Store } from '@ngrx/store';
import { setHexGrid } from '../../core/store/game/game.actions';

/**
 * Interface for hex selection events
 */
export interface HexSelectionEvent {
  h3Index: string;
  visualCoordinate: string;
  centerLat: number;
  centerLng: number;
}

/**
 * Interface for hex feature properties
 */
interface HexFeatureProperties {
  h3InternalIndex: string;
  visualCoordLabel: string;
  centerLat: number;
  centerLng: number;
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
  @Input() centerLat = 18.2; // Hainan Island default
  @Input() centerLng = 109.5; // Hainan Island default
  @Input() h3Resolution = 1;
  @Input() kRingSize = 7;

  @Output() hexSelected = new EventEmitter<HexSelectionEvent>();
  @Output() hexHovered = new EventEmitter<HexSelectionEvent | null>();

  private themeService = inject(ThemeService);
  private store = inject(Store);

  // State management
  private selectedHexCoordinate: string | null = null;
  private h3IndexToVisualCoordDictionary: Record<string, string> = {};

  // Event handler references for cleanup
  private hexClickHandler?: (e: any) => void;
  private hexMouseEnterHandler?: () => void;
  private hexMouseLeaveHandler?: () => void;

  // Layer configuration constants
  private readonly LAYER_IDS = {
    fill: 'hex-grid-fill',
    outline: 'hex-grid-outline',
    labels: 'hex-labels',
    selected: 'hex-grid-selected'
  };

  private readonly SOURCE_ID = 'hex-grid';

  /**
   * Initialize the hex grid overlay on the map
   */
  initializeHexGrid(): void {
    if (!this.map) {
      console.error('HexGridComponent: Map instance not provided');
      return;
    }

    // Generate hex features
    const hexFeatures = this.generateHexFeatures();

    // Add or update the GeoJSON source
    this.addOrUpdateSource(hexFeatures);

    // Add layers if they don't exist
    this.addHexLayers();

    // Set up event handlers
    this.setupEventHandlers();

    // Apply current theme colors
    this.updateColors();
  }

  /**
   * Generate hex features with H3 and create visual coordinate mapping
   */
  private generateHexFeatures(): any[] {
    const hexFeatures: any[] = [];

    // Get the central H3 index
    const centerH3Index = latLngToCell(this.centerLat, this.centerLng, this.h3Resolution);

    // Get all hexes in a k-ring around the center
    const h3InternalIndexes = gridDisk(centerH3Index, this.kRingSize);

    // Create mapping from H3 internal indexes to visual hex coordinates
    this.h3IndexToVisualCoordDictionary = this.generateVisualHexCoordinates(centerH3Index, h3InternalIndexes);

    // Dispatch action to save hex grid data in the store
    this.store.dispatch(setHexGrid({ hexGrid: this.h3IndexToVisualCoordDictionary }));

    // Create GeoJSON features for each hex
    h3InternalIndexes.forEach((h3InternalIndex: string) => {
      // Get the vertices of the hex
      const boundary = cellToBoundary(h3InternalIndex);
      // H3-js returns [lat, lon], but GeoJSON needs [lon, lat]
      const geoJsonBoundary = boundary.map((coord: number[]) => [coord[1], coord[0]]);

      // Close the polygon
      geoJsonBoundary.push(geoJsonBoundary[0]);

      // Get the center of the hex for labeling
      const [centerLat, centerLng] = cellToLatLng(h3InternalIndex);

      // Get visual coordinate label for this hex
      const visualCoordLabel = this.h3IndexToVisualCoordDictionary[h3InternalIndex] || h3InternalIndex;

      hexFeatures.push({
        type: 'Feature',
        properties: {
          h3InternalIndex,
          visualCoordLabel,
          centerLat,
          centerLng
        } as HexFeatureProperties,
        geometry: {
          type: 'Polygon',
          coordinates: [geoJsonBoundary]
        }
      });
    });

    return hexFeatures;
  }

  /**
   * Generate visual hex coordinates mapping
   * Maps H3 internal indexes to human-readable coordinates (e.g., "505", "506A")
   */
  private generateVisualHexCoordinates(centerH3InternalIndex: string, h3InternalIndexes: string[]): Record<string, string> {
    const h3IndexToVisualCoordDictionary: Record<string, string> = {};

    // Get geographic positions for each H3 internal index
    const h3IndexToGeoPosition: Record<string, { lat: number, lng: number }> = {};
    h3InternalIndexes.forEach(h3InternalIndex => {
      const [lat, lng] = cellToLatLng(h3InternalIndex);
      h3IndexToGeoPosition[h3InternalIndex] = { lat, lng };
    });

    const centerGeoPosition = h3IndexToGeoPosition[centerH3InternalIndex];

    // First pass: Calculate initial visual coordinates
    const initialVisualCoords: Record<string, string> = {};
    h3InternalIndexes.forEach(h3InternalIndex => {
      const geoPos = h3IndexToGeoPosition[h3InternalIndex];

      if (h3InternalIndex === centerH3InternalIndex) {
        // Center hex is always visual coordinate 505
        initialVisualCoords[h3InternalIndex] = '505';
        return;
      }

      // Calculate distance and bearing from center
      const deltaLat = geoPos.lat - centerGeoPosition.lat;
      const deltaLng = geoPos.lng - centerGeoPosition.lng;

      // Grid approximation factors based on H3 resolution
      const latStep = 7.5; // Approximate degrees per hex row at this resolution
      const lngStep = 13.0; // Approximate degrees per hex column at this resolution

      const rowOffset = Math.round(deltaLat / latStep);
      const colOffset = Math.round(deltaLng / lngStep);

      // Convert to coordinate system: Center is 505 (row 5, col 5)
      const row = 5 - rowOffset; // North is negative row offset
      const col = 5 + colOffset; // East is positive col offset

      // Clamp to reasonable bounds
      const clampedRow = Math.max(0, Math.min(9, row));
      const clampedCol = Math.max(0, Math.min(99, col));

      const visualCoordLabel = `${clampedRow}${clampedCol.toString().padStart(2, '0')}`;
      initialVisualCoords[h3InternalIndex] = visualCoordLabel;
    });

    // Second pass: Group by visual coordinates to identify duplicates
    const visualCoordGroups: Record<string, string[]> = {};
    Object.entries(initialVisualCoords).forEach(([h3InternalIndex, visualCoordLabel]) => {
      if (!visualCoordGroups[visualCoordLabel]) {
        visualCoordGroups[visualCoordLabel] = [];
      }
      visualCoordGroups[visualCoordLabel].push(h3InternalIndex);
    });

    // Third pass: Assign final coordinates with alphabetical suffixes for duplicates
    Object.entries(visualCoordGroups).forEach(([visualCoordLabel, h3InternalIndexGroup]) => {
      if (h3InternalIndexGroup.length === 1) {
        // No duplicates, use original visual coordinate
        h3IndexToVisualCoordDictionary[h3InternalIndexGroup[0]] = visualCoordLabel;
      } else {
        // Handle duplicates by appending alphabetical suffixes
        h3InternalIndexGroup.forEach((h3InternalIndex, index) => {
          const suffix = String.fromCharCode(65 + index); // A, B, C, etc.
          h3IndexToVisualCoordDictionary[h3InternalIndex] = `${visualCoordLabel}${suffix}`;
        });
      }
    });

    return h3IndexToVisualCoordDictionary;
  }

  /**
   * Add or update the hex grid GeoJSON source
   */
  private addOrUpdateSource(hexFeatures: any[]): void {
    const source = this.map.getSource(this.SOURCE_ID);

    if (!source) {
      this.map.addSource(this.SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: hexFeatures
        }
      });
    } else {
      (source as any).setData({
        type: 'FeatureCollection',
        features: hexFeatures
      });
    }
  }

  /**
   * Add hex grid layers to the map
   */
  private addHexLayers(): void {
    // Get current theme colors
    const colors = this.getThemeColors();

    // Add hex grid fill layer
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

    // Add hex grid outline layer
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

    // Add hex labels layer
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

    // Add hex grid selected layer
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

  /**
   * Get current theme colors from CSS variables
   */
  private getThemeColors(): { outlineVariant: string, onSurfaceVariant: string, primary: string } {

    const computedStyle = getComputedStyle(document.body);

    return {
      outlineVariant: computedStyle.getPropertyValue('--mat-sys-outline-variant').trim() || '#666666',
      onSurfaceVariant: computedStyle.getPropertyValue('--mat-sys-outline').trim() ||
        computedStyle.getPropertyValue('--mat-sys-on-surface-variant').trim() || '#666666',
      primary: computedStyle.getPropertyValue('--mat-sys-primary').trim() || '#0066CC'
    };
  }

  /**
   * Update layer colors to match current theme
   */
  updateColors(): void {
    if (!this.map) return;

    const colors = this.getThemeColors();

    console.log('HexGridComponent - Updating colors:', colors);
    console.log('HexGridComponent - Current theme:', this.themeService.isDarkMode() ? 'dark' : 'light');

    try {
      // Update hex grid fill colors
      if (this.map.getLayer(this.LAYER_IDS.fill)) {
        this.map.setPaintProperty(this.LAYER_IDS.fill, 'fill-color', colors.outlineVariant);
      }

      // Update hex grid outline colors
      if (this.map.getLayer(this.LAYER_IDS.outline)) {
        this.map.setPaintProperty(this.LAYER_IDS.outline, 'line-color', colors.outlineVariant);
      }

      // Update hex label colors
      if (this.map.getLayer(this.LAYER_IDS.labels)) {
        this.map.setPaintProperty(this.LAYER_IDS.labels, 'text-color', colors.onSurfaceVariant);
      }

      // Recreate selected layer to ensure color update (MapLibre caching workaround)
      if (this.map.getLayer(this.LAYER_IDS.selected)) {
        const currentFilter = this.selectedHexCoordinate ?
          ['==', 'visualCoordLabel', this.selectedHexCoordinate] :
          ['==', 'visualCoordLabel', ''];

        // Remove and recreate the layer
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
    } catch (error) {
      console.error('HexGridComponent - Error updating colors:', error);
    }
  }

  /**
   * Set up event handlers for hex interaction
   */
  private setupEventHandlers(): void {
    // Remove previous handlers if they exist
    this.removeEventHandlers();

    // Click handler for hex selection
    this.hexClickHandler = (e: any) => {
      if (e.features && e.features[0]) {
        const properties = e.features[0].properties as HexFeatureProperties;
        this.selectHex(properties.visualCoordLabel);

        // Emit selection event
        this.hexSelected.emit({
          h3Index: properties.h3InternalIndex,
          visualCoordinate: properties.visualCoordLabel,
          centerLat: properties.centerLat,
          centerLng: properties.centerLng
        });
      }
    };
    this.map.on('click', this.LAYER_IDS.fill, this.hexClickHandler);

    // Mouse enter handler for hover effect
    this.hexMouseEnterHandler = () => {
      this.map.getCanvas().style.cursor = 'pointer';
    };
    this.map.on('mouseenter', this.LAYER_IDS.fill, this.hexMouseEnterHandler);

    // Mouse leave handler
    this.hexMouseLeaveHandler = () => {
      this.map.getCanvas().style.cursor = '';
    };
    this.map.on('mouseleave', this.LAYER_IDS.fill, this.hexMouseLeaveHandler);
  }

  /**
   * Remove event handlers for cleanup
   */
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

  /**
   * Select a hex by its visual coordinate
   */
  selectHex(visualCoordinate: string | null): void {
    this.selectedHexCoordinate = visualCoordinate;

    if (this.map && this.map.getLayer(this.LAYER_IDS.selected)) {
      const filter = visualCoordinate ?
        ['==', 'visualCoordLabel', visualCoordinate] :
        ['==', 'visualCoordLabel', ''];

      this.map.setFilter(this.LAYER_IDS.selected, filter as any);
    }
  }

  /**
   * Get the currently selected hex coordinate
   */
  getSelectedHex(): string | null {
    return this.selectedHexCoordinate;
  }

  /**
   * Get the visual coordinate for an H3 index
   */
  getVisualCoordinate(h3Index: string): string | undefined {
    return this.h3IndexToVisualCoordDictionary[h3Index];
  }

  /**
   * Get the H3 index for a visual coordinate
   */
  getH3Index(visualCoordinate: string): string | undefined {
    return Object.keys(this.h3IndexToVisualCoordDictionary)
      .find(key => this.h3IndexToVisualCoordDictionary[key] === visualCoordinate);
  }

  /**
   * Clean up resources on component destroy
   */
  ngOnDestroy(): void {
    this.removeEventHandlers();
  }

  /**
   * Reinitialize hex grid (useful after map style changes)
   */
  reinitialize(): void {
    // Store current selection
    const currentSelection = this.selectedHexCoordinate;

    // Reinitialize the grid
    this.initializeHexGrid();

    // Restore selection
    if (currentSelection) {
      this.selectHex(currentSelection);
    }
  }
}

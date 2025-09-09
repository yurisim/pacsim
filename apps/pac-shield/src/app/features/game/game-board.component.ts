
import { Component, OnInit, inject, AfterViewInit, ElementRef, ViewChild, OnDestroy, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Map, NavigationControl, Marker } from 'maplibre-gl';
import { AppState } from '../../core/store/app.state';
import * as GameActions from '../../core/store/game/game.actions';
import { selectGame, selectGameError, selectGameLoading } from '../../core/store/game/game.selectors';
import { latLngToCell, cellToBoundary, cellToLatLng, gridDisk } from "h3-js";
import { MOB_LOCATIONS } from '../../shared/config/static-locations.config';
import { ThemeService } from '../../shared/services/theme.service';

// Stub UI components
import {
  ScoreboardComponent,
  AtoTableComponent,
  GameLogComponent,
  MobDashboardComponent,
  FosDashboardComponent,
  CaocDashboardComponent,
  CspocBoardComponent,
  MedcomDashboardComponent,
  GameTokenComponent
} from './stubs/stub-components';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    ScoreboardComponent,
    AtoTableComponent,
    GameLogComponent,
    MobDashboardComponent,
    FosDashboardComponent,
    CaocDashboardComponent,
    CspocBoardComponent,
    MedcomDashboardComponent,
    GameTokenComponent
  ],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss']
})
/**
 * Component Intent: Main game board interface displaying the Pacific theater map with
 * interactive hex grid overlay for asset placement and movement visualization.
 *
 * This component provides:
 * - MapLibre GL map integration with Pacific region focus
 * - H3 hex grid overlay with unique hex identification
 * - Real-time game state visualization from NgRx store
 * - Interactive hex selection and hover effects
 * - Navigation controls and responsive design
 * - Integration with game state management for asset display
 */
export class GameBoardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;
  private store = inject(Store<AppState>);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private map!: Map;
  private mapReady = false;
  private mobMarkersAdded = false;

  // Keep references to event handlers so we can reliably remove/rebind on style changes
  private hexClickHandler?: (e: any) => void;
  private hexMouseEnterHandler?: () => void;
  private hexMouseLeaveHandler?: () => void;

  constructor() {
    // Setup theme change listener in injection context
    effect(() => {
      const isDarkMode = this.themeService.isDarkMode();

      // If map isn't ready yet, do nothing
      if (!this.mapReady || !this.map) {
        return;
      }

      try {
        const darkStyle = './styles/dark-matter.json';
        const lightStyle = './styles/globe.json';
        const newStyle = isDarkMode ? darkStyle : lightStyle;

        // Log and handle style loading errors
        this.map.once('error', (e) => {
          console.error('Map style loading error:', e);
        });

        // Change base style with transformStyle to preserve custom sources and layers
        this.map.setStyle(newStyle, {
          transformStyle: (previousStyle: any, nextStyle: any) => {
            // Preserve our custom sources and layers from previous style
            const preservedSources = ['hex-grid'];
            const preservedLayers = ['hex-grid-fill', 'hex-grid-outline', 'hex-labels', 'hex-grid-selected'];

            const preservedLayerObjects = preservedLayers.map(layerId =>
              previousStyle?.layers?.find((layer: any) => layer.id === layerId)
            ).filter(Boolean);

            return {
              ...nextStyle,
              sources: {
                ...nextStyle.sources,
                // Copy preserved sources from previous style
                ...preservedSources.reduce((acc, sourceId) => {
                  if (previousStyle?.sources?.[sourceId]) {
                    acc[sourceId] = previousStyle.sources[sourceId];
                  }
                  return acc;
                }, {} as any)
              },
              layers: [
                ...nextStyle.layers,
                // Copy preserved layers from previous style
                ...preservedLayerObjects
              ]
            };
          }
        });

        // After the new style loads, just update colors and ensure projection
        this.map.once('style.load', () => {
          console.log('✅ style.load fired for', isDarkMode ? 'dark' : 'light');
          this.map.setProjection({ type: 'globe' });
          this.updateHexGridColors();
          this.map.resize();
        });

        // Alternative approach: Use styledata event which is more reliable
        this.map.once('styledata', () => {
          console.log('✅ styledata fired for', isDarkMode ? 'dark' : 'light');
          if (this.map.getLayer('hex-grid-selected')) {
            this.updateHexGridColors();
          }
        });
      } catch (error) {
        console.error('Error in theme change logic:', error);
      }
    });
  }

  game$ = this.store.select(selectGame);
  isLoading$ = this.store.select(selectGameLoading);
  error$ = this.store.select(selectGameError);
  selectedVisualHexCoord: string | null = null;

  /**
   * Helper method to resolve CSS custom properties to actual color values
   * MapLibre GL requires actual color values, not CSS variables
   */
  private getCSSVariableValue(variableName: string): string {
    // Try to get from body first (where theme classes are applied), then fall back to root
    const bodyStyle = getComputedStyle(document.body);
    const bodyValue = bodyStyle.getPropertyValue(variableName).trim();
    
    if (bodyValue) {
      return bodyValue;
    }
    
    const rootStyle = getComputedStyle(document.documentElement);
    return rootStyle.getPropertyValue(variableName).trim();
  }


  /**
   * Update hex grid colors to match current Material Design theme
   * Called when theme changes to ensure colors stay consistent
   */
  private updateHexGridColors(): void {
    if (!this.map || !this.map.getLayer('hex-grid-fill')) {
      return;
    }

    const outlineVariant = this.getCSSVariableValue('--mat-sys-outline-variant') || '#666666';
    const onSurfaceVariant = this.getCSSVariableValue('--mat-sys-outline') || this.getCSSVariableValue('--mat-sys-on-surface-variant') || '#666666';
    const primary = this.getCSSVariableValue('--mat-sys-primary') || '#0066CC';
    
    console.log('updateHexGridColors - Theme:', this.themeService.isDarkMode() ? 'dark' : 'light');
    console.log('updateHexGridColors - CSS Variables:', { outlineVariant, onSurfaceVariant, primary });

    try {
      // Update hex grid fill colors
      if (this.map.getLayer('hex-grid-fill')) {
        this.map.setPaintProperty('hex-grid-fill', 'fill-color', outlineVariant);
      }

      // Update hex grid outline colors
      if (this.map.getLayer('hex-grid-outline')) {
        this.map.setPaintProperty('hex-grid-outline', 'line-color', outlineVariant);
      }

      // Update hex label colors
      if (this.map.getLayer('hex-labels')) {
        this.map.setPaintProperty('hex-labels', 'text-color', onSurfaceVariant);
      }

      // Update hex selection colors - keep selected hex solid black for visibility
      if (this.map.getLayer('hex-grid-selected')) {
        console.log('Updating hex-grid-selected color to primary:', primary);
        this.map.setPaintProperty('hex-grid-selected', 'line-color', primary);
        this.map.setPaintProperty('hex-grid-selected', 'line-width', 4);
        this.map.setPaintProperty('hex-grid-selected', 'line-opacity', 1);
      }
    } catch (error) {
      console.error('Error updating hex grid colors:', error);
    }
  }

  /**
   * Dictionary Mapping Interface: H3 Internal Indexes ↔ Visual Hex Coordinates
   *
   * This mapping translates between:
   * - Key: H3 Internal Index (cryptic string like "81623ffffffffff")
   * - Value: Visual Hex Coordinate (human-readable like "505", "506A", "607")
   *
   * Example entries:
   * {
   *   "81623ffffffffff": "505",     // Hainan center hex
   *   "81627ffffffffff": "506A",    // Adjacent hex with duplicate resolution
   *   "8162bffffffffff": "607"      // Another hex in the grid
   * }
   */
  private h3IndexToVisualCoordDictionary: Record<string, string> = {};

  // ----- Stub demo data for UI panels (visual-only, no logic yet) -----
  missionPoints = 12;
  demoralizationPoints = 3;
  resourcePoints = 2;
  victoryTarget = 100;
  gameTurn = 1;
  gameDay = 1;
  gamePhase: 'CRISIS' | 'CONFLICT' = 'CRISIS';

  demoAtoLines = [
    { callSign: 'KAD-01', type: 'C-17', origin: 'Kadena', destination: 'FOS 7', intent: 'Cargo', pprStatus: 'Pending' },
    { callSign: 'AND-22', type: 'F-22', origin: 'Andersen', destination: 'Hex 407', intent: 'CAP', pprStatus: 'Approved' }
  ];

  demoLog: string[] = [
    'Game created and players joined',
    'Base access update: Philippines → Overflight Only',
    'ATO line KAD-01 submitted'
  ];

  demoAssets = [
    { id: 'a1', type: 'F-22', strength: 20, location: 'Andersen', status: 'Operational' },
    { id: 'a2', type: 'C-17', range: 4, location: 'Kadena', status: 'Landed' },
    { id: 'a3', type: 'Personnel - Refueling', location: 'FOS 7', status: 'On Task' },
    { id: 'a4', type: 'PLA Threat 12', strength: 12, location: 'Hex 407', status: 'Detected' },
  ];

  /**
   * Lifecycle Method Intent: Initialize component and load game data on component creation.
   *
   * This method handles:
   * - Extracting game ID from route parameters
   * - Dispatching action to load complete game state from backend
   * - Setting up initial component state for game visualization
   * - Error handling for missing or invalid game IDs
   */
  ngOnInit(): void {
    // Get the gameId from the route parameter
    const gameId = this.route.snapshot.paramMap.get('gameId');
    if (gameId) {
      this.store.dispatch(GameActions.loadGameById({ gameId }));
    }
  }

  /**
   * Lifecycle Method Intent: Initialize map and hex grid after view is ready.
   *
   * This method handles:
   * - Ensuring DOM container is available before map initialization
   * - Setting up MapLibre GL map instance
   * - Creating h3-js hex grid overlay
   * - Coordinating initialization sequence with proper timing
   */
  ngAfterViewInit(): void {
    // Initialize map immediately since container is always available
    setTimeout(() => {
      this.initializeMap();
    }, 0);
  }


  /**
   * Lifecycle Method Intent: Clean up resources when component is destroyed.
   *
   * This method handles:
   * - Removing MapLibre GL map instance to prevent memory leaks
   * - Cleaning up event listeners and DOM references
   * - Proper resource disposal for performance optimization
   */
  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }


  /**
   * Method Intent: Initialize the MapLibre GL map instance with Pacific region configuration.
   *
   * This method handles:
   * - Setting up map container and viewport centered on Pacific theater
   * - Configuring OpenStreetMap tile source for base layer
   * - Adding navigation controls for user interaction
   * - Setting up event listeners for map load completion
   * - Configuring initial zoom level for regional overview
   * - Triggering hex grid overlay with H3-to-visual coordinate mapping
   */
  private initializeMap(): void {
    // Center on Hainan Island, China
    const hainanCenter = [109.5, 18.2] as [number, number]; // Longitude, Latitude for Hainan

    // Use different map styles based on theme - styles with country names only
    const darkStyle = './styles/dark-matter.json';
    const lightStyle = './styles/globe.json';
    const isDark = this.themeService.isDarkMode();
    const style = isDark ? darkStyle : lightStyle;

    console.log('Initializing map with theme:', isDark ? 'dark' : 'light', 'style:', style);

    this.map = new Map({
      container: this.mapContainer.nativeElement,
      style: style,
      center: hainanCenter,
      zoom: 2, // Lower zoom for globe view
      attributionControl: false
    });

    // Add navigation controls
    this.map.addControl(new NavigationControl(), 'top-right');

    // Re-apply overlays whenever the base style loads (initial load and theme changes)
    this.map.on('style.load', () => {
      // Set globe projection after style loads
      this.map.setProjection({ type: 'globe' });
      // Add delay to ensure style is completely ready
      setTimeout(() => {
        this.overlayHexGrid();
        if (!this.mobMarkersAdded) {
          this.addMobLocations();
          this.mobMarkersAdded = true;
        }
        this.updateHexGridColors();
        // Ensure map draws correctly if container layout changed due to theme switch
        requestAnimationFrame(() => this.map.resize());
      }, 100);
    });

    // Mark map as ready for theme switching
    this.map.on('load', () => {
      this.mapReady = true;
    });
  }

  /**
   * Method Intent: Create H3 hex grid overlay with dual identifier system.
   *
   * This method generates a hexagonal grid where each hex has two identifiers:
   * 1. H3 Internal Index: Cryptic string used internally by H3-js library (e.g., "81623ffffffffff")
   * 2. Visual Hex Coordinate: Human-readable label displayed to users (e.g., "505", "506A")
   *
   * The mapping between these identifiers is stored in this.h3IndexToVisualCoordDictionary
   * and enables translation between internal game logic and user interface display.
   */
  private overlayHexGrid(): void {
    // Get current theme colors fresh each time
    const primaryRaw = this.getCSSVariableValue('--mat-sys-primary');
    const outlineVariantRaw = this.getCSSVariableValue('--mat-sys-outline-variant');
    const onSurfaceVariantRaw = this.getCSSVariableValue('--mat-sys-on-surface-variant');

    const outlineVariant = outlineVariantRaw || '#666666';
    // Use outline instead of on-surface-variant for better contrast on labels
    const onSurfaceVariant = this.getCSSVariableValue('--mat-sys-outline') || onSurfaceVariantRaw || '#666666';
    const primary = primaryRaw;
    const hexFeatures: any[] = [];
    const hainanLat = 18.2;
    const hainanLng = 109.5;
    const h3Resolution = 1; // H3 resolution, defines the size of the hexes
    const kRingSize = 7; // Radius of hexes around the center

    // Get the central H3 index
    const centerH3Index = latLngToCell(hainanLat, hainanLng, h3Resolution);

    // Get all hexes in a k-ring around the center (these are internal H3 string identifiers)
    const h3InternalIndexes = gridDisk(centerH3Index, kRingSize);

    // Create mapping from H3 internal indexes to visual hex coordinates (505, 506A, etc.)
    this.h3IndexToVisualCoordDictionary = this.generateVisualHexCoordinates(centerH3Index, h3InternalIndexes);

    h3InternalIndexes.forEach((h3InternalIndex: string) => {
      // Get the vertices of the hex
      const boundary = cellToBoundary(h3InternalIndex);
      // H3-js returns [lat, lon], but GeoJSON needs [lon, lat]
      const geoJsonBoundary = boundary.map((coord: number[]) => [coord[1], coord[0]]);

      // Close the polygon
      geoJsonBoundary.push(geoJsonBoundary[0]);

      // Get the center of the hex for labeling
      const [centerLat, centerLng] = cellToLatLng(h3InternalIndex);

      // Get visual coordinate label for this hex (e.g., "505", "506A")
      const visualCoordLabel = this.h3IndexToVisualCoordDictionary[h3InternalIndex] || h3InternalIndex;

      hexFeatures.push({
        type: 'Feature',
        properties: {
          h3InternalIndex: h3InternalIndex, // Internal H3 string identifier
          visualCoordLabel: visualCoordLabel, // Human-readable coordinate (505, 506A, etc.)
          centerLat: centerLat,
          centerLng: centerLng
        },
        geometry: {
          type: 'Polygon',
          coordinates: [geoJsonBoundary]
        }
      });
    });

    // Add hex grid source and layer (check if source already exists)
    if (!this.map.getSource('hex-grid')) {
      this.map.addSource('hex-grid', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: hexFeatures
        }
      });
    } else {
      // Update existing source data
      (this.map.getSource('hex-grid') as any).setData({
        type: 'FeatureCollection',
        features: hexFeatures
      });
    }

    // Add hex grid fill layer (check if layer already exists)
    if (!this.map.getLayer('hex-grid-fill')) {
      this.map.addLayer({
        id: 'hex-grid-fill',
        type: 'fill',
        source: 'hex-grid',
        paint: {
          'fill-color': outlineVariant,
          'fill-opacity': 0.05
        }
      });
    }

    // Add hex grid outline layer (check if layer already exists)
    if (!this.map.getLayer('hex-grid-outline')) {
      this.map.addLayer({
        id: 'hex-grid-outline',
        type: 'line',
        source: 'hex-grid',
        paint: {
          'line-color': outlineVariant,
          'line-width': 1.5,
          'line-opacity': 0.4,
          'line-dasharray': [3, 3]
        }
      });
    }

    // Add hex labels layer using the hex centers for now (check if layer already exists)
    if (!this.map.getLayer('hex-labels')) {
      this.map.addLayer({
        id: 'hex-labels',
        type: 'symbol',
        source: 'hex-grid',
        layout: {
          'text-field': ['get', 'visualCoordLabel'],
        },
        paint: {
          'text-color': onSurfaceVariant,
          'text-opacity': 0.6
        }
      }, 'hex-grid-outline');
    }

    // Add hex grid selected layer (check if layer already exists)
    if (!this.map.getLayer('hex-grid-selected')) {
      this.map.addLayer({
        id: 'hex-grid-selected',
        type: 'line',
        source: 'hex-grid',
        paint: {
          'line-color': '#000000',
          'line-width': 4,
          'line-opacity': 1
        },
        filter: ['==', 'visualCoordLabel', '']
      });
    }


    // Remove previous handlers if they exist (in case of style re-load)
    if (this.hexClickHandler) {
      this.map.off('click', 'hex-grid-fill', this.hexClickHandler);
    }
    if (this.hexMouseEnterHandler) {
      this.map.off('mouseenter', 'hex-grid-fill', this.hexMouseEnterHandler);
    }
    if (this.hexMouseLeaveHandler) {
      this.map.off('mouseleave', 'hex-grid-fill', this.hexMouseLeaveHandler);
    }

    // Add click handler for hexes
    this.hexClickHandler = (e: any) => {
      if (e.features && e.features[0]) {
        const visualCoordLabel = e.features[0].properties?.['visualCoordLabel'];
        this.selectedVisualHexCoord = visualCoordLabel;
        this.map.setFilter('hex-grid-selected', ['==', 'visualCoordLabel', visualCoordLabel]);
      }
    };
    this.map.on('click', 'hex-grid-fill', this.hexClickHandler);

    // Change cursor on hover
    this.hexMouseEnterHandler = () => {
      this.map.getCanvas().style.cursor = 'pointer';
    };
    this.map.on('mouseenter', 'hex-grid-fill', this.hexMouseEnterHandler);

    this.hexMouseLeaveHandler = () => {
      this.map.getCanvas().style.cursor = '';
    };
    this.map.on('mouseleave', 'hex-grid-fill', this.hexMouseLeaveHandler);

    // MOB locations are HTML markers and persist across style changes, add once in style.load
    // (no-op here)
  }

  /**
   * Dictionary Translation Method: Converts H3 internal indexes to visual hex coordinates
   *
   * This method creates a mapping between:
   * - H3 Internal Indexes: Cryptic strings like "81623ffffffffff" (used internally by H3-js library)
   * - Visual Hex Coordinates: Human-readable labels like "505", "506A", "607" (displayed to users)
   *
   * The center hex (Hainan Island) is always assigned visual coordinate "505"
   *
   * @param centerH3InternalIndex - The H3 internal index of Hainan (center hex)
   * @param h3InternalIndexes - All H3 internal indexes in the grid
   * @returns Dictionary mapping H3 internal index → visual coordinate label
   */
  private generateVisualHexCoordinates(centerH3InternalIndex: string, h3InternalIndexes: string[]): Record<string, string> {
    // Dictionary: H3 Internal Index → Visual Coordinate Label
    const h3IndexToVisualCoordDictionary: Record<string, string> = {};

    // Get geographic positions for each H3 internal index
    const h3IndexToGeoPosition: Record<string, { lat: number, lng: number }> = {};
    h3InternalIndexes.forEach(h3InternalIndex => {
      const [lat, lng] = cellToLatLng(h3InternalIndex);
      h3IndexToGeoPosition[h3InternalIndex] = { lat, lng };
    });

    const centerGeoPosition = h3IndexToGeoPosition[centerH3InternalIndex];

    // First pass: Calculate initial visual coordinates for all H3 internal indexes
    const initialVisualCoords: Record<string, string> = {};
    h3InternalIndexes.forEach(h3InternalIndex => {
      const geoPos = h3IndexToGeoPosition[h3InternalIndex];

      if (h3InternalIndex === centerH3InternalIndex) {
        // Center hex (Hainan) is always visual coordinate 505
        initialVisualCoords[h3InternalIndex] = '505';
        return;
      }

      // Calculate distance and bearing from center
      const deltaLat = geoPos.lat - centerGeoPosition.lat;
      const deltaLng = geoPos.lng - centerGeoPosition.lng;

      // Simple grid approximation - adjust these factors based on actual H3 spacing
      const latStep = 7.5; // Approximate degrees per hex row at this resolution
      const lngStep = 13.0; // Approximate degrees per hex column at this resolution

      const rowOffset = Math.round(deltaLat / latStep);
      const colOffset = Math.round(deltaLng / lngStep);

      // Convert to coordinate system: Hainan is 505 (row 5, col 5)
      const row = 5 - rowOffset; // North is negative row offset
      const col = 5 + colOffset; // East is positive col offset

      // Clamp to reasonable bounds and format
      const clampedRow = Math.max(0, Math.min(9, row));
      const clampedCol = Math.max(0, Math.min(99, col));

      const visualCoordLabel = `${clampedRow}${clampedCol.toString().padStart(2, '0')}`;
      initialVisualCoords[h3InternalIndex] = visualCoordLabel;
    });

    // Second pass: Group H3 internal indexes by visual coordinates to identify duplicates
    const visualCoordGroups: Record<string, string[]> = {};
    Object.entries(initialVisualCoords).forEach(([h3InternalIndex, visualCoordLabel]) => {
      if (!visualCoordGroups[visualCoordLabel]) {
        visualCoordGroups[visualCoordLabel] = [];
      }
      visualCoordGroups[visualCoordLabel].push(h3InternalIndex);
    });

    // Third pass: Assign final visual coordinates with alphabetical suffixes for duplicates
    Object.entries(visualCoordGroups).forEach(([visualCoordLabel, h3InternalIndexGroup]) => {
      if (h3InternalIndexGroup.length === 1) {
        // No duplicates, use original visual coordinate
        h3IndexToVisualCoordDictionary[h3InternalIndexGroup[0]] = visualCoordLabel;
      } else {
        // Handle duplicates by appending alphabetical suffixes (e.g., 505A, 505B)
        h3InternalIndexGroup.forEach((h3InternalIndex, index) => {
          const suffix = String.fromCharCode(65 + index); // A, B, C, etc.
          h3IndexToVisualCoordDictionary[h3InternalIndex] = `${visualCoordLabel}${suffix}`;
        });
      }
    });

    return h3IndexToVisualCoordDictionary;
  }

  /**
   * Method Intent: Add MOB locations to the map with SVG home icons.
   *
   * This method handles:
   * - Creating GeoJSON data source from MOB_LOCATIONS config
   * - Adding SVG home icon to map images
   * - Adding symbol layer with home icon
   * - Styling icons with proper theming and visibility
   * - Enabling hover effects for MOB location markers
   */
  private addMobLocations(): void {
    // Directly render MOB symbols with Material Design icons
    this.renderMobSymbols();
  }

  /**
   * Method Intent: Render MOB location symbols using custom HTML markers with Material Design icons.
   */
  private renderMobSymbols(): void {
    // Create custom HTML markers for each MOB location
    Object.values(MOB_LOCATIONS).forEach(mob => {
      // Create marker container
      const markerElement = document.createElement('div');
      markerElement.style.textAlign = 'center';
      markerElement.style.cursor = 'pointer';
      markerElement.className = 'mob-marker';

      // Create Material icon element using Google Material Icons font
      const iconElement = document.createElement('span');
      iconElement.className = 'material-icons';
      iconElement.textContent = 'home';
      iconElement.style.fontSize = '26px';
      iconElement.style.color = 'var(--mat-sys-primary)';

      // Create label element
      const labelElement = document.createElement('div');
      labelElement.textContent = mob.name;
      labelElement.style.fontSize = '16px';
      labelElement.style.color = 'var(--mat-sys-primary)';
      labelElement.style.marginTop = '2px';

      // Append elements
      markerElement.appendChild(iconElement);
      markerElement.appendChild(labelElement);

      // Create and add marker to map
      new Marker({ element: markerElement })
        .setLngLat(mob.coordinates)
        .addTo(this.map);
    });
  }

}

import { Component, OnInit, inject, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Map, NavigationControl } from 'maplibre-gl';
import { AppState } from '../../core/store/app.state';
import * as GameActions from '../../core/store/game/game.actions';
import { selectGame, selectGameError, selectGameLoading } from '../../core/store/game/game.selectors';
import { latLngToCell, cellToBoundary, cellToLatLng, gridDisk } from "h3-js";

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
  private map!: Map;

  game$ = this.store.select(selectGame);
  isLoading$ = this.store.select(selectGameLoading);
  error$ = this.store.select(selectGameError);
  selectedVisualHexCoord: string | null = null;

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
   * Method Intent: Navigate user back to the game lobby.
   *
   * This method handles:
   * - Extracting current game ID from route parameters
   * - Constructing navigation path to lobby with game context
   * - Error handling for missing game ID
   * - Maintaining game session continuity during navigation
   */
  navigateToLobby(): void {
    const gameId = this.route.snapshot.paramMap.get('gameId');
    if (gameId) {
      this.router.navigate(['/lobby', gameId]);
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

    // Use MapLibre demo style with built-in fonts and sprites
    const style = 'https://demotiles.maplibre.org/style.json';

    this.map = new Map({
      container: this.mapContainer.nativeElement,
      style: style,
      center: hainanCenter,
      zoom: 2, // Lower zoom for globe view
      attributionControl: false
    });

    // Add navigation controls
    this.map.addControl(new NavigationControl(), 'top-right');

    // FIXED: Added delay to ensure style is completely ready
    this.map.on('style.load', () => {
      // Set globe projection after style loads
      this.map.setProjection({ type: 'globe' });
      // Add delay to ensure style is completely ready
      setTimeout(() => {
        this.overlayHexGrid();
      }, 100);
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

    // Add hex grid source and layer
    this.map.addSource('hex-grid', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: hexFeatures
      }
    });

    // Add hex grid fill layer
    this.map.addLayer({
      id: 'hex-grid-fill',
      type: 'fill',
      source: 'hex-grid',
      paint: {
        'fill-color': '#000000',
        'fill-opacity': 0.05
      }
    });

    // Add hex grid outline layer
    this.map.addLayer({
      id: 'hex-grid-outline',
      type: 'line',
      source: 'hex-grid',
      paint: {
        'line-color': '#000000',
        'line-width': 2,
        'line-opacity': 0.10
      }
    });


    // Add hex labels layer using the hex centers for now (we can adjust positioning later)
    this.map.addLayer({
      id: 'hex-labels',
      type: 'symbol',
      source: 'hex-grid',
      layout: {
        'text-field': ['get', 'visualCoordLabel'],
      },
      paint: {
        'text-color': '#000000',
        'text-opacity': 0.4
      }
    }, 'hex-grid-outline');


    // Add click handler for hexes
    this.map.on('click', 'hex-grid-fill', (e) => {
      if (e.features && e.features[0]) {
        const hexId = e.features[0].properties?.['hexId'];
        const coordLabel = e.features[0].properties?.['coordLabel'];
        console.log(`Clicked hex: ${hexId}, Coordinate: ${coordLabel}`);
        this.selectedHexCoordinate = coordLabel;
      }
    });

    // Change cursor on hover
    this.map.on('mouseenter', 'hex-grid-fill', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'hex-grid-fill', () => {
      this.map.getCanvas().style.cursor = '';
    });
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

}

import { Component, OnInit, inject, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Map, NavigationControl } from 'maplibre-gl';
import { AppState } from '../../core/store/app.state';
import * as GameActions from '../../core/store/game/game.actions';
import { selectGame, selectGameError, selectGameLoading } from '../../core/store/game/game.selectors';
import { latLngToCell, cellToBoundary, cellToLatLng, gridDisk } from "h3-js";
import { ThemeService } from '../../shared/services/theme.service';
import { effect } from '@angular/core';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatButtonModule, MatIconModule],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss']
})
/**
 * Component Intent: Main game board interface displaying the Pacific theater map with
 * interactive hex grid overlay for asset placement and movement visualization.
 *
 * This component provides:
 * - MapLibre GL map integration with Pacific region focus
 * - Honeycomb hex grid overlay with unique hex identification
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

  game$ = this.store.select(selectGame);
  isLoading$ = this.store.select(selectGameLoading);
  error$ = this.store.select(selectGameError);
  selectedHexCoordinate: string | null = null;

  constructor() {
    // React to theme changes and update hex colors
    effect(() => {
      // This will run whenever the theme changes
      this.themeService.isDarkMode();

      // Update hex colors if map is initialized AND fully loaded
      // FIXED: Added loaded() check and improved timing
      if (this.map && this.map.loaded() && this.map.getSource('hex-grid')) {
        setTimeout(() => this.updateHexColors(), 0);
      }
    });
  }

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
   * - Creating honeycomb hex grid overlay
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

  private overlayHexGrid(): void {
    const hexFeatures: any[] = [];
    const hainanLat = 18.2;
    const hainanLng = 109.5;
    const h3Resolution = 1; // H3 resolution, defines the size of the hexes
    const kRingSize = 7; // Radius of hexes around the center

    // Get the central H3 index
    const centerH3Index = latLngToCell(hainanLat, hainanLng, h3Resolution);

    // Get all hexes in a k-ring around the center
    const h3Indices = gridDisk(centerH3Index, kRingSize);

    // Create coordinate mapping with Hainan as 505
    const hexCoordinates = this.generateHexCoordinates(centerH3Index, h3Indices);

    h3Indices.forEach((h3Index: string) => {
      // Get the vertices of the hex
      const boundary = cellToBoundary(h3Index);
      // H3-js returns [lat, lon], but GeoJSON needs [lon, lat]
      const geoJsonBoundary = boundary.map((coord: number[]) => [coord[1], coord[0]]);

      // Close the polygon
      geoJsonBoundary.push(geoJsonBoundary[0]);

      // Get the center of the hex for labeling
      const [centerLat, centerLng] = cellToLatLng(h3Index);

      // Get coordinate label for this hex
      const coordLabel = hexCoordinates[h3Index] || h3Index;

      hexFeatures.push({
        type: 'Feature',
        properties: {
          hexId: h3Index, // Use H3 index as the unique ID
          coordLabel: coordLabel, // Custom coordinate label
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
        'fill-color': '#000000', // Will be updated by updateHexColors
        'fill-opacity': 0.4
      }
    });

    // Add hex grid outline layer
    this.map.addLayer({
      id: 'hex-grid-outline',
      type: 'line',
      source: 'hex-grid',
      paint: {
        'line-color': '#000000', // Will be updated by updateHexColors
        'line-width': 2,
        'line-opacity': 0.8
      }
    });

    // Set initial colors
    this.updateHexColors();

    // Add hex labels layer using the hex centers for now (we can adjust positioning later)
    this.map.addLayer({
      id: 'hex-labels',
      type: 'symbol',
      source: 'hex-grid', // Use the same source as hex grid
      layout: {
        'text-field': ['get', 'coordLabel'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 14,
        'text-anchor': 'center'
      },
      paint: {
        'text-color': '#000000',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 0.5
      }
    }, 'top');

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
   * Generate coordinate labels for hexes with Hainan as 505
   * @param centerH3Index - The H3 index of Hainan (center hex)
   * @param h3Indices - All H3 indices in the grid
   * @returns Map of H3 index to coordinate label
   */
  private generateHexCoordinates(centerH3Index: string, h3Indices: string[]): Record<string, string> {
    const coordinates: Record<string, string> = {};

    // Get center coordinates for each hex
    const hexPositions: Record<string, { lat: number, lng: number }> = {};
    h3Indices.forEach(h3Index => {
      const [lat, lng] = cellToLatLng(h3Index);
      hexPositions[h3Index] = { lat, lng };
    });

    const centerPos = hexPositions[centerH3Index];

    // Calculate proper hex grid coordinates
    h3Indices.forEach(h3Index => {
      const pos = hexPositions[h3Index];

      if (h3Index === centerH3Index) {
        // Center hex is always 505
        coordinates[h3Index] = '505';
        return;
      }

      // Calculate distance and bearing from center
      const deltaLat = pos.lat - centerPos.lat;
      const deltaLng = pos.lng - centerPos.lng;

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

      const coordLabel = `${clampedRow}${clampedCol.toString().padStart(2, '0')}`;
      coordinates[h3Index] = coordLabel;
    });

    return coordinates;
  }

  /**
   * Update hex grid colors based on current theme
   */
  private updateHexColors(): void {
    if (!this.map) return;

    // Get current Material primary color from CSS variables
    // Read from document.body since that's where the light-mode class is applied
    const primaryColor = getComputedStyle(document.body)
      .getPropertyValue('--mat-sys-primary').trim();

    // Update hex grid fill color
    if (this.map.getLayer('hex-grid-fill')) {
      this.map.setPaintProperty('hex-grid-fill', 'fill-color', primaryColor + '33'); // 20% opacity
    }

    // Update hex grid outline color
    if (this.map.getLayer('hex-grid-outline')) {
      this.map.setPaintProperty('hex-grid-outline', 'line-color', primaryColor);
    }
  }

}

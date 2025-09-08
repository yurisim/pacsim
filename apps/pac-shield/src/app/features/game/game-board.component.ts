import { Component, OnInit, inject, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Map, NavigationControl, StyleSpecification } from 'maplibre-gl';
import { defineHex, Grid, rectangle, Orientation } from 'honeycomb-grid';
import { AppState } from '../../core/store/app.state';
import * as GameActions from '../../core/store/game/game.actions';
import { selectGame, selectGameError, selectGameLoading } from '../../core/store/game/game.selectors';

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
  private map!: Map;
  private hexGrid!: Grid<any>;

  game$ = this.store.select(selectGame);
  isLoading$ = this.store.select(selectGameLoading);
  error$ = this.store.select(selectGameError);

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
      this.createHexGrid();
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

    // Simple style for the map
    const style: StyleSpecification = {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osm-tiles'
        }
      ]
    };

    this.map = new Map({
      container: this.mapContainer.nativeElement,
      style: style,
      center: hainanCenter,
      zoom: 2, // Lower zoom for globe view
      attributionControl: false
    });

    // Add navigation controls
    this.map.addControl(new NavigationControl(), 'top-right');

    this.map.on('style.load', () => {
      // Set globe projection after style loads
      this.map.setProjection({ type: 'globe' });
      this.overlayHexGrid();
    });
  }

  private createHexGrid(): void {
    // Create hex grid with 550-mile hexes (885 km)
    // Hex numbering: Row increases going south (1-9), column increases going east (01-99)
    // Center hex 505 is at Hainan

    // 550 miles = ~885 km
    // For pointy-top hexes, we need to calculate the proper dimensions
    const hexWidthKm = 885; // 550 miles in km
    const hexRadiusKm = hexWidthKm / Math.sqrt(3); // ~511 km
    const hexRadiusMeters = hexRadiusKm * 1000;

    const Hex = defineHex({
      dimensions: {
        xRadius: hexRadiusMeters,
        yRadius: hexRadiusMeters
      },
      orientation: Orientation.POINTY, // Pointy-top hexes
      origin: { x: 0, y: 0 }, // Center origin
      offset: 1 // Even rows are offset right
    });

    // Create grid with 7 hex radius from center, centered around (0,0)
    // This creates a 15x15 grid from (-7,-7) to (7,7)
    this.hexGrid = new Grid(Hex, rectangle({ width: 15, height: 15, start: { col: -7, row: -7 } }));
  }

  private overlayHexGrid(): void {
    const hexFeatures: any[] = [];
    const hainanLat = 18.2;
    const hainanLng = 109.5;
    const maxDistanceKm = 550 * 7 * 1.60934; // 7 hex radius in km

    // Calculate hex dimensions for label positioning
    const hexWidthKm = 885; // 550 miles in km
    const hexRadiusKm = hexWidthKm / Math.sqrt(3); // ~511 km
    const hexRadiusMeters = hexRadiusKm * 1000;

    // For globe projection, we still use Honeycomb Grid but with simpler coordinate conversion
    // The key is to generate the hexes in a flat coordinate system first, then project to globe
    this.hexGrid.forEach(hex => {
      // Get the offset coordinates from the hex
      const gridCol = hex.col;
      const gridRow = hex.row;

      // Map to game numbering system
      // Center hex at grid (0,0) should be 505
      const gameCol = 5 + gridCol; // Column 05 at center, increases eastward
      const gameRow = 5 + gridRow; // Row 5 at center, increases southward

      // Allow wider range for hexes - extend beyond just 1-9 and 01-10
      // Skip hexes that would be completely outside reasonable game area
      if (gameRow < -2 || gameRow > 12 || gameCol < -2 || gameCol > 12) {
        return;
      }

      // Generate hex ID - handle negative coordinates gracefully
      const hexId = `${gameRow >= 0 ? gameRow : 'N' + Math.abs(gameRow)}${gameCol >= 0 ? gameCol.toString().padStart(2, '0') : 'N' + Math.abs(gameCol).toString().padStart(2, '0')}`;

      // Get hex center in grid coordinates
      const hexCenter = hex.center;

      // For globe projection, convert grid coordinates to geographic coordinates
      // Use a simpler approach that works better with globe projection
      const metersPerDegreeLat = 111000;
      const metersPerDegreeLng = 111000; // Globe projection handles longitude scaling

      // Calculate geographic coordinates from hex center
      const centerLat = hainanLat + (hexCenter.y / metersPerDegreeLat);
      const centerLng = hainanLng + (hexCenter.x / metersPerDegreeLng);

      // Check if hex is within max distance
      const distance = this.calculateDistance(hainanLat, hainanLng, centerLat, centerLng);
      if (distance > maxDistanceKm) {
        return;
      }

      // Convert hex corners to geographic coordinates using the same simple conversion
      const corners = hex.corners.map((corner: any) => {
        const cornerLat = hainanLat + (corner.y / metersPerDegreeLat);
        const cornerLng = hainanLng + (corner.x / metersPerDegreeLng);
        return [cornerLng, cornerLat];
      });

      // Close the polygon by adding the first corner at the end
      corners.push(corners[0]);

      hexFeatures.push({
        type: 'Feature',
        properties: {
          hexId: hexId,
          row: gameRow,
          col: gameCol,
          centerLat: centerLat,
          centerLng: centerLng,
          labelLat: centerLat,
          labelLng: centerLng
        },
        geometry: {
          type: 'Polygon',
          coordinates: [corners]
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

    // Add hex grid fill layer with semi-transparent blue
    this.map.addLayer({
      id: 'hex-grid-fill',
      type: 'fill',
      source: 'hex-grid',
      paint: {
        'fill-color': [
          'case',
          ['<', ['get', 'row'], 4], 'rgba(139, 69, 19, 0.2)', // Brown for land hexes (rows 1-3)
          ['>', ['get', 'row'], 6], 'rgba(0, 100, 200, 0.2)', // Deep blue for ocean (rows 7-9)
          'rgba(0, 150, 255, 0.2)' // Light blue for coastal areas (rows 4-6)
        ],
        'fill-opacity': 0.4
      }
    });

    // Add hex grid outline layer
    this.map.addLayer({
      id: 'hex-grid-outline',
      type: 'line',
      source: 'hex-grid',
      paint: {
        'line-color': '#0066cc',
        'line-width': 2,
        'line-opacity': 0.8
      }
    });

    // Add hex labels layer using the hex centers for now (we can adjust positioning later)
    this.map.addLayer({
      id: 'hex-labels',
      type: 'symbol',
      source: 'hex-grid', // Use the same source as hex grid
      layout: {
        'text-field': ['get', 'hexId'], // Get hexId from properties
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
    });

    // Add click handler for hexes
    this.map.on('click', 'hex-grid-fill', (e) => {
      if (e.features && e.features[0]) {
        const hexId = e.features[0].properties?.['hexId'];
        console.log(`Clicked hex: ${hexId}`);
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
   * Calculate distance between two points on Earth using Haversine formula
   * @param lat1 Latitude of first point
   * @param lng1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lng2 Longitude of second point
   * @returns Distance in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

import { Component, OnInit, inject, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Map, NavigationControl, StyleSpecification } from 'maplibre-gl';
import { defineHex, Grid, rectangle } from 'honeycomb-grid';
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
    // Pacific region centered roughly on Kyushu, Japan
    const pacificCenter = [131.0, 33.0] as [number, number]; // Longitude, Latitude for Kyushu

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
      center: pacificCenter,
      zoom: 4, // Show Pacific region
      attributionControl: false
    });

    // Add navigation controls
    this.map.addControl(new NavigationControl(), 'top-right');

    this.map.on('load', () => {
      this.overlayHexGrid();
    });
  }

  private createHexGrid(): void {
    // Create hex grid with Kyushu-sized hexes
    // Kyushu is approximately 300km wide, so each hex should be ~200km radius
    const Hex = defineHex({
      dimensions: {
        xRadius: 200000, // 200km in meters for map projection
        yRadius: 200000
      }
    });

    // Create a rectangular grid covering the Pacific region
    // Grid coordinates: row 2 = 200s, row 3 = 300s, etc.
    // Grid coordinates: col 9 = x09, col 10 = x10, etc.
    this.hexGrid = new Grid(Hex, rectangle({ width: 20, height: 15 }));
  }

  private overlayHexGrid(): void {
    const hexFeatures: any[] = [];

    // Convert honeycomb grid to GeoJSON features
    this.hexGrid.forEach(hex => {
      // Convert grid coordinates to hex ID format (e.g., 309, 310, 209)
      const row = Math.floor(hex.row) + 2; // Start from row 2 (200s)
      const col = Math.floor(hex.col) + 9; // Start from col 9 (x09)
      const hexId = `${row}${col.toString().padStart(2, '0')}`;

      // Convert hex corners to geographic coordinates
      // This is a simplified conversion - in production you'd use proper projection
      const corners = hex.corners.map((corner: any) => {
        const lng = 131.0 + (corner.x / 111320); // Rough conversion meters to degrees
        const lat = 33.0 + (corner.y / 110540);
        return [lng, lat];
      });

      hexFeatures.push({
        type: 'Feature',
        properties: {
          hexId: hexId,
          row: row,
          col: col
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

    // Add hex grid fill layer
    this.map.addLayer({
      id: 'hex-grid-fill',
      type: 'fill',
      source: 'hex-grid',
      paint: {
        'fill-color': 'rgba(100, 150, 255, 0.1)',
        'fill-opacity': 0.3
      }
    });

    // Add hex grid outline layer
    this.map.addLayer({
      id: 'hex-grid-outline',
      type: 'line',
      source: 'hex-grid',
      paint: {
        'line-color': '#1976d2',
        'line-width': 1.5,
        'line-opacity': 0.8
      }
    });

    // Add hex labels
    this.map.addLayer({
      id: 'hex-labels',
      type: 'symbol',
      source: 'hex-grid',
      layout: {
        'text-field': '{hexId}',
        'text-font': ['Open Sans Regular'],
        'text-size': 12,
        'text-anchor': 'center'
      },
      paint: {
        'text-color': '#1976d2',
        'text-halo-color': 'white',
        'text-halo-width': 1
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
}

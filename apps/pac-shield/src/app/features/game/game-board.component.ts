import { Component, OnInit, inject, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Map, NavigationControl, StyleSpecification } from 'maplibre-gl';
import { AppState } from '../../core/store/app.state';
import * as GameActions from '../../core/store/game/game.actions';
import { selectGame, selectGameError, selectGameLoading } from '../../core/store/game/game.selectors';
import { latLngToCell, cellToBoundary, cellToLatLng, gridDisk } from "h3-js";


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


  private overlayHexGrid(): void {
    const hexFeatures: any[] = [];
    const hainanLat = 18.2;
    const hainanLng = 109.5;
    const h3Resolution = 2; // H3 resolution, defines the size of the hexes
    const kRingSize = 7; // Radius of hexes around the center

    // Get the central H3 index
    const centerH3Index = latLngToCell(hainanLat, hainanLng, h3Resolution);

    // Get all hexes in a k-ring around the center
    const h3Indices = gridDisk(centerH3Index, kRingSize);

    h3Indices.forEach((h3Index: string) => {
      // Get the vertices of the hex
      const boundary = cellToBoundary(h3Index);
      // H3-js returns [lat, lon], but GeoJSON needs [lon, lat]
      const geoJsonBoundary = boundary.map((coord: number[]) => [coord[1], coord[0]]);

      // Close the polygon
      geoJsonBoundary.push(geoJsonBoundary[0]);

      // Get the center of the hex for labeling
      const [centerLat, centerLng] = cellToLatLng(h3Index);

      hexFeatures.push({
        type: 'Feature',
        properties: {
          hexId: h3Index, // Use H3 index as the unique ID
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

    // Add hex grid fill layer with semi-transparent blue
    this.map.addLayer({
      id: 'hex-grid-fill',
      type: 'fill',
      source: 'hex-grid',
      paint: {
        'fill-color': 'rgba(0, 150, 255, 0.2)',
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
        'text-field': ['get', 'hexId'],
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

}


import { Component, OnInit, inject, AfterViewInit, ElementRef, ViewChild, OnDestroy, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map, take } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Map } from 'maplibre-gl';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import { AppState } from '../../core/store/app.state';
import * as GameActions from '../../core/store/game/game.actions';
import { selectGame, selectGameError, selectGameLoading } from '../../core/store/game/game.selectors';
import { latLngToCell, cellToBoundary, cellToLatLng, gridDisk } from 'h3-js'; // Still needed for old overlayHexGrid method
import { ThemeService } from '../../shared/services/theme.service';
import { AuthService } from '../../shared/services/auth.service';
import { HexGridComponent, HexSelectionEvent } from './hex-grid.component';
import { MOB_LOCATIONS, FOS_LOCATIONS } from '../../shared/config/static-locations.config';
import { LocationMarkersComponent } from './location-markers/location-markers.component';
import { GameStatsComponent } from './game-stats/game-stats.component';
import { GameStatsService } from './game-stats/game-stats.service';
import { LocationPanelComponent } from './location-panel/location-panel.component';
import { FosStateService } from '../../shared/services/fos-state.service';
import { FosService } from './services/fos.service';
import { WebSocketService } from '../../shared/services/websocket.service';
import { PlayerRoleService } from '../../shared/services/player-role.service';
import { CountryAccessToggleComponent } from './country-access-toggle/country-access-toggle.component';
import { CountryOverlayService } from './services/country-overlay.service';
import { CountryAccessDiceRollDialogComponent } from './country-access-dice-roll-dialog/country-access-dice-roll-dialog.component';
import { CountryAccessHttpService } from '../../shared/services/country-access-http.service';
import { FosDeactivationDialogComponent, FosDeactivationDialogData, FosDeactivationDialogResult } from './location-panel/fos-deactivation-dialog.component';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    HexGridComponent,
    LocationMarkersComponent,
    GameStatsComponent,
    LocationPanelComponent,
    CountryAccessToggleComponent
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
  /**
   * Reference to the div container that hosts the MapLibre GL map instance.
   * Marked static so it's available during ngAfterViewInit.
   */
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  /**
   * Child component responsible for creating and managing the H3 hex grid overlay.
   * Provides events for hex selection and utilities for color updates on theme change.
   */
  @ViewChild(HexGridComponent) hexGrid!: HexGridComponent;

  /**
   * Child component that renders HTML-based markers for MOBs and FOS locations.
   * Handles its own lifecycle and theme reactions.
   */
  @ViewChild(LocationMarkersComponent) locationMarkers!: LocationMarkersComponent;

  /**
   * Child component that displays aggregated game statistics (scoreboard, logs, etc).
   * Accessed for coordination with the main map when necessary.
   */
  @ViewChild(GameStatsComponent) gameStatsComponent!: GameStatsComponent;

  /**
   * Child component that toggles the country access overlay.
   * Accessed to sync its state with the overlay service.
   */
  @ViewChild(CountryAccessToggleComponent) countryAccessToggle!: CountryAccessToggleComponent;


  private store = inject(Store<AppState>);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  gameStatsService = inject(GameStatsService);  // Made public for template access
  fosStateService = inject(FosStateService);  // Made public for template access
  private webSocketService = inject(WebSocketService);
  private playerRoleService = inject(PlayerRoleService);
  private countryOverlayService = inject(CountryOverlayService);
  private countryAccessHttp = inject(CountryAccessHttpService);
  private dialog = inject(MatDialog);
  private fosService = inject(FosService);
  private snackBar = inject(MatSnackBar);
  private breakpointObserver = inject(BreakpointObserver);
  /**
   * MapLibre GL map instance once initialized.
   * Exposed for template-bound components that require a direct Map reference.
   */
  map!: Map;

  /**
   * Indicates the base map style and resources have completed initial load,
   * allowing safe style switching and overlay operations.
   */
  private mapReady = false;

  /**
   * Guards against duplicate hex grid creation across style reloads.
   */
  private hexGridCreated = false;

  // Keep references to event handlers so we can reliably remove/rebind on style changes
  private hexClickHandler?: (e: MapLayerMouseEvent) => void;
  private hexMouseEnterHandler?: () => void;
  private hexMouseLeaveHandler?: () => void;


  /**
   * Creates the component and wires reactive theme change handling.
   *
   * Uses Angular's effect() to react to ThemeService changes and call a safe
   * map style switch routine that preserves custom layers/sources.
   * All services are acquired via Angular's inject() API rather than constructor params.
   */
  constructor() {
    // Setup theme change listener in injection context
    effect(() => {
      const isDarkMode = this.themeService.isDarkMode();
      this.handleThemeChange(isDarkMode);
    });
  }

  /**
   * Stream of the current game state as stored in NgRx.
   */
  game$ = this.store.select(selectGame);

  /**
   * Stream indicating whether the game state is currently being loaded.
   */
  isLoading$ = this.store.select(selectGameLoading);

  /**
   * Stream of any error encountered while loading or mutating the game state.
   */
  error$ = this.store.select(selectGameError);

  // Computed properties from game data

  /**
   * Stream of the current game ID or null when not available.
   */
  gameId$ = this.game$.pipe(map(game => game?.id || null));

  /**
   * Stream of the current turn number (defaults to 1 when undefined).
   */
  currentTurn$ = this.game$.pipe(map(game => game?.turn || 1));

  /**
   * Stream of available teams for the game (empty array when undefined).
   */
  availableTeams$ = this.game$.pipe(map(game => game?.teams || []));

  /**
   * Human-readable visual coordinate of the last selected hex (e.g., "505", "506A").
   * Null when no hex is selected.
   */
  selectedVisualHexCoord: string | null = null;
  /**
   * H3 internal index of the last selected hex (e.g., "81623ffffffffff").
   * Null when no hex is selected.
   */
  selectedH3Index: string | null = null;


  /**
   * Cached numeric game identifier extracted from the route.
   * Used for API calls where an immediate primitive is required.
   */
  private currentGameId: number | null = null;

  // FOS activation tracking (deprecated - now handled by FosStateService)
  /**
   * Set of currently active Forward Operating Sites (FOS) identifiers.
   * Presence indicates the site is active and should be rendered as such.
   */
  activeFosIds = new Set<string>();
  /**
   * Mapping of FOS ID to assigned MOB ID (e.g., 'kadena').
   * Used for ownership display and logging.
   */
  fosMobAssignments: Record<string, string> = {}; // Maps FOS ID to MOB ID (e.g., 'kadena')

  // Current player information from auth service and game state
  /**
   * Snapshot of the authenticated player from AuthService.
   * Used for ownership/permission checks where an immediate value is needed.
   */
  currentPlayer = this.authService.getPlayer();
  /**
   * Stream of the current user's team type (e.g., 'GM', 'MOB') resolved from game and auth state.
   * Emits null when the user is not associated with a team.
   */
  currentUserTeam$ = this.game$.pipe(
    map(game => {
      const authPlayer = this.authService.getPlayer();
      if (!authPlayer?.id || !game?.players) return null;

      // Find the player in the game's player list
      const gamePlayer = game.players.find(p => p.sessionId === authPlayer.sessionId);
      if (!gamePlayer?.teamId || !game?.teams) return null;

      // Find the team by teamId
      const team = game.teams.find(t => t.id === gamePlayer.teamId);
      return team?.type || null;
    })
  );
  // Use centralized role service instead of local derivation
  /**
   * Stream of the current user's role, provided by PlayerRoleService.
   */
  currentUserRole$ = this.playerRoleService.currentRole$;

  // Legacy properties for compatibility
  /**
   * Demo-only default: MOB controlled by the current player.
   * TODO: Replace with real state once MOB ownership is derived from the backend.
   */
  currentPlayerMob = 'kadena'; // Demo: current player controls Kadena MOB

  // Use centralized role service for derived properties
  /**
   * Emits true when the authenticated user has the Game Master role.
   */
  isGameMaster$ = this.playerRoleService.isGameMaster$;
  /**
   * Emits true when the authenticated user has the MOB Commander role.
   */
  isMobCommander$ = this.playerRoleService.isMobCommander$;

  // For backward compatibility - will be replaced with observables in template
  /**
   * Legacy imperative flag for Game Master checks.
   * Prefer using isGameMaster$; this property will be removed once templates are fully reactive.
   */
  isGameMaster = false;

  // Panel state management
  /**
   * Controls whether the location panel is minimized, narrow, or full.
   * Auto-minimizes when game stats panel goes full to prevent overlap.
   */
  locationPanelState: 'minimized' | 'narrow' | 'full' = 'minimized';

  /**
   * Controls whether the game stats panel is minimized, narrow, or full.
   * Auto-minimizes when location panel goes full to prevent overlap.
   */
  gameStatsPanelState: 'minimized' | 'narrow' | 'full' = 'narrow';

  /**
   * Which subview of the location panel should be opened initially (when deep-linked).
   * - 'none' leaves the default view
   * - 'rfi' jumps to the Requests For Information view
   * - 'tasks' jumps to the FOS tasks view
   */
  initialSubview: 'none' | 'rfi' | 'tasks' = 'none';

  // Game statistics from service (reactive signals)
  /**
   * Reactive signal of aggregated game statistics (turn/day/phase, points, etc.).
   */
  gameStats = this.gameStatsService.gameStats;
  /**
   * Reactive signal of current ATO (Air Tasking Order) lines visible to the user.
   */
  atoLines = this.gameStatsService.atoLines;
  /**
   * Reactive signal of assets (aircraft, personnel, equipment) with their current state.
   */
  gameAssets = this.gameStatsService.gameAssets;
  /**
   * Reactive signal of recent, formatted game log entries for display.
   */
  gameLog = this.gameStatsService.gameLog;
  /**
   * Computed total score (mission, demoralization, resource points) for convenient binding.
   */
  totalScore = this.gameStatsService.totalScore;
  /**
   * Human-readable label for the current turn (e.g., "Day 2 • Turn 3").
   */
  currentTurnLabel = this.gameStatsService.currentTurnLabel;

  // Hex grid configuration
  /**
   * Configuration for the H3-based hex grid overlay used on the Game Board.
   * - centerLat/centerLng: Geographic anchor of the grid (Hainan Island)
   * - h3Resolution: H3 resolution controlling hex size
   * - kRingSize: Radius (in hexes) to render around the center
   */
  hexGridConfig = {
    centerLat: 18.2,  // Hainan Island
    centerLng: 109.5,
    h3Resolution: 1,
    kRingSize: 7
  };

  /**
   * Handle theme changes - extracted from constructor for better organization
   *
   * WHY NEEDED: Angular's effect() fires immediately, but map may not be ready yet.
   * This guard prevents errors during component initialization.
   */
  private handleThemeChange(isDarkMode: boolean): void {
    // If map isn't ready yet, do nothing
    if (!this.mapReady || !this.map) {
      return;
    }

    try {
      this.switchMapStyle(isDarkMode);
    } catch (error) {
      console.error('Error in theme change logic:', error);
    }
  }

  /**
   * Switch map style with complex preservation logic
   *
   * WHY COMPLEX: MapLibre destroys ALL custom layers/sources when switching styles.
   * Simple setStyle() call would make hex grid disappear permanently.
   * The transformStyle approach is the ONLY way to preserve custom layers across style changes.
   */
  private switchMapStyle(isDarkMode: boolean): void {
    const darkStyle = './styles/dark-matter.json';
    const lightStyle = './styles/globe.json';
    const newStyle = isDarkMode ? darkStyle : lightStyle;

    // THIS AREA IS VERY BRITTLE, TRY NOT TO modify or move unless you are sure that you can move it thoroughly
    // WHY NEEDED: Style loading can fail, need to catch and log errors
    this.map.once('error', (e) => {
      console.error('Map style loading error:', e);
    });

    // WHY TRANSFORM STYLE: Without this, hex grid gets destroyed on theme change
    // This is the ONLY way to preserve custom sources/layers in MapLibre
    this.map.setStyle(newStyle, {
      transformStyle: (previousStyle, nextStyle) => {
        return this.preserveCustomLayers(previousStyle, nextStyle);
      }
    });

    this.setupStyleLoadHandlers(isDarkMode);

    // END BRITTLE AREA
  }

  /**
   * Preserve custom sources and layers when switching styles
   *
   * WHY NEEDED: MapLibre's transformStyle callback is the ONLY way to preserve custom layers.
   * Without this, hex grid disappears on every theme change.
   * This manually copies hex-grid source and all hex-related layers from old style to new style.
   */
  private preserveCustomLayers(previousStyle: any, nextStyle: any): any {

    // THIS AREA IS VERY BRITTLE, TRY NOT TO modify or move unless you are sure that you can move it thoroughly


    // WHY THESE SPECIFIC IDs: These are the exact source/layer IDs created in overlayHexGrid() and country overlay
    const preservedSources = ['hex-grid'];
    const preservedLayers = ['hex-grid-fill', 'hex-grid-outline', 'hex-labels', 'hex-grid-selected', 'country-access-overlay'];

    // WHY FILTER: Find actual layer objects from previous style, ignore missing ones
    const preservedLayerObjects = preservedLayers.map(layerId =>
      previousStyle?.layers?.find((layer: any) => layer.id === layerId)
    ).filter(Boolean);

    // WHY SPREAD SYNTAX: Merge new base style with preserved custom elements
    return {
      ...nextStyle,
      sources: {
        ...nextStyle.sources,
        // WHY REDUCE: Copy each preserved source if it exists in previous style
        ...preservedSources.reduce((acc, sourceId) => {
          if (previousStyle?.sources?.[sourceId]) {
            acc[sourceId] = previousStyle.sources[sourceId];
          }
          return acc;
        }, {} as any)
      },
      layers: [
        ...nextStyle.layers,
        // WHY APPEND: Add preserved layers on top of new style's layers
        ...preservedLayerObjects
      ]
    };

    // END BRITTLE AREA
  }

  /**
   * Initialize hex grid using the HexGridComponent
   */
  private initializeHexGrid(): void {
    if (this.hexGrid && this.map) {
      this.hexGrid.map = this.map;
      this.hexGrid.centerLat = this.hexGridConfig.centerLat;
      this.hexGrid.centerLng = this.hexGridConfig.centerLng;
      this.hexGrid.h3Resolution = this.hexGridConfig.h3Resolution;
      this.hexGrid.kRingSize = this.hexGridConfig.kRingSize;
      this.hexGrid.initializeHexGrid();
    }
  }

  /**
   * Handle hex selection events from HexGridComponent
   */
  onHexSelected(event: HexSelectionEvent): void {
    this.selectedVisualHexCoord = event.visualCoordinate;
    this.selectedH3Index = event.h3Index;
    console.log('Hex selected:', event);
    // Additional logic for hex selection can be added here
  }

  /**
   * Handle location panel actions
   */
  onLocationAction(event: { action: any, asset: any }): void {
    console.log('Location action:', event);

    const action = event.action;
    const asset = event.asset;

    // Handle different location actions
    switch (action.id) {
      case 'activate-fos':
        // Activate FOS at current location
        if (asset.id && asset.id.startsWith('fos-')) {
          this.activateFos(asset.id);
        }
        break;

      case 'deactivate-fos':
        // Deactivate FOS at current location
        if (asset.id && asset.id.startsWith('fos-')) {
          this.deactivateFos(asset.id);
        }
        break;

      case 'toggle-fos':
        // Toggle FOS activation status
        if (asset.id && asset.id.startsWith('fos-')) {
          this.toggleFosActivation(asset.id);
        }
        break;
      case 'center-map':
        // Center map on current location
        if (this.map) {
          this.map.flyTo({
            center: [109.5, 18.2], // Hainan center
            zoom: 4
          });
        }
        break;

      case 'zoom-to-region':
        // Zoom to regional view
        if (this.map) {
          this.map.flyTo({
            center: [120, 15], // Pacific region center
            zoom: 3
          });
        }
        break;

      case 'show-mobs':
        // Toggle MOB markers visibility
        if (this.locationMarkers) {
          // This would need to be implemented in LocationMarkersComponent
          console.log('Toggle MOB visibility');
        }
        break;

      case 'show-fos':
        // Toggle FOS markers visibility
        if (this.locationMarkers) {
          // This would need to be implemented in LocationMarkersComponent
          console.log('Toggle FOS visibility');
        }
        break;

      case 'toggle-labels':
        // Toggle location labels
        console.log('Toggle location labels');
        break;

      case 'measure-distance':
        // Start distance measurement tool
        console.log('Start measuring distance');
        break;

      case 'find-location':
        // Open location search
        console.log('Open location search');
        break;

      case 'add-marker':
        // Add custom marker at current position
        console.log('Add custom marker');
        break;

      case 'navigate-route':
        // Plan route between locations
        console.log('Plan route');
        break;

      case 'location-info':
        // Show location details
        console.log('Show location info');
        break;

      case 'satellite-view':
        // Toggle satellite imagery
        console.log('Toggle satellite view');
        break;

      case 'terrain-view':
        // Show terrain features
        console.log('Toggle terrain view');
        break;

      default:
        console.warn('Unknown location action:', action.id);
    }
  }

  /**
   * Handle FOS status changes from location panel
   */
  onFosStatusChanged(event: { fosId: string, isActive: boolean, teamId?: number }): void {
    console.log('FOS status changed:', event);

    if (event.isActive) {
      this.activeFosIds.add(event.fosId);
    } else {
      this.activeFosIds.delete(event.fosId);
    }

    // Update MOB assignments if provided
    if (event.teamId && event.isActive) {
      // This would need proper mapping from teamId to MOB ID
      // For now, just logging the change
      console.log(`FOS ${event.fosId} assigned to team ${event.teamId}`);
    }
  }

  /**
   * Handle location panel state changes
   * Panels on opposite sides, no auto-minimize needed
   */
  onLocationPanelStateChange(newState: 'minimized' | 'narrow' | 'full'): void {
    this.locationPanelState = newState;
  }

  /**
   * Handle game stats panel state changes
   * Panels on opposite sides, no auto-minimize needed
   */
  onGameStatsPanelStateChange(newState: 'minimized' | 'narrow' | 'full'): void {
    this.gameStatsPanelState = newState;
  }

  /**
   * Setup event handlers for style loading completion
   *
   * DUAL HANDLERS WITH COORDINATION: Both events needed, but with flag to prevent double updates.
   * Sometimes only one fires, so we need both for reliability.
   */
  private setupStyleLoadHandlers(isDarkMode: boolean): void {
    let colorsUpdated = false; // Flag to prevent duplicate updates

    // THIS AREA IS VERY BRITTLE, TRY NOT TO modify or move unless you are sure that you can move it thoroughly
    // WHY style.load: Fires when new style is completely loaded and applied
    this.map.once('style.load', () => {
      console.log('✅ style.load fired for', isDarkMode ? 'dark' : 'light');
      this.map.setProjection({ type: 'globe' }); // Set to globe projection

      // Use HexGridComponent's updateColors method if available
      if (this.hexGrid) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.hexGrid.updateColors();
          });
        });
      } else {
        this.updateHexGridColors(); // Fallback to old method
      }

      this.updateMarkerColors();  // WHY: HTML markers need new theme colors (no recreation needed)
      this.map.resize();          // WHY: Container layout may have changed

      // Restore country overlay if it was active before theme change
      if (this.countryOverlayService.isOverlayVisible()) {
        requestAnimationFrame(() => {
          this.countryOverlayService.toggleOverlay(); // Turn off
          this.countryOverlayService.toggleOverlay(); // Turn back on to restore
        });
      }

      colorsUpdated = true;       // Mark colors as updated
    });

    // WHY styledata: Backup handler in case style.load doesn't fire properly
    this.map.once('styledata', () => {
      console.log('✅ styledata fired for', isDarkMode ? 'dark' : 'light');
      if (!colorsUpdated && this.map.getLayer('hex-grid-selected')) {
        if (this.hexGrid) {
          this.hexGrid.updateColors();
        } else {
          this.updateHexGridColors(); // Fallback to old method
        }
        this.updateMarkerColors();  // Only run if style.load didn't already do it
      }
    });

    // END BRITTLE AREA
  }

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
   * Update marker colors to match current Material Design theme
   * Called when theme changes to ensure HTML marker colors stay consistent
   */
  private updateMarkerColors(): void {
    // Delegate to the LocationMarkersComponent if it exists
    if (this.locationMarkers) {
      // The component handles theme changes internally via effect()
      // No need to manually trigger updates
    }
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
    const sysSurface = this.getCSSVariableValue('--mat-sys-surface') || '#FFFFFF';

    try {
      // Update hex grid fill colors
      if (this.map.getLayer('hex-grid-fill')) {
        this.map.setPaintProperty('hex-grid-fill', 'fill-color', sysSurface);
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

  // Demo data is now managed by GameStatsService

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
    // Set initial collapsed state based on screen size (desktop starts expanded)
    this.breakpointObserver.observe('(min-width: 768px)').subscribe(result => {
      // Only set initial state if panel hasn't been manually changed or deep-linked
      if (this.locationPanelState === 'minimized' && !this.route.snapshot.queryParamMap.get('panel')) {
        this.locationPanelState = result.matches ? 'narrow' : 'minimized'; // Desktop (≥768px) = narrow, Mobile (<768px) = minimized
      }
    });

    // Get the gameId from the route parameter
    const gameId = this.route.snapshot.paramMap.get('gameId');
    if (gameId) {
      this.currentGameId = Number(gameId);
      this.store.dispatch(GameActions.loadGameById({ gameId }));

      // Connect to WebSocket for real-time updates
      this.webSocketService.connect(gameId);

      // Initialize FOS state with offline-first approach
      this.fosStateService.initializeForGame(Number(gameId));
    }

    // Parse optional deep-link query params
    const qp = this.route.snapshot.queryParamMap;
    const fosDisplayStr = qp.get('fos');
    const panel = qp.get('panel'); // expect 'fos'
    const view = qp.get('view') as ('rfi' | 'tasks' | null);

    if (panel === 'fos') {
      this.locationPanelState = 'narrow'; // open panel to narrow state
    }
    if (view === 'rfi' || view === 'tasks') {
      this.initialSubview = view;
    }

    if (fosDisplayStr) {
      const dn = parseInt(fosDisplayStr, 10);
      if (!isNaN(dn)) {
        const fosKey = `fos-${dn.toString().padStart(2, '0')}`;
        const staticFos = FOS_LOCATIONS[fosKey];
        if (staticFos) {
          // Programmatically select the hex for this FOS
          this.selectedH3Index = staticFos.h3Index;
          // selectedVisualHexCoord mapping may not be ready; it's optional for panel operation
        }
      }
    }

    // Subscribe to game changes to join the appropriate room
    this.game$.subscribe(game => {
      if (game?.roomCode && this.webSocketService) {
        this.webSocketService.joinGameRoom(game.roomCode);
      }
    });
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

      // Initialize demo FOS activations after a slight delay to ensure markers are ready
      // Commented out: No FOSs should be active at game start
      // setTimeout(() => {
      //   this.initializeDemoFosActivations();
      // }, 1000);
    }, 0);
  }


  /**
   * Lifecycle Method Intent: Clean up resources when component is destroyed.
   *
   * This method handles:
   * - Removing MapLibre GL map instance to prevent memory leaks
   * - Cleaning up HTML markers to prevent memory leaks
   * - Cleaning up event listeners and DOM references
   * - Proper resource disposal for performance optimization
   */
  ngOnDestroy(): void {
    // LocationMarkersComponent handles its own cleanup via ngOnDestroy

    // Disconnect from WebSocket
    this.webSocketService.disconnect();


    // Reset flags for cleanup
    this.hexGridCreated = false;

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

    // Initial setup when map first loads
    this.map.on('style.load', () => {
      // Set Mercator projection after style loads
      this.map.setProjection({ type: 'globe' });
      // Add delay to ensure style is completely ready
      setTimeout(() => {
        this.initializeHexGrid(); // Initialize hex grid using HexGridComponent
        // LocationMarkersComponent will be initialized via Angular's change detection
        // when the map input is provided in the template
        // Ensure map draws correctly if container layout changed due to theme switch
        requestAnimationFrame(() => this.map.resize());
      }, 100);
    });

    // Mark map as ready for theme switching
    this.map.on('load', () => {
      this.mapReady = true;
      // Initialize country overlay service with map reference
      this.countryOverlayService.setMap(this.map);

      // Initialize overlay state from localStorage if gameId is available
      if (this.currentGameId) {
        this.countryOverlayService.initializeOverlayState(this.currentGameId);

        // Sync the toggle button state with the overlay service after initialization
        setTimeout(() => {
          if (this.countryAccessToggle) {
            this.countryAccessToggle.syncWithOverlayService();
          }
        }, 0);
      }
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
    const outlineVariantRaw = this.getCSSVariableValue('--mat-sys-outline-variant');
    const onSurfaceVariantRaw = this.getCSSVariableValue('--mat-sys-on-surface-variant');
    const sysSurface = this.getCSSVariableValue('--mat-sys-surface');

    const outlineVariant = outlineVariantRaw || '#666666';
    // Use outline instead of on-surface-variant for better contrast on labels
    const onSurfaceVariant = this.getCSSVariableValue('--mat-sys-outline') || onSurfaceVariantRaw || '#666666';
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
          'fill-color': sysSurface,
          'fill-opacity': 0.1
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
          'line-opacity': 0.75,
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
          'text-opacity': 0.75,
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

  // MOB and FOS marker rendering is now handled by LocationMarkersComponent
  // The component is initialized in the template with the map instance

  /**
   * Activate a FOS (make it fully opaque) and assign to a MOB
   * @param fosId The ID of the FOS to activate
   * @param mobId Optional MOB ID to assign (defaults to current player's MOB)
   */
  activateFos(fosId: string, mobId?: string): void {
    if (!this.activeFosIds.has(fosId)) {
      this.activeFosIds.add(fosId);

      // Assign MOB ownership
      const assignedMob = mobId || this.currentPlayerMob || 'unassigned';
      this.fosMobAssignments[fosId] = assignedMob;

      // Update LocationMarkersComponent if it's available
      if (this.locationMarkers) {
        this.locationMarkers.activateFos(fosId);
      }

      console.log(`FOS ${fosId} activated and assigned to MOB ${assignedMob}`);

      // Update game stats to reflect activation
      const mobName = MOB_LOCATIONS[assignedMob]?.name || assignedMob;
      this.gameStatsService.addLogEntry(
        `FOS ${fosId} has been activated by ${mobName}`,
        'action'
      );
    }
  }

  /**
   * Deactivate a FOS via API call, after showing confirmation dialog
   * @param fosId The static FOS ID to deactivate
   */
  deactivateFos(fosId: string): void {
    // Find the database FOS by matching the static FOS ID to display number
    const staticFos = FOS_LOCATIONS[fosId];
    if (!staticFos) {
      console.error(`Static FOS not found: ${fosId}`);
      this.snackBar.open('FOS not found', 'Close', { duration: 3000 });
      return;
    }

    // Extract display number from FOS name (e.g., "FOS 7" -> 7)
    const fosDisplayNumber = parseInt(staticFos.name.replace(/\D/g, '') || '0');
    if (!fosDisplayNumber) {
      console.error(`Invalid FOS display number for: ${fosId}`);
      this.snackBar.open('Invalid FOS identifier', 'Close', { duration: 3000 });
      return;
    }

    // Find the database FOS UUID using the display number
    const dbFos = this.fosStateService.fosList().find(fos => fos.fosDisplayNumber === fosDisplayNumber);
    if (!dbFos) {
      console.error(`Database FOS not found for display number: ${fosDisplayNumber}`);
      this.snackBar.open('FOS not found in database', 'Close', { duration: 3000 });
      return;
    }

    // Only deactivate if currently active
    if (!this.activeFosIds.has(fosId)) {
      this.snackBar.open('FOS is already inactive', 'Close', { duration: 3000 });
      return;
    }

    // Get assigned team name for the dialog
    const assignedMobId = this.fosMobAssignments[fosId];
    const assignedTeamName = assignedMobId ? (MOB_LOCATIONS[assignedMobId]?.name || assignedMobId) : undefined;

    // Get current turn from observable
    this.currentTurn$.pipe(
      take(1)
    ).subscribe(currentTurn => {
      // Show confirmation dialog
      const dialogData: FosDeactivationDialogData = {
        fosName: staticFos.name,
        fosDisplayNumber: fosDisplayNumber,
        currentTurn: currentTurn,
        assignedTeamName: assignedTeamName
      };

      const dialogRef = this.dialog.open(FosDeactivationDialogComponent, {
        data: dialogData,
        width: '480px',
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result: FosDeactivationDialogResult) => {
        if (result?.confirmed) {
          this.performFosDeactivation(fosId, dbFos.id, fosDisplayNumber, assignedMobId);
        }
      });
    });
  }

  /**
   * Perform the actual FOS deactivation API call after confirmation
   * @param fosId The static FOS ID
   * @param dbFosId The database FOS UUID
   * @param fosDisplayNumber The FOS display number
   * @param previousMobId The previously assigned MOB ID
   */
  private performFosDeactivation(fosId: string, dbFosId: string, fosDisplayNumber: number, previousMobId?: string): void {
    // Call the API to deactivate using the database UUID
    this.fosService.deactivateFOS(dbFosId).subscribe({
      next: (_updatedFos) => {
        // Success - update local state immediately
        this.activeFosIds.delete(fosId);

        // Remove MOB assignment
        delete this.fosMobAssignments[fosId];

        // Update LocationMarkersComponent if it's available
        if (this.locationMarkers) {
          this.locationMarkers.deactivateFos(fosId);
        }

        console.log(`FOS ${fosId} deactivated via API`);

        // Update game stats to reflect deactivation
        const previousMobName = previousMobId ? (MOB_LOCATIONS[previousMobId]?.name || previousMobId) : null;
        this.gameStatsService.addLogEntry(
          `FOS ${fosDisplayNumber} has been deactivated${previousMobName ? ` (was controlled by ${previousMobName})` : ''}`,
          'warning'
        );

        // Show success message
        this.snackBar.open(`FOS ${fosDisplayNumber} deactivated successfully!`, 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Failed to deactivate FOS:', error);

        // Show appropriate error message based on status code
        let errorMessage = 'Failed to deactivate FOS';
        if (error.status === 403) {
          errorMessage = 'You do not have permission to deactivate this FOS';
        } else if (error.status === 404) {
          errorMessage = 'FOS not found';
        } else if (error.status === 400) {
          errorMessage = 'FOS is already inactive';
        }

        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Toggle FOS activation status
   * @param fosId The ID of the FOS to toggle
   */
  toggleFosActivation(fosId: string): void {
    if (this.activeFosIds.has(fosId)) {
      this.deactivateFos(fosId);
    } else {
      this.activateFos(fosId);
    }
  }

  /**
   * Initialize some FOSs as active for demo purposes

 */  // Close truncated comment

  // Initialize some FOSs as active for demo purposes (development/demo only)
  private initializeDemoFosActivations(): void {
    // Activate and assign FOSs to different MOBs for demo
    this.activateFos('fos-01', 'kadena');    // Player's MOB (Kadena)
    this.activateFos('fos-03', 'kadena');    // Player's MOB (Kadena)
    this.activateFos('fos-06', 'andersen');  // Andersen MOB
    this.activateFos('fos-08', 'yokota');    // Yokota MOB
    this.activateFos('fos-10', 'osan');      // Osan MOB
  }

  /**
   * Handle country access overlay toggle (from toolbar button)
   */
  onCountryAccessToggle(isVisible: boolean): void {
    console.log('Country access overlay toggled:', isVisible);

    if (!this.map || !this.mapReady) {
      console.warn('Map not ready for country overlay toggle');
      return;
    }

    // Ensure overlay service has the map reference
    this.countryOverlayService.setMap(this.map);

    // Align overlay visibility with toggle state (avoid blindly toggling)
    if (isVisible !== this.countryOverlayService.isOverlayVisible()) {
      // Pass gameId for localStorage persistence
      this.countryOverlayService.toggleOverlay(this.currentGameId || undefined);
    }

    // Ensure toggle button stays in sync after any overlay changes
    setTimeout(() => {
      if (this.countryAccessToggle) {
        this.countryAccessToggle.syncWithOverlayService();
      }
    }, 0);
  }

  /**
   * Handle opening the dice roll dialog (from long-press on country access toggle)
   * Only available to Game Masters
   */
  onOpenDiceRollDialog(): void {
    // Guard: GM-only functionality
    if (!this.playerRoleService.isCurrentPlayerGameMaster()) {
      console.warn('Dice roll dialog is only available to Game Masters');
      return;
    }

    // Ensure we have a valid game ID
    if (!this.currentGameId) {
      console.error('No valid gameId available for dice roll dialog');
      return;
    }

    console.log('Opening country access dice roll dialog');

    // Open the mobile-friendly dice roll dialog with gameId data
    const dialogRef = this.dialog.open(CountryAccessDiceRollDialogComponent, {
      width: window.innerWidth < 768 ? 'fit-content' : '50vw',
      maxWidth: window.innerWidth < 768 ? '95vw' : '800px',
      height: 'auto',
      maxHeight: '90vh',
      disableClose: false,
      panelClass: 'dice-roll-dialog',
      data: { gameId: this.currentGameId }
    });

    // Handle dialog result
    dialogRef.afterClosed().subscribe((saved?: boolean) => {
      if (saved) {
        console.log('Dice rolls were saved successfully');
        // WebSocket broadcasting is handled automatically by the CountryAccessHttpService
        // and the existing country overlay service will update via WebSocket events
      } else {
        console.log('Dice roll dialog was cancelled');
      }
    });
  }

}

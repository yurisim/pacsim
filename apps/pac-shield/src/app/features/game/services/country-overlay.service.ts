import { Injectable, signal, inject, effect } from '@angular/core';
import { Map } from 'maplibre-gl';
import { AccessStatus, Country, country } from '../../../generated/enums';
import { WebSocketService } from '../../../shared/services/websocket.service';
import { CountryAccessHttpService } from '../../../shared/services/country-access-http.service';
import { Store } from '@ngrx/store';
import { AppState } from '../../../core/store/app.state';
import { selectGame } from '../../../core/store/game/game.selectors';
import { ThemeService } from '../../../shared/services/theme.service';

@Injectable({
  providedIn: 'root'
})
/**
 * Manages the political access country overlay rendered on the MapLibre map.
 *
 * Responsibilities:
 * - Maintain and expose overlay visibility state
 * - Load and reactively update per-country AccessStatus (Full, Overflight, None)
 * - Listen to WebSocket events for real-time sync across clients
 * - Render and refresh a themed vector overlay layer with correct colors per status
 *
 * Usage:
 * - Call setMap() once the Map instance is ready
 * - Call toggleOverlay() to show/hide the overlay (loads initial state on first show)
 * - Call updateCountryAccess() for optimistic UI updates prior to server confirmation
 *
 * @class CountryOverlayService
 */
export class CountryOverlayService {
  private map: Map | null = null;
  private readonly LAYER_ID = 'country-access-overlay';

  // Signal for overlay visibility (internal)
  private overlayVisibleSignal = signal(false);
  private initialStateLoaded = false;

  // Reverse mapping and game context
  private iso3ToCountry: Record<string, Country> = {};
  private currentGameId: number | null = null;

  // DI helpers
  private store = inject(Store<AppState>);
  private webSocketService = inject(WebSocketService);
  private countryAccessHttp = inject(CountryAccessHttpService);
  private themeService = inject(ThemeService);

  /**
   * Reactive store of country → AccessStatus used to paint the overlay.
   * Initialized to NO_ACCESS for all configured countries and updated from:
   * - Initial HTTP snapshot
   * - Optimistic UI updates
   * - WebSocket events (single and bulk)
   */
  private countryAccessData = signal<Record<Country, AccessStatus>>({
    'JAPAN': 'NO_ACCESS',
    'PHILIPPINES': 'NO_ACCESS',
    'INDONESIA': 'NO_ACCESS',
    'BRUNEI': 'NO_ACCESS',
    'SINGAPORE': 'NO_ACCESS',
    'MALAYSIA': 'NO_ACCESS',
    'THAILAND': 'NO_ACCESS',
    'CAMBODIA': 'NO_ACCESS',
    'VIETNAM': 'NO_ACCESS',
    'LAOS': 'NO_ACCESS',
    'INDIA': 'NO_ACCESS'
  });

  // Map our Country enum to ISO3 codes used by MapLibre's country data
  private readonly countryIsoMapping: Record<Country, string> = {
    'JAPAN': 'JPN',
    'PHILIPPINES': 'PHL',
    'INDONESIA': 'IDN',
    'BRUNEI': 'BRN',
    'SINGAPORE': 'SGP',
    'MALAYSIA': 'MYS',
    'THAILAND': 'THA',
    'CAMBODIA': 'KHM',
    'VIETNAM': 'VNM',
    'LAOS': 'LAO',
    'INDIA': 'IND'
  };

  constructor() {
    // Build reverse mapping once from forward mapping
    Object.entries(this.countryIsoMapping).forEach(([country, iso3]) => {
      this.iso3ToCountry[iso3] = country as Country;
    });

    // Setup theme change listener - refresh overlay when theme changes
    // This follows the same pattern as location markers for reactive theme switching
    effect(() => {
      const isDarkMode = this.themeService.isDarkMode();
      // Only refresh if overlay is visible to avoid unnecessary work
      if (this.isOverlayVisible()) {
        this.refreshOverlay();
      }
    });

    // Track current gameId for WS filtering
    this.store.select(selectGame).subscribe((g) => {
      this.currentGameId = g?.id ?? null;
    });

    // Subscribe to WebSocket events to keep overlay in sync across clients
    this.webSocketService.listen<any>('countryAccessChanged').subscribe((evt) => {
      const payload = (evt as any)?.payload ?? evt;
      if (!payload) return;
      if (this.currentGameId != null && payload.gameId !== this.currentGameId) return;
      if (payload.accessType !== 'access') return; // Only update main 'access' overlay in this task
      const country = payload.country as Country;
      const level = payload.accessLevel as AccessStatus;
      this.updateCountryAccess(country, level);
    });

    this.webSocketService.listen<any>('bulkCountryAccessChanged').subscribe((evt) => {
      const payload = (evt as any)?.payload ?? evt;
      if (!payload) {
        console.warn('Received bulkCountryAccessChanged event with no payload');
        return;
      }
      if (this.currentGameId != null && payload.gameId !== this.currentGameId) {
        console.log(`Ignoring bulkCountryAccessChanged for game ${payload.gameId}, current game is ${this.currentGameId}`);
        return;
      }

      const level = payload.accessLevel as AccessStatus;
      const countries: string[] = Array.isArray(payload.countries) ? payload.countries : [];
      if (countries.length === 0) {
        console.warn('Received bulkCountryAccessChanged event with no countries');
        return;
      }

      console.log(`Received bulkCountryAccessChanged: ${countries.length} countries to ${level}`);

      // Batch update to avoid multiple refreshes
      const current = { ...this.countryAccessData() };
      let updatedCount = 0;
      for (const c of countries) {
        if (country.includes(c as Country)) {
          current[c as Country] = level;
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        this.countryAccessData.set(current);
        if (this.isOverlayVisible()) {
          this.refreshOverlay();
        }
        console.log(`Updated ${updatedCount} countries via WebSocket`);
      }
    });
  }

  /**
   * Provide the MapLibre GL map instance to render the overlay on.
   * Must be called before showing the overlay.
   *
   * @param map MapLibre GL map instance
   * @returns void
   */
  setMap(map: Map): void {
    this.map = map;
  }

  /**
   * Load the initial per-country access state from the backend, once per game.
   * No-ops if data is already loaded or game id is not available yet.
   *
   * @returns Promise that resolves when the snapshot (if needed) has been applied
   */
  private async loadInitialStateIfNeeded(): Promise<void> {
    if (this.initialStateLoaded || !this.currentGameId) {
      return;
    }

    try {
      console.log(`Loading initial country access state for game ${this.currentGameId}`);

      // Note: The backend getCountryAccessSnapshot API returns { countries: Record<string, AccessStatus> }
      // with full access status including OVERFLIGHT_ONLY
      const snapshot = await this.countryAccessHttp.getCountryAccessSnapshot(this.currentGameId).toPromise();

      if (snapshot?.countries) {
        const newData: Record<Country, AccessStatus> = { ...this.countryAccessData() };

        // Map AccessStatus values directly
        Object.entries(snapshot.countries).forEach(([countryKey, accessStatus]) => {
          if (country.includes(countryKey as Country)) {
            // Use the access status directly from the backend
            newData[countryKey as Country] = accessStatus as AccessStatus;
          }
        });

        this.countryAccessData.set(newData);
        this.initialStateLoaded = true;
        console.log('Initial country access state loaded successfully', newData);
      }
    } catch (error) {
      console.error('Failed to load initial country access state:', error);
      // Keep using default values on error
    }
  }

  /**
   * Toggle the overlay's visibility.
   * When enabling, ensures initial state is loaded before rendering.
   *
   * @returns void
   */
  toggleOverlay(): void {
    const newVisibility = !this.overlayVisibleSignal();
    this.overlayVisibleSignal.set(newVisibility);

    if (newVisibility) {
      this.loadInitialStateIfNeeded().then(() => {
        this.showOverlay();
      });
    } else {
      this.hideOverlay();
    }
  }

  /**
   * Update a single country's AccessStatus and refresh the overlay if visible.
   * Intended for optimistic UI updates; server/WebSocket updates will reconcile state.
   *
   * @param country Country enum value to update
   * @param access New access level to apply
   * @returns void
   */
  updateCountryAccess(country: Country, access: AccessStatus): void {
    const currentData = this.countryAccessData();
    this.countryAccessData.set({
      ...currentData,
      [country]: access
    });

    if (this.isOverlayVisible()) {
      this.refreshOverlay();
    }
  }

  /**
   * Render the country access overlay layer using current AccessStatus values.
   * Safely removes any previous instance of the layer before re-adding.
   *
   * @returns void
   */
  private showOverlay(): void {
    if (!this.map) return;

    // Remove existing layer if it exists
    this.hideOverlay();

    // Create filter for countries in our game using ISO3 codes
    const gameCountryIsoCodes = Object.values(this.countryIsoMapping);
    const countryFilter = ['in', ['get', 'ADM0_A3'], ['literal', gameCountryIsoCodes]] as any;

    // Build match expression arrays for colors
    const colorMatchConditions: (string | string[])[] = [];
    const borderColorMatchConditions: (string | string[])[] = [];

    Object.entries(this.countryAccessData()).forEach(([country, access]) => {
      const isoCode = this.countryIsoMapping[country as Country];

      const colors = this.getAccessColors(access);
      const fillColor = colors.fill;
      const borderColor = colors.border;

      colorMatchConditions.push(isoCode, fillColor);
      borderColorMatchConditions.push(isoCode, borderColor);
    });

    // Add overlay layer using MapLibre's existing country data
    this.map.addLayer({
      id: this.LAYER_ID,
      type: 'fill',
      source: 'maplibre', // Use the existing vector tile source
      'source-layer': 'countries',
      filter: countryFilter,
      paint: {
        'fill-color': [
          'match',
          ['get', 'ADM0_A3'],
          ...colorMatchConditions,
          '#999999' // Default gray
        ] as any,
        'fill-opacity': 1.0, // Solid colors for clear political access indication
        'fill-outline-color': [
          'match',
          ['get', 'ADM0_A3'],
          ...borderColorMatchConditions,
          '#666666' // Default gray
        ] as any
      }
    }, 'countries-label'); // Add below country labels but above the base country layer
  }

  /**
   * Remove the overlay layer if present.
   *
   * @returns void
   */
  private hideOverlay(): void {
    if (!this.map) return;

    // Remove overlay layer
    if (this.map.getLayer(this.LAYER_ID)) {
      this.map.removeLayer(this.LAYER_ID);
    }
  }

  /**
   * Refresh overlay paint expressions to reflect current AccessStatus values.
   * Re-creates the layer as MapLibre paint expression updates may not apply directly.
   *
   * @returns void
   */
  private refreshOverlay(): void {
    if (!this.map || !this.isOverlayVisible()) return;

    // For vector tile layers, we need to recreate the layer with updated paint expressions
    this.showOverlay();
  }


  /**
   * Compute theme-appropriate fill and border colors for a given AccessStatus.
   * Dark mode uses more subdued variants for better contrast.
   *
   * @param access Current access level for a country
   * @returns Object with CSS color strings for fill and border
   */
  private getAccessColors(access: AccessStatus): { fill: string; border: string } {
    const isDarkMode = this.themeService.isDarkMode();

    switch (access) {
      case 'FULL_ACCESS':
        return isDarkMode
          ? { fill: '#2E7D32', border: '#1B5E20' }  // Dark green for dark mode
          : { fill: '#81C784', border: '#66BB6A' }; // Medium green for light mode

      case 'OVERFLIGHT_ONLY':
        return isDarkMode
          ? { fill: '#E65100', border: '#BF360C' }  // Dark orange for dark mode
          : { fill: '#FFB74D', border: '#FFA726' }; // Medium orange for light mode

      case 'NO_ACCESS':
        return isDarkMode
          ? { fill: '#C62828', border: '#B71C1C' }  // Dark red for dark mode
          : { fill: '#EF5350', border: '#E53935' }; // Medium red for light mode

      default:
        return isDarkMode
          ? { fill: '#616161', border: '#424242' }  // Darker gray for dark mode
          : { fill: '#E0E0E0', border: '#BDBDBD' }; // Lighter gray for light mode
    }
  }

  /**
   * Indicates whether the overlay is currently visible.
   * This is a read-only accessor that does not expose the underlying signal.
   *
   * @returns True when overlay is visible, false otherwise
   */
  isOverlayVisible(): boolean {
    return this.overlayVisibleSignal();
  }

  /**
   * Exposes the stable overlay layer identifier for consumers (e.g., event binding).
   * @returns The layer id string used when adding the overlay to the map
   */
  getLayerId(): string {
    return this.LAYER_ID;
  }

  /**
   * Convert an ISO3 country code (from map data) to the app's Country enum.
   *
   * @param iso3 ISO3 country code from the vector tile layer (e.g., "JPN")
   * @returns Matching Country enum value or null when not in the configured set
   */
  getCountryByIso3(iso3: string): Country | null {
    return (this.iso3ToCountry[iso3] as Country) ?? null;
  }

  /**
   * Get a snapshot of current country access mapping for external consumers.
   * @returns Record of Country → AccessStatus
   */
  getCountryAccess(): Record<Country, AccessStatus> {
    return this.countryAccessData();
  }
}

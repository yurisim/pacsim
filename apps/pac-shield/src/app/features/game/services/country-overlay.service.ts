import { Injectable, signal, inject } from '@angular/core';
import { Map } from 'maplibre-gl';
import { AccessStatus, Country, country } from '../../../generated/enums';
import { WebSocketService } from '../../../shared/services/websocket.service';
import { CountryAccessHttpService } from '../../../shared/services/country-access-http.service';
import { Store } from '@ngrx/store';
import { AppState } from '../../../core/store/app.state';
import { selectGame } from '../../../core/store/game/game.selectors';

@Injectable({
  providedIn: 'root'
})
export class CountryOverlayService {
  private map: Map | null = null;
  private readonly LAYER_ID = 'country-access-overlay';

  // Signal for overlay visibility (internal)
  private overlayVisibleSignal = signal(false);

  // Reverse mapping and game context
  private iso3ToCountry: Record<string, Country> = {};
  private currentGameId: number | null = null;

  // DI helpers
  private store = inject(Store<AppState>);
  private webSocketService = inject(WebSocketService);
  private countryAccessHttp = inject(CountryAccessHttpService);

  // Country access data
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
      if (!payload) return;
      if (this.currentGameId != null && payload.gameId !== this.currentGameId) return;

      const level = payload.accessLevel as AccessStatus;
      const countries: string[] = Array.isArray(payload.countries) ? payload.countries : [];
      if (countries.length === 0) return;

      // Batch update to avoid multiple refreshes
      const current = { ...this.countryAccessData() };
      for (const c of countries) {
        current[c as Country] = level;
      }
      this.countryAccessData.set(current);
      if (this.isOverlayVisible()) {
        this.refreshOverlay();
      }
    });
  }

  setMap(map: Map): void {
    this.map = map;
  }

  toggleOverlay(): void {
    const newVisibility = !this.overlayVisibleSignal();
    this.overlayVisibleSignal.set(newVisibility);

    if (newVisibility) {
      this.showOverlay();
    } else {
      this.hideOverlay();
    }
  }

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

      let fillColor: string;
      let borderColor: string;

      switch (access) {
        case 'FULL_ACCESS':
          fillColor = '#4CAF50';
          borderColor = '#2E7D32';
          break;
        case 'OVERFLIGHT_ONLY':
          fillColor = '#FF9800';
          borderColor = '#F57C00';
          break;
        case 'NO_ACCESS':
          fillColor = '#F44336';
          borderColor = '#C62828';
          break;
        default:
          fillColor = '#999999';
          borderColor = '#666666';
      }

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
        'fill-opacity': 0.4,
        'fill-outline-color': [
          'match',
          ['get', 'ADM0_A3'],
          ...borderColorMatchConditions,
          '#666666' // Default gray
        ] as any
      }
    }, 'countries-label'); // Add below country labels but above the base country layer
  }

  private hideOverlay(): void {
    if (!this.map) return;

    // Remove layer
    if (this.map.getLayer(this.LAYER_ID)) {
      this.map.removeLayer(this.LAYER_ID);
    }
  }

  private refreshOverlay(): void {
    if (!this.map || !this.isOverlayVisible()) return;

    // For vector tile layers, we need to recreate the layer with updated paint expressions
    this.showOverlay();
  }

  // Readonly accessor for visibility (avoid exposing Signal directly)
  isOverlayVisible(): boolean {
    return this.overlayVisibleSignal();
  }

  // Expose stable layer id without hardcoding in consumers
  getLayerId(): string {
    return this.LAYER_ID;
  }

  // Map ISO3 -> Country (built once from forward mapping)
  getCountryByIso3(iso3: string): Country | null {
    return (this.iso3ToCountry[iso3] as Country) ?? null;
  }

  getCountryAccess(): Record<Country, AccessStatus> {
    return this.countryAccessData();
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from './websocket.service';
import { JammingStateService, JAMMABLE_SERVICES } from './jamming-state.service';
import { LocalStorageService } from './local-storage.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ForwardOperatingSite } from '../../generated';
import { catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FosStateService {
  private http = inject(HttpClient);
  private webSocketService = inject(WebSocketService);
  private jammingStateService = inject(JammingStateService);
  private localStorageService = inject(LocalStorageService);

  private readonly baseUrl = '/api/fos';
  private readonly CACHE_KEY = 'fos_list';
  private readonly CACHE_MAX_AGE_MINUTES = 30;

  private currentGameId: number | null = null;

  // Signal to hold the current FOS state
  private fosListSignal = signal<ForwardOperatingSite[]>([]);

  // Public readonly signal for components to subscribe to
  public fosList = this.fosListSignal.asReadonly();

  // Computed signal for active FOS IDs
  public activeFosIds = signal(new Set<string>());

  constructor() {
    // Listen for FOS list updates from the WebSocket (when WebSocket service not jammed)
    this.webSocketService.listen<ForwardOperatingSite[]>('fosListUpdate')
      .pipe(takeUntilDestroyed())
      .subscribe(fosList => {
        // Only update if WebSocket service is not jammed
        if (!this.jammingStateService.isServiceJammed(JAMMABLE_SERVICES.WEBSOCKET)) {
          this.updateFosState(fosList);
          // Cache the update for offline use
          if (this.currentGameId) {
            this.localStorageService.setCache(this.CACHE_KEY, fosList, this.currentGameId);
          }
        } else {
          console.log('🔶 WebSocket update blocked - service jammed');
        }
      });
  }

  /**
   * Initialize FOS state for a specific game with offline-first approach
   */
  async initializeForGame(gameId: number): Promise<void> {
    this.currentGameId = gameId;

    // Try to load from cache first (offline-first)
    const cachedFosList = this.localStorageService.getCache<ForwardOperatingSite[]>(
      this.CACHE_KEY,
      gameId,
      this.CACHE_MAX_AGE_MINUTES
    );

    if (cachedFosList) {
      this.updateFosState(cachedFosList);
      console.log(`🟡 FOS state loaded from cache (${cachedFosList.length} FOSs)`);
    }

    // If FOS API service is not jammed, try to fetch fresh data
    if (!this.jammingStateService.isServiceJammed(JAMMABLE_SERVICES.FOS_API)) {
      try {
        const freshFosList = await this.fetchFosListFromApi(gameId);
        this.updateFosState(freshFosList);

        // Update cache with fresh data
        this.localStorageService.setCache(this.CACHE_KEY, freshFosList, gameId);
        console.log(`🟢 FOS state updated from API (${freshFosList.length} FOSs)`);
      } catch (error) {
        console.warn('Failed to fetch fresh FOS data, using cached data:', error);

        // If we don't have cached data either, fall back to empty state
        if (!cachedFosList) {
          this.updateFosState([]);
        }
      }
    } else {
      console.log('🔶 FOS API service jammed - using cached FOS data only');
    }
  }

  /**
   * Update FOS state and derived signals
   */
  private updateFosState(fosList: ForwardOperatingSite[]): void {
    this.fosListSignal.set(fosList);
    this.updateActiveFosIds(fosList);
  }

  /**
   * Update the active FOS IDs set based on the current FOS list
   */
  private updateActiveFosIds(fosList: ForwardOperatingSite[]): void {
    const activeIds = new Set<string>();
    fosList.forEach(fos => {
      if (fos.isActive && fos.fosDisplayNumber) {
        // Convert fosDisplayNumber to the string format used by markers (e.g., 'fos-01')
        const fosId = `fos-${fos.fosDisplayNumber.toString().padStart(2, '0')}`;
        activeIds.add(fosId);
      }
    });
    this.activeFosIds.set(activeIds);
  }

  /**
   * Fetch FOS list from API
   */
  private async fetchFosListFromApi(gameId: number): Promise<ForwardOperatingSite[]> {
    return new Promise((resolve, reject) => {
      this.http.get<ForwardOperatingSite[]>(`${this.baseUrl}/game/${gameId}`)
        .pipe(
          catchError(error => {
            reject(error);
            return of([]);
          })
        )
        .subscribe(fosList => {
          resolve(fosList);
        });
    });
  }

  /**
   * Get FOS data by fosDisplayNumber
   */
  getFosById(fosDisplayNumber: number): ForwardOperatingSite | undefined {
    return this.fosListSignal().find(fos => fos.fosDisplayNumber === fosDisplayNumber);
  }

  /**
   * Get all active FOSs
   */
  getActiveFosList(): ForwardOperatingSite[] {
    return this.fosListSignal().filter(fos => fos.isActive);
  }

  /**
   * Check if a FOS is active by its string ID (e.g., 'fos-01')
   */
  isFosActive(fosId: string): boolean {
    return this.activeFosIds().has(fosId);
  }

  /**
   * Convert string FOS ID to number (e.g., 'fos-01' -> 1)
   */
  fosIdToNumber(fosId: string): number | null {
    const match = fosId.match(/^fos-(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Convert number FOS ID to string (e.g., 1 -> 'fos-01')
   */
  numberToFosId(fosDisplayNumber: number): string {
    return `fos-${fosDisplayNumber.toString().padStart(2, '0')}`;
  }

  /**
   * Clear cache for current game (useful for testing or manual refresh)
   */
  clearCache(): void {
    if (this.currentGameId) {
      this.localStorageService.clearGameCache(this.currentGameId);
      console.log('🗑️ FOS cache cleared for current game');
    }
  }

  /**
   * Force refresh from API (ignores jamming - for emergency use)
   */
  async forceRefresh(): Promise<void> {
    if (!this.currentGameId) {
      console.warn('Cannot force refresh: no game ID set');
      return;
    }

    try {
      const freshFosList = await this.fetchFosListFromApi(this.currentGameId);
      this.updateFosState(freshFosList);
      this.localStorageService.setCache(this.CACHE_KEY, freshFosList, this.currentGameId);
      console.log('🔄 FOS state force-refreshed from API');
    } catch (error) {
      console.error('Failed to force refresh FOS data:', error);
      throw error;
    }
  }

  /**
   * Get cache status for debugging
   */
  getCacheInfo(): { hasCache: boolean; age?: number; jamming: string } {
    if (!this.currentGameId) {
      return { hasCache: false, jamming: this.jammingStateService.getJammingStatus() };
    }

    const cached = this.localStorageService.getCache<ForwardOperatingSite[]>(
      this.CACHE_KEY,
      this.currentGameId,
      9999 // Don't filter by age for this check
    );

    return {
      hasCache: !!cached,
      age: cached ? Math.floor((Date.now() - (cached as any).timestamp) / (1000 * 60)) : undefined,
      jamming: this.jammingStateService.getJammingStatus()
    };
  }
}
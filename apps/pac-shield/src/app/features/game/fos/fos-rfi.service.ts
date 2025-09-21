import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of, map, tap } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';

/**
 * Service: FOS RFI API wrapper with simple in-memory caching.
 *
 * Endpoints used:
 * - GET /fos/:id/rfi
 * - POST /fos/:id/rfi
 * - GET /fos/game/:gameId/rfi?displayNumber=X
 */

export interface FosRfiEntry {
  rfiKey: string;
  rfiValue?: number | null; // 1 | 2 | 3 (normalized to number client-side)
  updatedAt?: string;
  updatedBy?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FosRfiService {
  private api = inject(ApiService);

  // Cache keys: fos:{id} and game:{gameId}:dn:{displayNumber}
  private cache = new Map<string, FosRfiEntry[]>();

  private makeFosKey(fosId: string) {
    return `fos:${fosId}`;
  }

  private makeDisplayKey(gameId: number, displayNumber: number) {
    return `game:${gameId}:dn:${displayNumber}`;
  }

  private normalize(list: any[]): FosRfiEntry[] {
    return (list ?? []).map((e: any) => ({
      ...e,
      // Backend stores/returns "1" | "2" | "3"; coerce to number for UI binding
      rfiValue:
        e?.rfiValue == null
          ? null
          : typeof e.rfiValue === 'number'
          ? e.rfiValue
          : Number(String(e.rfiValue)),
    }));
  }

  getByFosId(fosId: string, useCache = true): Observable<FosRfiEntry[]> {
    const key = this.makeFosKey(fosId);
    if (useCache && this.cache.has(key)) {
      return of(this.cache.get(key)!);
    }
    return this.api.get<any[]>(`fos/${fosId}/rfi`).pipe(
      map((data) => this.normalize(data)),
      tap((data) => this.cache.set(key, data))
    );
  }

  /**
   * Read-only pre-activation by display number within a game
   */
  getByDisplayNumber(gameId: number, displayNumber: number, useCache = true): Observable<FosRfiEntry[]> {
    const key = this.makeDisplayKey(gameId, displayNumber);
    if (useCache && this.cache.has(key)) {
      return of(this.cache.get(key)!);
    }
    const params = new HttpParams().set('displayNumber', String(displayNumber));
    return this.api.get<any[]>(`fos/game/${gameId}/rfi`, params).pipe(
      map((data) => this.normalize(data)),
      tap((data) => this.cache.set(key, data))
    );
  }

  /**
   * Save/answer an RFI entry (requires active FOS id)
   * Body: { rfiKey, rfiValue }
   */
  upsertAnswer(fosId: string, rfiKey: string, rfiValue: number): Observable<FosRfiEntry[]> {
    return this.api.post<any[]>(`fos/${fosId}/rfi`, { rfiKey, rfiValue }).pipe(
      map((updated) => this.normalize(updated)),
      tap((updated) => {
        // Refresh fosId cache
        this.cache.set(this.makeFosKey(fosId), updated);
        // Invalidate any displayNumber cache entries referencing this FOS (best-effort)
        // Not tracking reverse index; clear all game:* entries
        for (const k of Array.from(this.cache.keys())) {
          if (k.startsWith('game:')) this.cache.delete(k);
        }
      })
    );
  }

  /**
   * Roll dice for an RFI entry (GM only, requires active FOS id)
   * Generates a random value between 1-3 and saves it
   */
  rollDice(fosId: string, rfiKey: string): Observable<FosRfiEntry[]> {
    return this.api.post<any[]>(`fos/${fosId}/rfi/roll-dice`, { rfiKey }).pipe(
      map((updated) => this.normalize(updated)),
      tap((updated) => {
        // Refresh fosId cache
        this.cache.set(this.makeFosKey(fosId), updated);
        // Invalidate any displayNumber cache entries referencing this FOS (best-effort)
        // Not tracking reverse index; clear all game:* entries
        for (const k of Array.from(this.cache.keys())) {
          if (k.startsWith('game:')) this.cache.delete(k);
        }
      })
    );
  }

  /**
   * Clear all cache (e.g., when panel closes)
   */
  clearAll(): void {
    this.cache.clear();
  }
}

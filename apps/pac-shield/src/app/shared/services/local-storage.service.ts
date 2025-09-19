import { Injectable } from '@angular/core';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  gameId: number;
  version: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private readonly APP_VERSION = '1.0.0'; // Should match package.json version
  private readonly CACHE_PREFIX = 'pacsim_';

  /**
   * Store data in localStorage with metadata for cache management
   */
  setCache<T>(key: string, data: T, gameId: number): void {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        gameId,
        version: this.APP_VERSION
      };

      localStorage.setItem(
        this.getCacheKey(key),
        JSON.stringify(cacheEntry)
      );
    } catch (error) {
      console.warn(`Failed to cache data for key ${key}:`, error);
    }
  }

  /**
   * Retrieve data from localStorage with validation
   */
  getCache<T>(key: string, gameId: number, maxAgeMinutes = 60): T | null {
    try {
      const item = localStorage.getItem(this.getCacheKey(key));
      if (!item) return null;

      const cacheEntry: CacheEntry<T> = JSON.parse(item);

      // Validate cache entry
      if (!this.isCacheValid(cacheEntry, gameId, maxAgeMinutes)) {
        this.removeCache(key);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.warn(`Failed to retrieve cache for key ${key}:`, error);
      this.removeCache(key);
      return null;
    }
  }

  /**
   * Remove specific cache entry
   */
  removeCache(key: string): void {
    try {
      localStorage.removeItem(this.getCacheKey(key));
    } catch (error) {
      console.warn(`Failed to remove cache for key ${key}:`, error);
    }
  }

  /**
   * Clear all game-related cache entries
   */
  clearGameCache(gameId: number): void {
    try {
      const keys = Object.keys(localStorage).filter(key =>
        key.startsWith(this.CACHE_PREFIX)
      );

      for (const key of keys) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const cacheEntry = JSON.parse(item);
            if (cacheEntry.gameId === gameId) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Failed to clear game cache:', error);
    }
  }

  /**
   * Clear all app cache entries (version mismatch, etc.)
   */
  clearAllCache(): void {
    try {
      const keys = Object.keys(localStorage).filter(key =>
        key.startsWith(this.CACHE_PREFIX)
      );

      for (const key of keys) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { totalEntries: number; totalSize: number; entriesByGame: Record<number, number> } {
    const stats = {
      totalEntries: 0,
      totalSize: 0,
      entriesByGame: {} as Record<number, number>
    };

    try {
      const keys = Object.keys(localStorage).filter(key =>
        key.startsWith(this.CACHE_PREFIX)
      );

      for (const key of keys) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            stats.totalEntries++;
            stats.totalSize += item.length;

            const cacheEntry = JSON.parse(item);
            if (typeof cacheEntry.gameId === 'number') {
              stats.entriesByGame[cacheEntry.gameId] =
                (stats.entriesByGame[cacheEntry.gameId] || 0) + 1;
            }
          }
        } catch {
          // Invalid cache entry, skip
        }
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }

    return stats;
  }

  /**
   * Generate cache key with prefix
   */
  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  /**
   * Validate cache entry for freshness and compatibility
   */
  private isCacheValid<T>(
    cacheEntry: CacheEntry<T>,
    gameId: number,
    maxAgeMinutes: number
  ): boolean {
    // Check version compatibility
    if (cacheEntry.version !== this.APP_VERSION) {
      return false;
    }

    // Check game ID match
    if (cacheEntry.gameId !== gameId) {
      return false;
    }

    // Check age
    const ageMinutes = (Date.now() - cacheEntry.timestamp) / (1000 * 60);
    if (ageMinutes > maxAgeMinutes) {
      return false;
    }

    return true;
  }
}

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { WebSocketService } from './websocket.service';
import { AircraftInstance } from '../../generated/aircraftInstance/aircraftInstance.entity';
import { environment } from '../../../environments/environment';

/**
 * Signal-based service for managing aircraft allocation state with real-time WebSocket updates
 * Pattern: Based on FosStateService structure with signals instead of NgRx
 *
 * Note: Simplified allocation - no separate AircraftAllocation entities.
 * Allocation is tracked via allocatedToTeamId field on AircraftInstance.
 */
@Injectable({
  providedIn: 'root'
})
export class AllocationSignalService {
  private http = inject(HttpClient);
  private webSocketService = inject(WebSocketService);

  private readonly baseUrl = `${environment.apiUrl}/allocation`;

  private currentGameId: number | null = null;

  // =============================================
  //            WRITABLE SIGNALS (PRIVATE)
  // =============================================

  /** All available aircraft in the pool (not yet allocated) */
  private aircraftPoolSignal = signal<AircraftInstance[]>([]);

  /** All allocated aircraft */
  private allocatedAircraftSignal = signal<AircraftInstance[]>([]);

  /** Loading states */
  private loadingStates = signal({
    pool: false,
    allocations: false,
  });

  // =============================================
  //            PUBLIC READONLY SIGNALS
  // =============================================

  /** Public readonly access to aircraft pool */
  readonly aircraftPool = this.aircraftPoolSignal.asReadonly();

  /** Public readonly access to allocated aircraft */
  readonly allocatedAircraft = this.allocatedAircraftSignal.asReadonly();

  /** Public readonly access to loading states */
  readonly loading = this.loadingStates.asReadonly();

  // =============================================
  //            COMPUTED SIGNALS
  // =============================================

  /**
   * Map of allocated aircraft grouped by team ID
   * Returns: Map<teamId, AircraftInstance[]>
   */
  readonly allocatedAircraftByTeam = computed(() => {
    const allocated = this.allocatedAircraftSignal();
    const grouped = new Map<number, AircraftInstance[]>();

    for (const aircraft of allocated) {
      const teamId = aircraft.allocatedToTeamId;
      if (teamId !== null) {
        if (!grouped.has(teamId)) {
          grouped.set(teamId, []);
        }
        grouped.get(teamId)!.push(aircraft);
      }
    }

    return grouped;
  });

  /**
   * Aircraft counts by type and subtype (pool only)
   */
  readonly aircraftCounts = computed(() => {
    const pool = this.aircraftPoolSignal();
    return {
      C130: pool.filter(a => a.type === 'C130').length,
      C17: pool.filter(a => a.type === 'C17').length,
      C5_BOBCAT: pool.filter(a => a.type === 'C5' && a.subtype === 'BOBCAT').length,
      C5_RHINO: pool.filter(a => a.type === 'C5' && a.subtype === 'RHINO').length,
      F16: pool.filter(a => a.type === 'F16').length,
      F22: pool.filter(a => a.type === 'F22').length,
    };
  });

  /**
   * Total allocated aircraft count
   */
  readonly allocatedCount = computed(() => {
    return this.allocatedAircraftSignal().length;
  });

  /**
   * Available (unallocated) aircraft count
   */
  readonly availableCount = computed(() => {
    return this.aircraftPoolSignal().length;
  });

  // =============================================
  //            CONSTRUCTOR - WEBSOCKET SETUP
  // =============================================

  constructor() {
    this.setupWebSocketListeners();
  }

  /**
   * Set up WebSocket listeners for real-time updates
   */
  private setupWebSocketListeners(): void {
    // Aircraft spawned (GM created new aircraft)
    this.webSocketService.listen<AircraftInstance>('aircraftSpawned')
      .pipe(takeUntilDestroyed())
      .subscribe(aircraft => {
        console.log('🛫 Aircraft spawned:', aircraft.callSign);
        this.handleAircraftSpawned(aircraft);
      });

    // Aircraft allocated
    this.webSocketService.listen<AircraftInstance>('aircraftAllocated')
      .pipe(takeUntilDestroyed())
      .subscribe(aircraft => {
        console.log('✈️ Aircraft allocated:', aircraft.callSign);
        this.handleAircraftAllocated(aircraft);
      });

    // Aircraft deallocated
    this.webSocketService.listen<AircraftInstance>('aircraftDeallocated')
      .pipe(takeUntilDestroyed())
      .subscribe(aircraft => {
        console.log('🔄 Aircraft deallocated:', aircraft.callSign);
        this.handleAircraftDeallocated(aircraft);
      });

    // Aircraft removed (GM deleted)
    this.webSocketService.listen<{ aircraftId: number }>('aircraftRemoved')
      .pipe(takeUntilDestroyed())
      .subscribe(data => {
        console.log('🗑️ Aircraft removed:', data.aircraftId);
        this.handleAircraftRemoved(data.aircraftId);
      });
  }

  // =============================================
  //            INITIALIZATION
  // =============================================

  /**
   * Initialize allocation state for a specific game
   * Fetches all data from API
   */
  async initializeForGame(gameId: number): Promise<void> {
    this.currentGameId = gameId;

    // Fetch all aircraft
    await this.fetchAllAircraft(gameId);

    console.log(`✅ Allocation state initialized for game ${gameId}`);
  }

  /**
   * Fetch all aircraft and separate into pool and allocated
   */
  private async fetchAllAircraft(gameId: number): Promise<void> {
    this.loadingStates.update(state => ({ ...state, pool: true, allocations: true }));

    try {
      const allAircraft = await this.http.get<AircraftInstance[]>(
        `${this.baseUrl}/aircraft/game/${gameId}`
      ).pipe(
        catchError(error => {
          console.error('Failed to fetch aircraft:', error);
          return of([]);
        })
      ).toPromise();

      // Separate into pool (unallocated) and allocated
      const pool: AircraftInstance[] = [];
      const allocated: AircraftInstance[] = [];

      for (const aircraft of allAircraft || []) {
        if (aircraft.allocatedToTeamId === null) {
          pool.push(aircraft);
        } else {
          allocated.push(aircraft);
        }
      }

      this.aircraftPoolSignal.set(pool);
      this.allocatedAircraftSignal.set(allocated);
    } finally {
      this.loadingStates.update(state => ({ ...state, pool: false, allocations: false }));
    }
  }

  // =============================================
  //            WEBSOCKET EVENT HANDLERS
  // =============================================

  /**
   * Handle aircraft spawned event
   */
  private handleAircraftSpawned(aircraft: AircraftInstance): void {
    // Add to pool if unallocated, otherwise to allocated
    if (aircraft.allocatedToTeamId === null) {
      this.aircraftPoolSignal.update(pool => [...pool, aircraft]);
    } else {
      this.allocatedAircraftSignal.update(allocated => [...allocated, aircraft]);
    }
  }

  /**
   * Handle aircraft allocated event
   */
  private handleAircraftAllocated(aircraft: AircraftInstance): void {
    // Remove from pool
    this.aircraftPoolSignal.update(pool =>
      pool.filter(a => a.id !== aircraft.id)
    );

    // Add to allocated
    this.allocatedAircraftSignal.update(allocated => [...allocated, aircraft]);
  }

  /**
   * Handle aircraft deallocated event
   */
  private handleAircraftDeallocated(aircraft: AircraftInstance): void {
    // Remove from allocated
    this.allocatedAircraftSignal.update(allocated =>
      allocated.filter(a => a.id !== aircraft.id)
    );

    // Add back to pool
    this.aircraftPoolSignal.update(pool => [...pool, aircraft]);
  }

  /**
   * Handle aircraft removed event (GM deletion)
   */
  private handleAircraftRemoved(aircraftId: number): void {
    // Remove from both pool and allocated
    this.aircraftPoolSignal.update(pool =>
      pool.filter(a => a.id !== aircraftId)
    );
    this.allocatedAircraftSignal.update(allocated =>
      allocated.filter(a => a.id !== aircraftId)
    );
  }

  // =============================================
  //            PUBLIC API METHODS
  // =============================================

  /**
   * Get allocated aircraft for a specific team
   */
  getAllocatedAircraftForTeam(teamId: number): AircraftInstance[] {
    return this.allocatedAircraftByTeam().get(teamId) || [];
  }

  /**
   * Refresh all data from API
   */
  async refresh(): Promise<void> {
    if (this.currentGameId) {
      await this.initializeForGame(this.currentGameId);
    }
  }
}

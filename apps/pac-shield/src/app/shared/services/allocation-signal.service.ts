import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { WebSocketService } from './websocket.service';
import { AircraftInstance } from '../../generated/aircraftInstance/aircraftInstance.entity';
import { AircraftAllocation } from '../../generated/aircraftAllocation/aircraftAllocation.entity';
import { AllocationCycle } from '../../generated/allocationCycle/allocationCycle.entity';
import { environment } from '../../../environments/environment';

/**
 * Signal-based service for managing aircraft allocation state with real-time WebSocket updates
 * Pattern: Based on FosStateService structure with signals instead of NgRx
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

  /** All current allocations */
  private allocationsSignal = signal<AircraftAllocation[]>([]);

  /** Current allocation cycle */
  private currentCycleSignal = signal<AllocationCycle | null>(null);

  /** Loading states */
  private loadingStates = signal({
    pool: false,
    allocations: false,
    cycle: false,
  });

  // =============================================
  //            PUBLIC READONLY SIGNALS
  // =============================================

  /** Public readonly access to aircraft pool */
  readonly aircraftPool = this.aircraftPoolSignal.asReadonly();

  /** Public readonly access to allocations */
  readonly allocations = this.allocationsSignal.asReadonly();

  /** Public readonly access to current cycle */
  readonly currentCycle = this.currentCycleSignal.asReadonly();

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
    const allocations = this.allocationsSignal();
    const grouped = new Map<number, AircraftInstance[]>();

    for (const allocation of allocations) {
      const teamId = allocation.allocatedToTeamId;
      if (!grouped.has(teamId)) {
        grouped.set(teamId, []);
      }
      if (allocation.aircraftInstance) {
        grouped.get(teamId)!.push(allocation.aircraftInstance as AircraftInstance);
      }
    }

    return grouped;
  });

  /**
   * Aircraft counts by type and subtype
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
    return this.allocationsSignal().length;
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
    this.webSocketService.listen<AircraftAllocation>('aircraftAllocated')
      .pipe(takeUntilDestroyed())
      .subscribe(allocation => {
        console.log('✈️ Aircraft allocated:', allocation);
        this.handleAircraftAllocated(allocation);
      });

    // Aircraft deallocated
    this.webSocketService.listen<{ allocationId: number; aircraftCallSign: string }>('aircraftDeallocated')
      .pipe(takeUntilDestroyed())
      .subscribe(data => {
        console.log('🔄 Aircraft deallocated:', data.aircraftCallSign);
        this.handleAircraftDeallocated(data.allocationId);
      });

    // Aircraft removed (GM deleted)
    this.webSocketService.listen<{ aircraftId: number }>('aircraftRemoved')
      .pipe(takeUntilDestroyed())
      .subscribe(data => {
        console.log('🗑️ Aircraft removed:', data.aircraftId);
        this.handleAircraftRemoved(data.aircraftId);
      });

    // Allocation cycle created
    this.webSocketService.listen<AllocationCycle>('allocationCycleCreated')
      .pipe(takeUntilDestroyed())
      .subscribe(cycle => {
        console.log('📋 Allocation cycle created:', cycle);
        this.currentCycleSignal.set(cycle);
      });

    // Allocation cycle status changed
    this.webSocketService.listen<AllocationCycle>('allocationCycleStatusChanged')
      .pipe(takeUntilDestroyed())
      .subscribe(cycle => {
        console.log('📋 Allocation cycle status changed:', cycle.status);
        this.currentCycleSignal.set(cycle);
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

    // Fetch all data in parallel
    await Promise.all([
      this.fetchAircraftPool(gameId),
      this.fetchAllocations(gameId),
      this.fetchCurrentCycle(gameId),
    ]);

    console.log(`✅ Allocation state initialized for game ${gameId}`);
  }

  /**
   * Fetch aircraft pool from API
   */
  private async fetchAircraftPool(gameId: number): Promise<void> {
    this.loadingStates.update(state => ({ ...state, pool: true }));

    try {
      const pool = await this.http.get<AircraftInstance[]>(
        `${this.baseUrl}/aircraft/game/${gameId}`
      ).pipe(
        catchError(error => {
          console.error('Failed to fetch aircraft pool:', error);
          return of([]);
        })
      ).toPromise();

      // Filter to only available (unallocated) aircraft
      const availableAircraft = (pool || []).filter(
        a => a.allocationStatus === 'AVAILABLE'
      );

      this.aircraftPoolSignal.set(availableAircraft);
    } finally {
      this.loadingStates.update(state => ({ ...state, pool: false }));
    }
  }

  /**
   * Fetch allocations from API
   */
  private async fetchAllocations(gameId: number): Promise<void> {
    this.loadingStates.update(state => ({ ...state, allocations: true }));

    try {
      // Get latest cycle first
      const cycle = await this.http.get<AllocationCycle | null>(
        `${this.baseUrl}/cycles/game/${gameId}/latest`
      ).pipe(
        catchError(error => {
          console.error('Failed to fetch cycle for allocations:', error);
          return of(null);
        })
      ).toPromise();

      if (cycle) {
        const allocations = await this.http.get<AircraftAllocation[]>(
          `${this.baseUrl}/allocations/cycle/${cycle.id}`
        ).pipe(
          catchError(error => {
            console.error('Failed to fetch allocations:', error);
            return of([]);
          })
        ).toPromise();

        this.allocationsSignal.set(allocations || []);
      }
    } finally {
      this.loadingStates.update(state => ({ ...state, allocations: false }));
    }
  }

  /**
   * Fetch current allocation cycle from API
   */
  private async fetchCurrentCycle(gameId: number): Promise<void> {
    this.loadingStates.update(state => ({ ...state, cycle: true }));

    try {
      const cycle = await this.http.get<AllocationCycle | null>(
        `${this.baseUrl}/cycles/game/${gameId}/latest`
      ).pipe(
        catchError(error => {
          console.error('Failed to fetch current cycle:', error);
          return of(null);
        })
      ).toPromise();

      this.currentCycleSignal.set(cycle || null);
    } finally {
      this.loadingStates.update(state => ({ ...state, cycle: false }));
    }
  }

  // =============================================
  //            WEBSOCKET EVENT HANDLERS
  // =============================================

  /**
   * Handle aircraft spawned event
   */
  private handleAircraftSpawned(aircraft: AircraftInstance): void {
    // Add to pool if available
    if (aircraft.allocationStatus === 'AVAILABLE') {
      this.aircraftPoolSignal.update(pool => [...pool, aircraft]);
    }
  }

  /**
   * Handle aircraft allocated event
   */
  private handleAircraftAllocated(allocation: AircraftAllocation): void {
    // Add to allocations
    this.allocationsSignal.update(allocs => [...allocs, allocation]);

    // Remove from available pool
    this.aircraftPoolSignal.update(pool =>
      pool.filter(a => a.id !== allocation.aircraftInstanceId)
    );
  }

  /**
   * Handle aircraft deallocated event
   */
  private handleAircraftDeallocated(allocationId: number): void {
    // Find the allocation being removed
    const allocation = this.allocationsSignal().find(a => a.id === allocationId);

    // Remove from allocations
    this.allocationsSignal.update(allocs =>
      allocs.filter(a => a.id !== allocationId)
    );

    // Add back to pool if aircraft instance exists
    if (allocation?.aircraftInstance) {
      const aircraft = allocation.aircraftInstance as AircraftInstance;
      this.aircraftPoolSignal.update(pool => [...pool, aircraft]);
    }
  }

  /**
   * Handle aircraft removed event (GM deletion)
   */
  private handleAircraftRemoved(aircraftId: number): void {
    // Remove from pool
    this.aircraftPoolSignal.update(pool =>
      pool.filter(a => a.id !== aircraftId)
    );

    // Also remove any allocations (shouldn't happen, but just in case)
    this.allocationsSignal.update(allocs =>
      allocs.filter(a => a.aircraftInstanceId !== aircraftId)
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

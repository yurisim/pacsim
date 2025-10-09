import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { WebSocketService } from './websocket.service';
import { environment } from '../../../environments/environment';

interface AllocationTableRow {
  id: number;
  callSign: string;
  aircraftType: string;
  isAllocated: boolean;
  allocatedToTeamName: string | null;
  status: 'FMC' | 'DESTROYED';
}

interface AllocationTable {
  c130Arrow: AllocationTableRow[];
  c17Moose: AllocationTableRow[];
  c5Bosco: AllocationTableRow[];
}

@Injectable({ providedIn: 'root' })
export class AllocationStateService {
  private http = inject(HttpClient);
  private websocket = inject(WebSocketService);

  // State signals
  allocationTable = signal<AllocationTable | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed signals
  c130Aircraft = computed(() => this.allocationTable()?.c130Arrow ?? []);
  c17Aircraft = computed(() => this.allocationTable()?.c17Moose ?? []);
  c5Aircraft = computed(() => this.allocationTable()?.c5Bosco ?? []);

  constructor() {
    // Listen to WebSocket updates
    this.websocket.listen<{payload: AllocationTable}>('allocationTableUpdated')
      .subscribe(data => {
        if (data.payload) {
          this.allocationTable.set(data.payload);
        }
      });
  }

  loadAllocationTable(gameId: number) {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<AllocationTable>(`${environment.apiUrl}/allocation/table/${gameId}`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: data => this.allocationTable.set(data),
        error: err => this.error.set(err.message || 'Failed to load allocation table')
      });
  }

  allocateAircraft(aircraftId: number, teamId: number) {
    return this.http.put(`${environment.apiUrl}/allocation/aircraft/${aircraftId}/allocate`, { teamId });
  }

  deallocateAircraft(aircraftId: number) {
    return this.http.put(`${environment.apiUrl}/allocation/aircraft/${aircraftId}/deallocate`, {});
  }

  reset() {
    this.allocationTable.set(null);
    this.loading.set(false);
    this.error.set(null);
  }
}

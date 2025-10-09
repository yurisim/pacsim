import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { WebSocketService } from './websocket.service';
import { environment } from '../../../environments/environment';
import { ATOLine } from '../../generated/aTOLine/aTOLine.entity';
import { CreateATOLineDto } from '../../generated/aTOLine/create-aTOLine.dto';
import { UpdateATOLineDto } from '../../generated/aTOLine/update-aTOLine.dto';

@Injectable({ providedIn: 'root' })
export class AtoStateService {
  private http = inject(HttpClient);
  private websocket = inject(WebSocketService);

  // State signals
  atoLines = signal<ATOLine[]>([]);
  pprQueue = signal<ATOLine[]>([]);
  selectedAtoLine = signal<ATOLine | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed signals
  approvedLines = computed(() =>
    this.atoLines().filter(line => line.pprStatus === 'APPROVED')
  );
  pendingLines = computed(() =>
    this.atoLines().filter(line => line.pprStatus === 'PENDING')
  );

  constructor() {
    // Listen to WebSocket updates for ATO line changes
    this.websocket.listen<{line: ATOLine}>('atoLineUpdated')
      .subscribe(data => {
        if (data.line) {
          this.updateAtoLineInList(data.line);
        }
      });

    this.websocket.listen<{line: ATOLine}>('atoLineCreated')
      .subscribe(data => {
        if (data.line) {
          this.atoLines.update(list => [...list, data.line]);
        }
      });

    this.websocket.listen<{id: number}>('atoLineDeleted')
      .subscribe(data => {
        if (data.id) {
          this.atoLines.update(list => list.filter(line => line.id !== data.id));
          if (this.selectedAtoLine()?.id === data.id) {
            this.selectedAtoLine.set(null);
          }
        }
      });

    this.websocket.listen<{line: ATOLine}>('pprStatusChanged')
      .subscribe(data => {
        if (data.line) {
          this.updateAtoLineInList(data.line);
          this.updatePprQueue();
        }
      });
  }

  loadAtoLines(gameId: number) {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<ATOLine[]>(`${environment.apiUrl}/ato`, { params: { gameId: gameId.toString() } })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: data => {
          this.atoLines.set(data);
          this.updatePprQueue();
        },
        error: err => this.error.set(err.message || 'Failed to load ATO lines')
      });
  }

  loadPprQueue(gameId: number) {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<ATOLine[]>(`${environment.apiUrl}/ato/ppr-queue`, { params: { gameId: gameId.toString() } })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: data => this.pprQueue.set(data),
        error: err => this.error.set(err.message || 'Failed to load PPR queue')
      });
  }

  createAtoLine(flightPlan: CreateATOLineDto) {
    return this.http.post<ATOLine>(`${environment.apiUrl}/ato`, flightPlan);
  }

  updateAtoLine(id: number, updates: UpdateATOLineDto) {
    return this.http.patch<ATOLine>(`${environment.apiUrl}/ato/${id}`, updates);
  }

  deleteAtoLine(id: number) {
    return this.http.delete(`${environment.apiUrl}/ato/${id}`);
  }

  approvePpr(id: number) {
    return this.http.patch<ATOLine>(`${environment.apiUrl}/ato/${id}/approve-ppr`, {});
  }

  denyPpr(id: number) {
    return this.http.patch<ATOLine>(`${environment.apiUrl}/ato/${id}/deny-ppr`, {});
  }

  bulkApprovePpr(gameId: number, atoLineIds?: number[]) {
    const body = atoLineIds ? { atoLineIds } : {};
    return this.http.post<ATOLine[]>(`${environment.apiUrl}/ato/bulk-approve-ppr`, {
      gameId,
      ...body
    });
  }

  selectAtoLine(line: ATOLine | null) {
    this.selectedAtoLine.set(line);
  }

  private updateAtoLineInList(updatedLine: ATOLine) {
    this.atoLines.update(list =>
      list.map(line => line.id === updatedLine.id ? updatedLine : line)
    );

    if (this.selectedAtoLine()?.id === updatedLine.id) {
      this.selectedAtoLine.set(updatedLine);
    }
  }

  private updatePprQueue() {
    const pending = this.atoLines().filter(line => line.pprStatus === 'PENDING');
    this.pprQueue.set(pending);
  }

  reset() {
    this.atoLines.set([]);
    this.pprQueue.set([]);
    this.selectedAtoLine.set(null);
    this.loading.set(false);
    this.error.set(null);
  }
}

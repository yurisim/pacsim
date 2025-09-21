import { Injectable, inject } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';

/**
 * Service: FOS Tasks API wrapper with simple in-memory caching.
 *
 * Endpoints used:
 * - GET /fos/:id/tasks
 * - PATCH /fos/:id/tasks  body: { task, completed }
 */

export interface FosTaskItem {
  task: string;          // canonical task key/label
  completed: boolean;    // completion status
  updatedAt?: string;
  updatedBy?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FosTasksService {
  private api = inject(ApiService);

  // Cache by fosId
  private cache = new Map<string, FosTaskItem[]>();

  private key(fosId: string) {
    return `fos:${fosId}:tasks`;
  }

  getTasks(fosId: string, useCache = true): Observable<FosTaskItem[]> {
    const k = this.key(fosId);
    if (useCache && this.cache.has(k)) {
      return of(this.cache.get(k)!);
    }
    return this.api.get<FosTaskItem[]>(`fos/${fosId}/tasks`).pipe(
      tap((items) => this.cache.set(k, items))
    );
  }

  /**
   * Toggle or set a task completion value.
   * Backend expects { task, completed }
   */
  updateTask(fosId: string, task: string, completed: boolean): Observable<FosTaskItem[]> {
    return this.api.patch<FosTaskItem[]>(`fos/${fosId}/tasks`, { task, completed }).pipe(
      tap((updated) => {
        // Replace cache for this FOS
        this.cache.set(this.key(fosId), updated);
      })
    );
  }

  invalidate(fosId: string): void {
    this.cache.delete(this.key(fosId));
  }

  clearAll(): void {
    this.cache.clear();
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ForwardOperatingSite } from '../../generated';

@Injectable({
  providedIn: 'root'
})
export class FosStateService {
  private webSocketService = inject(WebSocketService);

  // Signal to hold the current FOS state
  private fosListSignal = signal<ForwardOperatingSite[]>([]);

  // Public readonly signal for components to subscribe to
  public fosList = this.fosListSignal.asReadonly();

  // Computed signal for active FOS IDs
  public activeFosIds = signal(new Set<string>());

  constructor() {
    // Listen for FOS list updates from the WebSocket
    this.webSocketService.listen<ForwardOperatingSite[]>('fosListUpdate')
      .pipe(takeUntilDestroyed())
      .subscribe(fosList => {
        this.fosListSignal.set(fosList);
        this.updateActiveFosIds(fosList);
      });
  }

  /**
   * Update the active FOS IDs set based on the current FOS list
   */
  private updateActiveFosIds(fosList: ForwardOperatingSite[]): void {
    const activeIds = new Set<string>();
    fosList.forEach(fos => {
      if (fos.isActive && fos.fosIdNumber) {
        // Convert fosIdNumber to the string format used by markers (e.g., 'fos-01')
        const fosId = `fos-${fos.fosIdNumber.toString().padStart(2, '0')}`;
        activeIds.add(fosId);
      }
    });
    this.activeFosIds.set(activeIds);
  }

  /**
   * Get FOS data by fosIdNumber
   */
  getFosById(fosIdNumber: number): ForwardOperatingSite | undefined {
    return this.fosListSignal().find(fos => fos.fosIdNumber === fosIdNumber);
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
  numberToFosId(fosIdNumber: number): string {
    return `fos-${fosIdNumber.toString().padStart(2, '0')}`;
  }
}
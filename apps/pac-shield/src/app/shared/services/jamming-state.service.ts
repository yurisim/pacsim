import { Injectable, signal, computed } from '@angular/core';

export interface JammingState {
  isJammed: boolean;
  jammedServices: Set<string>; // Specific services that are jammed
  startTime?: Date;
  estimatedDuration?: number; // in minutes
}

// Define service types that can be jammed
export const JAMMABLE_SERVICES = {
  FOS_API: 'fos-api',           // /api/fos endpoints
  PLAYER_API: 'player-api',     // /api/player endpoints
  GAME_API: 'game-api',         // /api/game endpoints
  WEBSOCKET: 'websocket',       // Real-time updates
  INTEL_API: 'intel-api',       // Intelligence data
  LOGISTICS_API: 'logistics-api' // Supply chain data
} as const;

export type JammableService = typeof JAMMABLE_SERVICES[keyof typeof JAMMABLE_SERVICES];

@Injectable({
  providedIn: 'root'
})
export class JammingStateService {
  private jammingStateSignal = signal<JammingState>({
    isJammed: false,
    jammedServices: new Set<string>()
  });

  // Public readonly signal for components to subscribe to
  public jammingState = this.jammingStateSignal.asReadonly();

  // Computed signals for common checks
  public isJammed = computed(() => this.jammingState().isJammed);
  public jammedServices = computed(() => this.jammingState().jammedServices);

  /**
   * Activate synthetic jamming for specific services
   */
  jamServices(services: JammableService[], duration?: number): void {
    const jammedServices = new Set(services);

    this.jammingStateSignal.set({
      isJammed: true,
      jammedServices,
      startTime: new Date(),
      estimatedDuration: duration
    });

    console.log(`🔶 SYNTHETIC JAMMING ACTIVATED - Services: ${services.join(', ')}`);

    // Auto-deactivate after duration if specified
    if (duration) {
      setTimeout(() => {
        this.deactivateJamming();
      }, duration * 60 * 1000); // Convert minutes to milliseconds
    }
  }

  /**
   * Deactivate synthetic jamming
   */
  deactivateJamming(): void {
    this.jammingStateSignal.set({
      isJammed: false,
      jammedServices: new Set<string>()
    });

    console.log('🟢 SYNTHETIC JAMMING DEACTIVATED - All services restored');
  }

  /**
   * Check if a specific service is jammed
   */
  isServiceJammed(service: JammableService): boolean {
    const state = this.jammingState();
    return state.isJammed && state.jammedServices.has(service);
  }

  /**
   * Add additional services to existing jamming
   */
  addJammedServices(services: JammableService[]): void {
    const current = this.jammingState();
    if (!current.isJammed) return;

    const newJammedServices = new Set([...current.jammedServices, ...services]);

    this.jammingStateSignal.set({
      ...current,
      jammedServices: newJammedServices
    });

    console.log(`🔶 ADDITIONAL SERVICES JAMMED: ${services.join(', ')}`);
  }

  /**
   * Remove specific services from jamming
   */
  removeJammedServices(services: JammableService[]): void {
    const current = this.jammingState();
    if (!current.isJammed) return;

    const newJammedServices = new Set(current.jammedServices);
    services.forEach(service => newJammedServices.delete(service));

    if (newJammedServices.size === 0) {
      this.deactivateJamming();
    } else {
      this.jammingStateSignal.set({
        ...current,
        jammedServices: newJammedServices
      });
    }

    console.log(`🟡 SERVICES RESTORED: ${services.join(', ')}`);
  }

  /**
   * Get current jamming status for debugging/display
   */
  getJammingStatus(): string {
    const state = this.jammingState();
    if (!state.isJammed) {
      return 'Communications: NORMAL';
    }

    const elapsed = state.startTime ?
      Math.floor((Date.now() - state.startTime.getTime()) / (1000 * 60)) : 0;

    const jammedCount = state.jammedServices.size;
    const servicesList = Array.from(state.jammedServices).join(', ');

    return `Communications: ${jammedCount} SERVICES JAMMED - ${elapsed}min elapsed\nJammed: ${servicesList}`;
  }

  /**
   * Get list of currently jammed services
   */
  getJammedServicesList(): JammableService[] {
    return Array.from(this.jammingState().jammedServices) as JammableService[];
  }

  /**
   * Get list of available (non-jammed) services
   */
  getAvailableServicesList(): JammableService[] {
    const jammed = this.jammingState().jammedServices;
    return Object.values(JAMMABLE_SERVICES).filter(service => !jammed.has(service));
  }
}
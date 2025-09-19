import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { JammingStateService, JAMMABLE_SERVICES, JammableService } from '../services/jamming-state.service';
import { FosStateService } from '../services/fos-state.service';
import { LocalStorageService } from '../services/local-storage.service';

@Component({
  selector: 'app-jamming-debug',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <mat-card class="jamming-debug-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>settings_remote</mat-icon>
          Synthetic Jamming Control
        </mat-card-title>
      </mat-card-header>

      <mat-card-content class="space-y-4">
        <!-- Status Display -->
        <div class="status-section p-3 rounded"
             [class.bg-green-100]="!jammingState().isJammed"
             [class.bg-red-100]="jammingState().isJammed">
          <div class="font-medium text-sm">{{ jammingStateService.getJammingStatus() }}</div>
          @if (jammingState().isJammed) {
            <div class="text-xs mt-1">
              Available Services: {{ jammingStateService.getAvailableServicesList().length }}/{{ getAllServices().length }}
            </div>
            @if (jammingState().estimatedDuration) {
              <div class="text-xs">
                Estimated Duration: {{ jammingState().estimatedDuration }} minutes
              </div>
            }
          }
        </div>

        <!-- FOS Cache Info -->
        <div class="cache-info p-3 bg-blue-50 rounded">
          <div class="font-medium mb-2">FOS Cache Status</div>
          <div class="text-sm space-y-1">
            <div>Has Cache: {{ fosStateService.getCacheInfo().hasCache ? 'Yes' : 'No' }}</div>
            @if (fosStateService.getCacheInfo().age !== undefined) {
              <div>Cache Age: {{ fosStateService.getCacheInfo().age }} minutes</div>
            }
            <div>FOSs Loaded: {{ fosStateService.fosList().length }}</div>
            <div>Active FOSs: {{ fosStateService.activeFosIds().size }}</div>
          </div>
        </div>

        <!-- Service Controls -->
        <div class="controls-section space-y-3">
          <div class="text-sm font-medium">Service-Specific Jamming</div>

          <div class="grid grid-cols-1 gap-1 text-xs">
            @for (service of getAllServices(); track service) {
              <div class="flex items-center justify-between p-2 rounded"
                   [class.bg-red-50]="isServiceJammed(service)"
                   [class.bg-green-50]="!isServiceJammed(service)">
                <span>{{ getServiceDisplayName(service) }}</span>
                <button
                  matButton="outlined"
                  [color]="isServiceJammed(service) ? 'primary' : 'warn'"
                  (click)="toggleService(service)"
                  class="!min-w-0 !px-2 !py-1 !text-xs">
                  {{ isServiceJammed(service) ? 'Restore' : 'Jam' }}
                </button>
              </div>
            }
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button
              matButton="outlined"
              color="warn"
              (click)="jamCriticalServices()"
              [disabled]="jammingState().isJammed">
              <mat-icon>warning</mat-icon>
              Jam Critical
            </button>

            <button
              matButton="outlined"
              color="primary"
              (click)="deactivateJamming()"
              [disabled]="!jammingState().isJammed">
              <mat-icon>signal_cellular_4_bar</mat-icon>
              Restore All
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button
              matButton="outlined"
              (click)="forceRefresh()">
              <mat-icon>refresh</mat-icon>
              Force Refresh
            </button>

            <button
              matButton="outlined"
              color="accent"
              (click)="clearCache()">
              <mat-icon>delete</mat-icon>
              Clear Cache
            </button>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .jamming-debug-card {
      max-width: 400px;
      margin: 1rem;
    }

    .space-y-4 > * + * {
      margin-top: 1rem;
    }

    .space-y-3 > * + * {
      margin-top: 0.75rem;
    }

    .space-y-1 > * + * {
      margin-top: 0.25rem;
    }
  `]
})
export class JammingDebugComponent {
  jammingStateService = inject(JammingStateService);
  fosStateService = inject(FosStateService);
  localStorageService = inject(LocalStorageService);

  jammingState = this.jammingStateService.jammingState;

  getAllServices(): JammableService[] {
    return Object.values(JAMMABLE_SERVICES);
  }

  isServiceJammed(service: JammableService): boolean {
    return this.jammingStateService.isServiceJammed(service);
  }

  getServiceDisplayName(service: JammableService): string {
    const names: Record<JammableService, string> = {
      [JAMMABLE_SERVICES.FOS_API]: 'FOS API',
      [JAMMABLE_SERVICES.PLAYER_API]: 'Player API',
      [JAMMABLE_SERVICES.GAME_API]: 'Game API',
      [JAMMABLE_SERVICES.WEBSOCKET]: 'WebSocket',
      [JAMMABLE_SERVICES.INTEL_API]: 'Intel API',
      [JAMMABLE_SERVICES.LOGISTICS_API]: 'Logistics API'
    };
    return names[service] || service;
  }

  toggleService(service: JammableService): void {
    if (this.isServiceJammed(service)) {
      this.jammingStateService.removeJammedServices([service]);
    } else {
      if (!this.jammingState().isJammed) {
        // Start jamming with this service
        this.jammingStateService.jamServices([service], 10);
      } else {
        // Add to existing jamming
        this.jammingStateService.addJammedServices([service]);
      }
    }
  }

  jamCriticalServices(): void {
    this.jammingStateService.jamServices([
      JAMMABLE_SERVICES.FOS_API,
      JAMMABLE_SERVICES.WEBSOCKET
    ], 10);
  }

  deactivateJamming(): void {
    this.jammingStateService.deactivateJamming();
  }

  async forceRefresh(): Promise<void> {
    try {
      await this.fosStateService.forceRefresh();
      console.log('Force refresh completed');
    } catch (error) {
      console.error('Force refresh failed:', error);
    }
  }

  clearCache(): void {
    this.fosStateService.clearCache();
  }

  showCacheStats(): void {
    const stats = this.localStorageService.getCacheStats();
    console.log('Cache Statistics:', stats);
    alert(`Cache Stats:\nTotal Entries: ${stats.totalEntries}\nTotal Size: ${stats.totalSize} characters\nGames: ${Object.keys(stats.entriesByGame).join(', ')}`);
  }
}
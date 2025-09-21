import { Component, Input, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Country, AccessStatus, country, accessStatus } from '../../../generated/enums';
import { WebSocketService } from '../../../shared/services/websocket.service';
import { CountryOverlayService } from '../services/country-overlay.service';

interface FOSReference {
  id: string;
  number: number;
  name: string;
  color: 'green' | 'yellow' | 'red';
  coordinates: [number, number];
  isOccupied: boolean;
  occupiedByTeam?: string;
  activationTurn?: number;
}

interface PoliticalAccessCard {
  country: Country;
  countryDisplayName: string;
  flagEmoji: string;
  access: AccessStatus;
  overflight: AccessStatus;
  diceRoll: number;
  fosSites: FOSReference[];
  fosCount: number;
  fosOccupied: number;
  occupancyRate: number;
  lastUpdated: Date;
}

interface AccessStatusOption {
  value: AccessStatus;
  label: string;
  icon: string;
  colorClass: string;
}

@Component({
  selector: 'app-political-access',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatToolbarModule,
    MatGridListModule,
    MatTooltipModule,
    MatBadgeModule,
    ReactiveFormsModule
  ],
  templateUrl: './political-access.component.html',
  styleUrls: ['./political-access.component.scss']
})
export class PoliticalAccessComponent implements OnInit {
  @Input() gameId: number | null = null;
  @Input() isReadOnly = false;

  // Injected services
  private webSocketService = inject(WebSocketService);
  private countryOverlayService = inject(CountryOverlayService);

  // Country flag emoji mapping
  private readonly countryFlags: Record<Country, string> = {
    'JAPAN': '🇯🇵',
    'PHILIPPINES': '🇵🇭',
    'INDONESIA': '🇮🇩',
    'BRUNEI': '🇧🇳',
    'SINGAPORE': '🇸🇬',
    'MALAYSIA': '🇲🇾',
    'THAILAND': '🇹🇭',
    'CAMBODIA': '🇰🇭',
    'VIETNAM': '🇻🇳',
    'LAOS': '🇱🇦',
    'INDIA': '🇮🇳'
  };

  // FOS assignments by country (matching static-locations.config.ts)
  private readonly countryFOS: Record<Country, FOSReference[]> = {
    'JAPAN': [
      { id: 'fos-01', number: 1, name: 'FOS 1', color: 'green', coordinates: [139.5, 35.5], isOccupied: true, occupiedByTeam: 'CAOC' },
      { id: 'fos-02', number: 2, name: 'FOS 2', color: 'green', coordinates: [140.5, 36.5], isOccupied: true, occupiedByTeam: 'MOB_KADENA' },
      { id: 'fos-03', number: 3, name: 'FOS 3', color: 'green', coordinates: [141.0, 38.5], isOccupied: true, occupiedByTeam: 'MOB_YOKOTA' },
      { id: 'fos-04', number: 4, name: 'FOS 4', color: 'green', coordinates: [140.0, 40.5], isOccupied: false },
      { id: 'fos-05', number: 5, name: 'FOS 5', color: 'green', coordinates: [130.5, 33.5], isOccupied: false }
    ],
    'PHILIPPINES': [
      { id: 'fos-06', number: 6, name: 'FOS 6', color: 'green', coordinates: [121.0, 15.5], isOccupied: true, occupiedByTeam: 'CAOC' },
      { id: 'fos-07', number: 7, name: 'FOS 7', color: 'yellow', coordinates: [123.0, 13.5], isOccupied: false },
      { id: 'fos-08', number: 8, name: 'FOS 8', color: 'green', coordinates: [124.5, 11.5], isOccupied: true, occupiedByTeam: 'MOB_ANDERSEN' },
      { id: 'fos-09', number: 9, name: 'FOS 9', color: 'red', coordinates: [126.0, 7.5], isOccupied: false },
      { id: 'fos-10', number: 10, name: 'FOS 10', color: 'yellow', coordinates: [118.8, 9.8], isOccupied: false }
    ],
    'INDONESIA': [
      { id: 'fos-11', number: 11, name: 'FOS 11', color: 'green', coordinates: [135.0, -4.0], isOccupied: false },
      { id: 'fos-12', number: 12, name: 'FOS 12', color: 'red', coordinates: [122.0, 0.5], isOccupied: false },
      { id: 'fos-15', number: 15, name: 'FOS 15', color: 'green', coordinates: [114.0, 0.0], isOccupied: true, occupiedByTeam: 'CSPOC' },
      { id: 'fos-16', number: 16, name: 'FOS 16', color: 'green', coordinates: [112.0, -2.0], isOccupied: false },
      { id: 'fos-17', number: 17, name: 'FOS 17', color: 'green', coordinates: [113.5, -8.0], isOccupied: false },
      { id: 'fos-18', number: 18, name: 'FOS 18', color: 'yellow', coordinates: [115.5, -8.5], isOccupied: false },
      { id: 'fos-19', number: 19, name: 'FOS 19', color: 'red', coordinates: [106.0, -6.5], isOccupied: false },
      { id: 'fos-20', number: 20, name: 'FOS 20', color: 'green', coordinates: [107.0, -6.5], isOccupied: false },
      { id: 'fos-21', number: 21, name: 'FOS 21', color: 'green', coordinates: [105.0, -5.0], isOccupied: false }
    ],
    'BRUNEI': [
      { id: 'fos-13', number: 13, name: 'FOS 13', color: 'yellow', coordinates: [114.5, 4.5], isOccupied: false },
      { id: 'fos-14', number: 14, name: 'FOS 14', color: 'yellow', coordinates: [115.0, 4.8], isOccupied: false }
    ],
    'SINGAPORE': [
      { id: 'fos-22', number: 22, name: 'FOS 22', color: 'green', coordinates: [103.8, 1.3], isOccupied: true, occupiedByTeam: 'CAOC' }
    ],
    'MALAYSIA': [
      { id: 'fos-23', number: 23, name: 'FOS 23', color: 'green', coordinates: [102.0, 2.5], isOccupied: false },
      { id: 'fos-24', number: 24, name: 'FOS 24', color: 'yellow', coordinates: [103.5, 3.5], isOccupied: false }
    ],
    'THAILAND': [
      { id: 'fos-25', number: 25, name: 'FOS 25', color: 'yellow', coordinates: [99.5, 8.5], isOccupied: false },
      { id: 'fos-26', number: 26, name: 'FOS 26', color: 'red', coordinates: [100.5, 7.0], isOccupied: false },
      { id: 'fos-30', number: 30, name: 'FOS 30', color: 'green', coordinates: [100.5, 13.7], isOccupied: false },
      { id: 'fos-32', number: 32, name: 'FOS 32', color: 'yellow', coordinates: [99.0, 14.0], isOccupied: false },
      { id: 'fos-33', number: 33, name: 'FOS 33', color: 'green', coordinates: [102.0, 15.0], isOccupied: false },
      { id: 'fos-34', number: 34, name: 'FOS 34', color: 'red', coordinates: [103.0, 16.5], isOccupied: false }
    ],
    'CAMBODIA': [
      { id: 'fos-29', number: 29, name: 'FOS 29', color: 'yellow', coordinates: [104.5, 11.5], isOccupied: false }
    ],
    'VIETNAM': [
      { id: 'fos-27', number: 27, name: 'FOS 27', color: 'green', coordinates: [106.0, 10.5], isOccupied: false },
      { id: 'fos-28', number: 28, name: 'FOS 28', color: 'yellow', coordinates: [107.0, 10.8], isOccupied: false },
      { id: 'fos-31', number: 31, name: 'FOS 31', color: 'green', coordinates: [108.2, 16.0], isOccupied: false },
      { id: 'fos-36', number: 36, name: 'FOS 36', color: 'yellow', coordinates: [106.0, 20.5], isOccupied: false },
      { id: 'fos-37', number: 37, name: 'FOS 37', color: 'green', coordinates: [105.8, 21.0], isOccupied: false }
    ],
    'LAOS': [
      { id: 'fos-35', number: 35, name: 'FOS 35', color: 'red', coordinates: [102.5, 18.0], isOccupied: false }
    ],
    'INDIA': [
      { id: 'fos-38', number: 38, name: 'FOS 38', color: 'yellow', coordinates: [92.5, 24.0], isOccupied: false },
      { id: 'fos-39', number: 39, name: 'FOS 39', color: 'green', coordinates: [88.8, 22.5], isOccupied: false },
      { id: 'fos-40', number: 40, name: 'FOS 40', color: 'yellow', coordinates: [88.0, 21.7], isOccupied: false },
      { id: 'fos-41', number: 41, name: 'FOS 41', color: 'yellow', coordinates: [80.0, 13.0], isOccupied: false },
      { id: 'fos-42', number: 42, name: 'FOS 42', color: 'green', coordinates: [73.8, 15.5], isOccupied: false },
      { id: 'fos-43', number: 43, name: 'FOS 43', color: 'green', coordinates: [75.0, 13.0], isOccupied: false },
      { id: 'fos-44', number: 44, name: 'FOS 44', color: 'yellow', coordinates: [77.5, 8.5], isOccupied: false },
      { id: 'fos-45', number: 45, name: 'FOS 45', color: 'green', coordinates: [77.0, 8.7], isOccupied: false }
    ]
  };

  // Access status options with styling
  readonly accessOptions: AccessStatusOption[] = [
    {
      value: 'FULL_ACCESS',
      label: 'Full Access',
      icon: 'check_circle',
      colorClass: 'text-md-primary border-md-primary'
    },
    {
      value: 'OVERFLIGHT_ONLY',
      label: 'Overflight Only',
      icon: 'flight',
      colorClass: 'text-md-tertiary border-md-tertiary'
    },
    {
      value: 'NO_ACCESS',
      label: 'No Access',
      icon: 'block',
      colorClass: 'text-md-error border-md-error'
    }
  ];

  // Signal for country access data
  countryAccess = signal<PoliticalAccessCard[]>([]);

  // Computed values for UI
  totalCountries = computed(() => this.countryAccess().length);
  fullAccessCount = computed(() =>
    this.countryAccess().filter(c => c.access === 'FULL_ACCESS').length
  );
  overflightOnlyCount = computed(() =>
    this.countryAccess().filter(c => c.access === 'OVERFLIGHT_ONLY').length
  );
  noAccessCount = computed(() =>
    this.countryAccess().filter(c => c.access === 'NO_ACCESS').length
  );

  ngOnInit(): void {
    this.initializeCountryData();
  }

  private initializeCountryData(): void {
    // Initialize with default data - in real implementation, this would come from API
    const defaultCountryData: PoliticalAccessCard[] = country.map(countryCode => {
      const fosSites = this.countryFOS[countryCode] || [];
      const fosOccupied = fosSites.filter(fos => fos.isOccupied).length;

      return {
        country: countryCode,
        countryDisplayName: this.formatCountryName(countryCode),
        flagEmoji: this.countryFlags[countryCode],
        access: 'NO_ACCESS' as AccessStatus,
        overflight: 'NO_ACCESS' as AccessStatus,
        diceRoll: this.rollDice(),
        fosSites: fosSites,
        fosCount: fosSites.length,
        fosOccupied: fosOccupied,
        occupancyRate: fosSites.length > 0 ? fosOccupied / fosSites.length : 0,
        lastUpdated: new Date()
      };
    });

    this.countryAccess.set(defaultCountryData);
  }

  private formatCountryName(countryCode: Country): string {
    return countryCode.toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private rollDice(): number {
    return Math.floor(Math.random() * 20) + 1;
  }

  onAccessChange(countryCode: Country, accessType: 'access' | 'overflight', newAccess: AccessStatus): void {
    if (this.isReadOnly) return;

    const currentData = this.countryAccess();
    const updatedData = currentData.map(country =>
      country.country === countryCode
        ? {
            ...country,
            [accessType]: newAccess,
            lastUpdated: new Date()
          }
        : country
    );

    this.countryAccess.set(updatedData);

    // Update overlay service if it's the main access level
    if (accessType === 'access') {
      this.countryOverlayService.updateCountryAccess(countryCode, newAccess);
    }

    // Emit WebSocket event
    this.emitCountryAccessChange(countryCode, accessType, newAccess);

    this.saveToBackend(countryCode, accessType, newAccess);
  }

  rerollDice(countryCode: Country): void {
    if (this.isReadOnly) return;

    const currentData = this.countryAccess();
    const updatedData = currentData.map(country =>
      country.country === countryCode
        ? {
            ...country,
            diceRoll: this.rollDice(),
            lastUpdated: new Date()
          }
        : country
    );

    this.countryAccess.set(updatedData);
    this.saveDiceRollToBackend(countryCode, updatedData.find(c => c.country === countryCode)!.diceRoll);
  }

  rerollAllDice(): void {
    if (this.isReadOnly) return;

    const currentData = this.countryAccess();
    const updatedData = currentData.map(country => ({
      ...country,
      diceRoll: this.rollDice(),
      lastUpdated: new Date()
    }));

    this.countryAccess.set(updatedData);
    this.saveAllDiceRollsToBackend(updatedData);
  }

  setAllAccess(accessLevel: AccessStatus): void {
    if (this.isReadOnly) return;

    const currentData = this.countryAccess();
    const updatedData: PoliticalAccessCard[] = currentData.map(country => ({
      ...country,
      access: accessLevel,
      overflight: accessLevel === 'FULL_ACCESS' ? 'FULL_ACCESS' as AccessStatus : accessLevel,
      lastUpdated: new Date()
    }));

    this.countryAccess.set(updatedData);

    // Update overlay service for all countries
    updatedData.forEach(country => {
      this.countryOverlayService.updateCountryAccess(country.country, accessLevel);
    });

    // Emit bulk WebSocket event
    this.emitBulkAccessChange(accessLevel);

    this.saveBulkAccessToBackend(accessLevel);
  }

  getAccessOption(accessValue: AccessStatus): AccessStatusOption {
    return this.accessOptions.find(option => option.value === accessValue) || this.accessOptions[2];
  }

  getCountryAccessControl(countryCode: Country, accessType: 'access' | 'overflight'): FormControl {
    const country = this.countryAccess().find(c => c.country === countryCode);
    return new FormControl(country?.[accessType] || 'NO_ACCESS');
  }

  private saveToBackend(countryCode: Country, accessType: 'access' | 'overflight', newAccess: AccessStatus): void {
    // TODO: Implement WebSocket/HTTP API call to save political access changes
    console.log(`Saving ${accessType} change for ${countryCode}: ${newAccess}`);
  }

  private saveDiceRollToBackend(countryCode: Country, diceRoll: number): void {
    // TODO: Implement WebSocket/HTTP API call to save dice roll
    console.log(`Saving dice roll for ${countryCode}: ${diceRoll}`);
  }

  private saveAllDiceRollsToBackend(countries: PoliticalAccessCard[]): void {
    // TODO: Implement WebSocket/HTTP API call to save all dice rolls
    console.log('Saving all dice rolls:', countries.map(c => ({country: c.country, diceRoll: c.diceRoll})));
  }

  private saveBulkAccessToBackend(accessLevel: AccessStatus): void {
    // TODO: Implement WebSocket/HTTP API call to save bulk access changes
    console.log(`Setting all countries to: ${accessLevel}`);
  }

  getFosOccupancyDisplay(countryData: PoliticalAccessCard): string {
    return `${countryData.fosOccupied}/${countryData.fosCount} FOS Occupied`;
  }

  getFosOccupancyColor(countryData: PoliticalAccessCard): string {
    const rate = countryData.occupancyRate;
    if (rate === 0) return 'text-md-error';
    if (rate < 0.5) return 'text-md-warning';
    if (rate < 0.8) return 'text-md-primary';
    return 'text-md-tertiary';
  }

  getFosStatusIcon(fos: FOSReference): string {
    return fos.isOccupied ? '✓' : '○';
  }

  getFosChipClass(fos: FOSReference): string {
    const baseClass = fos.isOccupied ? 'occupied-fos' : 'unoccupied-fos';
    const colorClass = `fos-${fos.color}`;
    return `${baseClass} ${colorClass}`;
  }

  onFosClick(fos: FOSReference): void {
    // TODO: Highlight FOS on map
    console.log(`Clicked FOS ${fos.number}: ${fos.name} (${fos.isOccupied ? 'Occupied' : 'Available'})`);
  }

  private emitCountryAccessChange(countryCode: Country, accessType: 'access' | 'overflight', newAccess: AccessStatus): void {
    const eventData = {
      gameId: this.gameId,
      country: countryCode,
      accessType: accessType,
      accessLevel: newAccess,
      timestamp: new Date().toISOString(),
      updatedBy: 'GM' // In a real implementation, this would be the actual user ID
    };

    this.webSocketService.emit('countryAccessChanged', eventData);
    console.log('Emitted country access change:', eventData);
  }

  private emitBulkAccessChange(accessLevel: AccessStatus): void {
    const eventData = {
      gameId: this.gameId,
      accessLevel: accessLevel,
      countries: country,
      timestamp: new Date().toISOString(),
      updatedBy: 'GM'
    };

    this.webSocketService.emit('bulkCountryAccessChanged', eventData);
    console.log('Emitted bulk country access change:', eventData);
  }
}
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
import { CountryAccessHttpService } from '../../../shared/services/country-access-http.service';
import { getFOSByCountry, StaticLocation } from '../../../shared/config/static-locations.config';

interface PoliticalAccessCard {
  country: Country;
  countryDisplayName: string;
  flagEmoji: string;
  access: AccessStatus;
  overflight: AccessStatus;
  diceRoll: number;
  fosSites: StaticLocation[];
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

  // FOS assignments by country (loaded from centralized config)
  private readonly countryFOS: Record<string, StaticLocation[]> = getFOSByCountry();

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
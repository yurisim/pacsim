import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { Country, country, AccessStatus } from '../../../generated/enums';
import { CountryAccessHttpService, BulkDiceRollRequest } from '../../../shared/services/country-access-http.service';
import { CountryOverlayService } from '../services/country-overlay.service';

interface CountryDiceRollWithStatus {
  country: Country;
  diceValue: number;
  currentStatus: AccessStatus;
  futureStatus: AccessStatus;
  isRolling: boolean;
}

interface CountryAccessDiceRollDialogData {
  gameId: number;
}

/**
 * Mobile-friendly dialog for bulk dice rolling across all countries.
 *
 * Features:
 * - Responsive layout (1 column on mobile, 2 columns on larger screens)
 * - Each country displays: Name, current status, future status, dice roll (1-10)
 * - Click dice icon to randomly roll values 1-10
 * - Randomize All button for bulk random rolling
 * - Visual feedback showing current → future access status
 * - Changes are not saved until user clicks "Save" button
 * - Broadcasts updates to all clients in the room via existing WebSocket infrastructure
 */
@Component({
  selector: 'app-country-access-dice-roll-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule
  ],
  templateUrl: './country-access-dice-roll-dialog.component.html',
  styleUrls: ['./country-access-dice-roll-dialog.component.scss']
})
export class CountryAccessDiceRollDialogComponent {
  private dialogRef = inject(MatDialogRef<CountryAccessDiceRollDialogComponent, boolean>);
  private countryAccessHttp = inject(CountryAccessHttpService);
  private countryOverlayService = inject(CountryOverlayService);
  private snackBar = inject(MatSnackBar);
  private data = inject<CountryAccessDiceRollDialogData>(MAT_DIALOG_DATA);

  // State signals
  private diceRollsSignal = signal<CountryDiceRollWithStatus[]>([]);
  private savingSignal = signal(false);

  // Computed properties
  diceRolls = this.diceRollsSignal.asReadonly();
  saving = this.savingSignal.asReadonly();

  constructor() {
    // Initialize dice rolls with current country access status
    this.initializeDiceRolls();
  }

  /**
   * Initialize dice rolls with current country access status
   */
  private initializeDiceRolls(): void {
    const currentAccess = this.countryOverlayService.getCountryAccess();
    const initialRolls: CountryDiceRollWithStatus[] = country.map(c => {
      // Japan starts with 10, others start with 1
      const initialDiceValue = c === 'JAPAN' ? 10 : 1;
      return {
        country: c,
        diceValue: initialDiceValue,
        currentStatus: currentAccess[c] || 'NO_ACCESS',
        futureStatus: this.predictFutureStatus(c, initialDiceValue),
        isRolling: false
      };
    });
    this.diceRollsSignal.set(initialRolls);
  }

  /**
   * Predict future access status based on country and dice roll value
   * Country-specific rules based on military exercise requirements
   */
  private predictFutureStatus(country: Country, diceValue: number): AccessStatus {
    // Japan always has full access (always rolls 10)
    if (country === 'JAPAN') {
      return 'FULL_ACCESS';
    }

    // Group 1: Indonesia, Brunei, India
    // 1-3: No Access, 4: Overflight, 5-10: Full Access
    if (country === 'INDONESIA' || country === 'BRUNEI' || country === 'INDIA') {
      if (diceValue >= 1 && diceValue <= 3) {
        return 'NO_ACCESS';
      } else if (diceValue === 4) {
        return 'OVERFLIGHT_ONLY';
      } else {
        return 'FULL_ACCESS';
      }
    }

    // Group 2: Malaysia, Singapore
    // 1-2: No Access, 3: Overflight, 4-10: Full Access
    if (country === 'MALAYSIA' || country === 'SINGAPORE') {
      if (diceValue >= 1 && diceValue <= 2) {
        return 'NO_ACCESS';
      } else if (diceValue === 3) {
        return 'OVERFLIGHT_ONLY';
      } else {
        return 'FULL_ACCESS';
      }
    }

    // Group 3: Laos, Vietnam
    // 1: No Access, 2: Overflight, 3-10: Full Access
    if (country === 'LAOS' || country === 'VIETNAM') {
      if (diceValue === 1) {
        return 'NO_ACCESS';
      } else if (diceValue === 2) {
        return 'OVERFLIGHT_ONLY';
      } else {
        return 'FULL_ACCESS';
      }
    }

    // Default rules for other countries (Philippines, Thailand, Cambodia)
    // Use the original generic rules as fallback
    if (diceValue >= 1 && diceValue <= 3) {
      return 'NO_ACCESS';
    } else if (diceValue >= 4 && diceValue <= 7) {
      return 'OVERFLIGHT_ONLY';
    } else {
      return 'FULL_ACCESS';
    }
  }

  /**
   * Get human-readable country name from Country enum
   */
  getCountryDisplayName(country: Country): string {
    return country.replace(/_/g, ' ');
  }

  /**
   * Get display styles for access status (ngStyle approach)
   */
  getStatusStyles(status: AccessStatus): any {
    switch (status) {
      case 'FULL_ACCESS':
        return {
          'background-color': '#4caf50',
          'color': 'white',
          '--mdc-chip-label-text-color': 'white'
        };
      case 'OVERFLIGHT_ONLY':
        return {
          'background-color': '#ff9800',
          'color': 'white',
          '--mdc-chip-label-text-color': 'white'
        };
      case 'NO_ACCESS':
        return {
          'background-color': '#f44336',
          'color': 'white',
          '--mdc-chip-label-text-color': 'white'
        };
      default:
        return {
          'background-color': '#f44336',
          'color': 'white',
          '--mdc-chip-label-text-color': 'white'
        };
    }
  }

  /**
   * Get display text for access status
   */
  getStatusDisplayText(status: AccessStatus): string {
    switch (status) {
      case 'FULL_ACCESS': return 'Full Access';
      case 'OVERFLIGHT_ONLY': return 'Overflight Only';
      case 'NO_ACCESS': return 'No Access';
      default: return 'No Access';
    }
  }

  /**
   * Roll dice for a specific country (random 1-10)
   * Japan always rolls 10, others are random
   */
  rollDiceValue(country: Country): void {
    if (this.saving()) return; // Prevent changes while saving

    // Set rolling state
    this.diceRollsSignal.update(rolls =>
      rolls.map(roll =>
        roll.country === country
          ? { ...roll, isRolling: true }
          : roll
      )
    );

    // Simulate rolling animation delay
    setTimeout(() => {
      let newDiceValue: number;

      // Japan always rolls 10
      if (country === 'JAPAN') {
        newDiceValue = 10;
      } else {
        // All other countries roll randomly 1-10
        newDiceValue = Math.floor(Math.random() * 10) + 1;
      }

      this.diceRollsSignal.update(rolls =>
        rolls.map(roll =>
          roll.country === country
            ? {
                ...roll,
                diceValue: newDiceValue,
                futureStatus: this.predictFutureStatus(country, newDiceValue),
                isRolling: false
              }
            : roll
        )
      );
    }, 300); // 300ms rolling animation
  }

  /**
   * Randomize all dice values
   * Japan always gets 10, others are random
   */
  randomizeAllDice(): void {
    if (this.saving()) return;

    // Set all as rolling
    this.diceRollsSignal.update(rolls =>
      rolls.map(roll => ({ ...roll, isRolling: true }))
    );

    // Simulate rolling animation delay
    setTimeout(() => {
      this.diceRollsSignal.update(rolls =>
        rolls.map(roll => {
          let newDiceValue: number;

          // Japan always rolls 10
          if (roll.country === 'JAPAN') {
            newDiceValue = 10;
          } else {
            // All other countries roll randomly 1-10
            newDiceValue = Math.floor(Math.random() * 10) + 1;
          }

          return {
            ...roll,
            diceValue: newDiceValue,
            futureStatus: this.predictFutureStatus(roll.country, newDiceValue),
            isRolling: false
          };
        })
      );
    }, 500); // Slightly longer for bulk operation
  }

  /**
   * Cancel the dialog without saving changes
   */
  cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * Save all dice rolls via bulk API and broadcast to all clients
   */
  save(): void {
    if (this.saving()) return;

    this.savingSignal.set(true);

    // Get game ID from dialog data
    const gameId = this.data.gameId;

    if (!gameId) {
      console.error('No valid gameId found for dice roll update');
      this.snackBar.open('Error: No game context found', 'OK', { duration: 5000 });
      this.savingSignal.set(false);
      return;
    }

    // Prepare bulk request
    const request: BulkDiceRollRequest = {
      diceRolls: this.diceRolls().map(roll => ({
        country: roll.country,
        diceRoll: roll.diceValue
      })),
      notes: 'Bulk dice roll update via mobile-friendly dialog'
    };

    // Submit bulk dice rolls
    this.countryAccessHttp.updateBulkDiceRolls(gameId, request).subscribe({
      next: (response) => {
        console.log('Bulk dice roll update successful:', response);

        // Optimistically update the country overlay service with new access levels
        this.diceRolls().forEach(roll => {
          const newAccessLevel = this.predictFutureStatus(roll.country, roll.diceValue);
          this.countryOverlayService.updateCountryAccess(roll.country, newAccessLevel);
        });

        this.snackBar.open('Dice rolls updated successfully', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Failed to update dice rolls:', err);
        this.snackBar.open('Failed to update dice rolls. Please try again.', 'OK', { duration: 5000 });
        this.savingSignal.set(false);
      }
    });
  }
}
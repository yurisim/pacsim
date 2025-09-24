import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Country, AccessStatus } from '../../generated/enums';
import { environment } from '../../../environments/environment';

export interface CountryAccessSnapshot {
  countries: Record<string, AccessStatus>;
}

export interface UpdateDiceRollRequest {
  diceRoll: number;
  notes?: string;
}

export interface UpdateDiceRollResponse {
  country: Country;
  diceRoll: number;
  accessLevel: AccessStatus;
}

export interface BulkDiceRollRequest {
  diceRolls: Array<{
    country: Country;
    diceRoll: number;
  }>;
  notes?: string;
}

export interface BulkDiceRollResponse {
  countries: Array<{
    country: Country;
    diceRoll: number;
    accessLevel: AccessStatus;
  }>;
}

export interface BulkAccessUpdateRequest {
  accessLevel: AccessStatus;
  countries?: Country[];
  notes?: string;
}

export interface BulkAccessUpdateResponse {
  countries: Array<{
    country: Country;
    accessLevel: AccessStatus;
  }>;
}

@Injectable({
  providedIn: 'root'
})
/**
 * HTTP client for managing per-country political access state within a game.
 *
 * Responsibilities:
 * - Retrieve the current access snapshot for all configured countries
 * - Update an individual country's dice roll and resulting access
 * - Perform bulk dice roll updates across multiple countries
 * - Perform bulk access-level updates (e.g., set Overflight Only for selected countries)
 *
 * All requests are scoped by gameId and map to the pac-shield-api REST endpoints.
 *
 * @class CountryAccessHttpService
 */
export class CountryAccessHttpService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/games`;

  /**
   * Retrieve the full political access snapshot for all countries in a game.
   *
   * @param gameId Unique identifier of the game
   * @returns Observable that emits the current snapshot mapping countries to AccessStatus
   * @example
   * countryAccessHttp.getCountryAccessSnapshot(42).subscribe(snapshot => {
   *   console.log(snapshot.countries.JAPAN); // "FULL_ACCESS" | "OVERFLIGHT_ONLY" | "NO_ACCESS"
   * });
   */
  getCountryAccessSnapshot(gameId: number): Observable<CountryAccessSnapshot> {
    return this.http.get<CountryAccessSnapshot>(`${this.baseUrl}/${gameId}/country-access`);
  }

  /**
   * Update the dice roll for a specific country and receive the resulting access level.
   *
   * Server applies game rules to translate the dice roll into an AccessStatus.
   *
   * @param gameId Unique identifier of the game
   * @param country Country enum value to update
   * @param request Payload containing the diceRoll and optional notes
   * @returns Observable with the updated dice roll and computed access level
   */
  updateCountryDiceRoll(
    gameId: number,
    country: Country,
    request: UpdateDiceRollRequest
  ): Observable<UpdateDiceRollResponse> {
    return this.http.put<UpdateDiceRollResponse>(
      `${this.baseUrl}/${gameId}/country-access/${country}/dice-roll`,
      request
    );
  }

  /**
   * Bulk-update dice rolls across multiple countries and receive their resulting access levels.
   *
   * @param gameId Unique identifier of the game
   * @param request Payload with per-country dice roll values and optional notes
   * @returns Observable containing updated dice rolls and access levels for all affected countries
   */
  updateBulkDiceRolls(
    gameId: number,
    request: BulkDiceRollRequest
  ): Observable<BulkDiceRollResponse> {
    return this.http.put<BulkDiceRollResponse>(
      `${this.baseUrl}/${gameId}/country-access/dice-rolls`,
      request
    );
  }

  /**
   * Bulk-update access level for one or more countries (e.g., set Overflight Only).
   *
   * When request.countries is omitted, the backend may apply the access level globally,
   * depending on API implementation and permissions.
   *
   * @param gameId Unique identifier of the game
   * @param request Payload describing the new accessLevel and optional list of countries
   * @returns Observable of the countries updated and their resulting access levels
   */
  updateBulkCountryAccess(
    gameId: number,
    request: BulkAccessUpdateRequest
  ): Observable<BulkAccessUpdateResponse> {
    return this.http.put<BulkAccessUpdateResponse>(
      `${this.baseUrl}/${gameId}/country-access/bulk`,
      request
    );
  }
}

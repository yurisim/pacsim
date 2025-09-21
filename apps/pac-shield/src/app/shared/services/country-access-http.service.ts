import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Country, AccessStatus } from '../../generated/enums';

export interface CountryAccessSnapshot {
  countries: Record<string, boolean>;
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
export class CountryAccessHttpService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/games';

  /**
   * Get country access snapshot for a game
   */
  getCountryAccessSnapshot(gameId: number): Observable<CountryAccessSnapshot> {
    return this.http.get<CountryAccessSnapshot>(`${this.baseUrl}/${gameId}/country-access`);
  }

  /**
   * Update dice roll for a specific country
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
   * Update dice rolls for multiple countries
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
   * Update access level for multiple countries (bulk operation)
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
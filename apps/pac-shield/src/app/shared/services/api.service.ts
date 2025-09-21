import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Thin HTTP client wrapper that centralizes:
 * - Base API URL configuration
 * - Common REST helpers (GET/POST/PUT/PATCH/DELETE)
 * - Feature-specific convenience calls
 *
 * Returns strongly typed RxJS Observables so callers can compose streams.
 * All endpoints here are relative to environment.apiUrl.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Performs a typed HTTP GET.
   * @param endpoint Relative endpoint (e.g., "game/123")
   * @param params Optional query string parameters
   * @returns Observable<T> of the server response
   */
  get<T>(endpoint: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}/${endpoint}`, { params });
  }

  /**
   * Performs a typed HTTP POST.
   * Use for creating resources or executing commands on the API.
   * @param endpoint Relative endpoint
   * @param body Request payload (serializable)
   */
  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, body);
  }

  /**
   * Performs a typed HTTP PUT.
   * Use for full resource replacement.
   * @param endpoint Relative endpoint
   * @param body Resource state to replace with
   */
  put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${endpoint}`, body);
  }

  /**
   * Performs a typed HTTP PATCH.
   * Use for partial updates to a resource.
   * @param endpoint Relative endpoint
   * @param body Partial state to apply
   */
  patch<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.apiUrl}/${endpoint}`, body);
  }

  /**
   * Performs a typed HTTP DELETE.
   * @param endpoint Relative endpoint
   */
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}/${endpoint}`);
  }

  /**
   * Convenience API to update only the player's display name.
   * Delegates to PATCH /player/:id/name.
   */
  updatePlayerName(playerId: string, newName: string): Observable<any> {
    return this.patch(`player/${playerId}/name`, { name: newName });
  }

  /**
   * Convenience API to update both player name and role in a single call.
   * Delegates to PATCH /player/:id.
   */
  updatePlayerNameAndRole(playerId: string, name: string, role: string): Observable<any> {
    return this.patch(`player/${playerId}`, { name, role });
  }

  /**
   * Convenience API to assign a player to a specific team.
   * Delegates to POST /player/:id/join-team.
   */
  joinTeam(playerId: string, teamId: number): Observable<any> {
    return this.post(`player/${playerId}/join-team`, { teamId });
  }

  /**
   * Convenience API to remove a player from their current team.
   * Delegates to POST /player/:id/leave-team.
   */
  leaveTeam(playerId: string): Observable<any> {
    return this.post(`player/${playerId}/leave-team`, {});
  }

  /**
   * Lock a team's roster to prevent joins/moves.
   */
  lockTeam(teamId: number): Observable<any> {
    return this.patch(`team/${teamId}/lock`, {});
  }

  /**
   * Unlock a team's roster to allow joins/moves.
   */
  unlockTeam(teamId: number): Observable<any> {
    return this.patch(`team/${teamId}/unlock`, {});
  }

  /**
   * Assign the first available unassigned player in the same game to this team.
   */
  assignOneUnassigned(teamId: number): Observable<any> {
    return this.post(`team/${teamId}/assign-one-unassigned`, {});
  }

  /**
   * Update only a player's role.
   */
  updatePlayerRole(playerId: string, role: string): Observable<any> {
    return this.patch(`player/${playerId}`, { role });
  }

  /**
   * Permanently remove a player from the game.
   */
  deletePlayer(playerId: string): Observable<any> {
    return this.delete(`player/${playerId}`);
  }

  /**
   * Get ATO lines for a specific game and turn.
   */
  getAtoLinesByGame(gameId: number, turn?: number): Observable<any[]> {
    const params = turn !== undefined ? new HttpParams().set('turn', turn.toString()) : undefined;
    return this.get<any[]>(`ato/game/${gameId}`, params);
  }

  /**
   * Get current turn ATO lines for a game.
   */
  getCurrentAtoLines(gameId: number): Observable<any[]> {
    return this.get<any[]>(`ato/game/${gameId}/current`);
  }

  /**
   * Update political access for a country.
   * POST /game/:gameId/political-access
   */
  postPoliticalAccess(
    gameId: number,
    body: {
      country: string;
      accessType: 'access' | 'overflight';
      accessLevel: 'FULL_ACCESS' | 'OVERFLIGHT_ONLY' | 'NO_ACCESS';
      source?: 'map' | 'panel';
      at?: string;
    }
  ): Observable<{
    success: boolean;
    state: {
      country: string;
      access: string;
      overflight: string;
      updatedAt?: string;
      version?: number;
    };
  }> {
    return this.post<{ success: boolean; state: { country: string; access: string; overflight: string; updatedAt?: string; version?: number } }>(
      `game/${gameId}/political-access`,
      body
    );
  }
}

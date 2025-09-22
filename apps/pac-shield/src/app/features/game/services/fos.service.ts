import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ForwardOperatingSite } from '../../../generated';
import { ApiService } from '../../../shared/services/api.service';

@Injectable({
  providedIn: 'root'
})
/**
 * Client for Forward Operating Site (FOS) operations.
 *
 * Provides APIs to read and mutate FOS state:
 * - Retrieve all FOS entries for a game
 * - Activate a FOS for a team and record the activation turn
 * - Deactivate a FOS with server-side validation and authorization
 *
 * @class FosService
 */
export class FosService {
  private api = inject(ApiService);
  private readonly resource = 'fos';

  /**
   * Retrieve all Forward Operating Sites for the specified game.
   *
   * @param gameId Unique identifier of the game
   * @returns Observable emitting the list of FOS records for the game
   * @example
   * fosService.getFOSsForGame(123).subscribe(fosList => console.log(fosList.length));
   */
  getFOSsForGame(gameId: number): Observable<ForwardOperatingSite[]> {
    return this.api.get<ForwardOperatingSite[]>(`${this.resource}/game/${gameId}`);
  }

  /**
   * Activate a Forward Operating Site and assign it to a team.
   *
   * Server will create the FOS record if needed, validate permissions (GM or MOB CC),
   * and broadcast updates to connected clients.
   *
   * @param fosId Numeric FOS display number (e.g., 7 for "FOS 7")
   * @param teamId Team to assign as the FOS owner
   * @param turnActivated Current turn number when activation occurs
   * @returns Observable emitting the updated/created ForwardOperatingSite
   * @example
   * fosService.activateFOS(7, 2, currentTurn).subscribe(fos => console.log(fos.isActive));
   * @throws Emits an error observable on HTTP 403 (forbidden) or 404 (invalid FOS)
   */
  activateFOS(fosId: number, teamId: number, turnActivated: number): Observable<ForwardOperatingSite> {
    return this.api.post<ForwardOperatingSite>(`${this.resource}/${fosId}/activate`, {
      teamId,
      turnActivated
    });
  }

  /**
   * Deactivate a Forward Operating Site.
   *
   * Authorization is enforced server-side (GM or same-team MOB CC for assigned FOS).
   *
   * @param fosId Database identifier of the FOS to deactivate
   * @returns Observable emitting the updated ForwardOperatingSite
   * @example
   * fosService.deactivateFOS('fos-db-id').subscribe(fos => console.log(fos.isActive)); // false
   * @throws Emits an error observable on HTTP 403 (forbidden) or 404 (not found)
   */
  deactivateFOS(fosId: string): Observable<ForwardOperatingSite> {
    return this.api.patch<ForwardOperatingSite>(`${this.resource}/${fosId}/deactivate`, {});
  }
}

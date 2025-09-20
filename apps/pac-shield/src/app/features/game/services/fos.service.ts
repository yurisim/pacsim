import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ForwardOperatingSite } from '../../../generated';
import { ApiService } from '../../../shared/services/api.service';

@Injectable({
  providedIn: 'root'
})
export class FosService {
  private api = inject(ApiService);
  private readonly resource = 'fos';

  /**
   * Get all FOSs for a game
   */
  getFOSsForGame(gameId: number): Observable<ForwardOperatingSite[]> {
    return this.api.get<ForwardOperatingSite[]>(`${this.resource}/game/${gameId}`);
  }

  /**
   * Activate a FOS and assign it to a team
   */
  activateFOS(fosId: number, teamId: number, turnActivated: number): Observable<ForwardOperatingSite> {
    return this.api.post<ForwardOperatingSite>(`${this.resource}/${fosId}/activate`, {
      teamId,
      turnActivated
    });
  }

  /**
   * Deactivate a FOS
   */
  deactivateFOS(fosId: string): Observable<ForwardOperatingSite> {
    return this.api.patch<ForwardOperatingSite>(`${this.resource}/${fosId}/deactivate`, {});
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ForwardOperatingSite } from '../../../generated';

@Injectable({
  providedIn: 'root'
})
export class FosService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/fos';

  /**
   * Get all FOSs for a game
   */
  getFOSsForGame(gameId: number): Observable<ForwardOperatingSite[]> {
    return this.http.get<ForwardOperatingSite[]>(`${this.baseUrl}/game/${gameId}`);
  }

  /**
   * Activate a FOS and assign it to a team
   */
  activateFOS(fosId: number, teamId: number, turnActivated: number): Observable<ForwardOperatingSite> {
    return this.http.post<ForwardOperatingSite>(`${this.baseUrl}/${fosId}/activate`, {
      teamId,
      turnActivated
    });
  }

  /**
   * Deactivate a FOS
   */
  deactivateFOS(fosId: string): Observable<ForwardOperatingSite> {
    return this.http.patch<ForwardOperatingSite>(`${this.baseUrl}/${fosId}/deactivate`, {});
  }
}
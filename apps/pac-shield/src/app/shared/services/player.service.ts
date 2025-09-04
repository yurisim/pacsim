import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Player } from '../../generated';

/**
 * Facade over ApiService for player-related API calls.
 * Keeps player HTTP endpoints consolidated and typed.
 */
@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private apiService = inject(ApiService);

  /**
   * Fetch players for a given game.
   * Used by lobby to render current roster.
   */
  getPlayers(gameId: number): Observable<Player[]> {
    return this.apiService.get<Player[]>(`player/game/${gameId}`);
  }
}

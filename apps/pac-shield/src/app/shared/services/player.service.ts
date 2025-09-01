import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Player } from '../../generated';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private apiService = inject(ApiService);

  getPlayers(gameId: number): Observable<Player[]> {
    return this.apiService.get<Player[]>(`player/game/${gameId}`);
  }
}

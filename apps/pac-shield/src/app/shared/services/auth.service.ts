import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { ApiService } from './api.service';
import { Player } from '../../models/player.model';

interface JwtPayload {
  gameId: string;
  playerId: string;
  // Add other relevant properties from your JWT payload as needed
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiService = inject(ApiService);
  private readonly tokenKey = 'pac-shield-jwt';
  private readonly playerKey = 'pac-shield-player';

  joinGame(roomCode: string, playerName: string) {
    return this.apiService
      .post<{ token: string }>('game/join', { roomCode, playerName })
      .pipe(
        tap(({ token }) => {
          this.setToken(token);
          const playerId = this.getPlayerIdFromToken();
          if (playerId) {
            localStorage.setItem('playerId', playerId);
          }
        })
      );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getGameId(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      return decodedToken.gameId;
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      this.logout(); // Clear invalid token
      return null;
    }
  }

  getPlayerId(): string | null {
    return localStorage.getItem('playerId');
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getPlayerIdFromToken(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      return decodedToken.playerId;
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      this.logout();
      return null;
    }
  }

  setPlayer(player: Player) {
    localStorage.setItem(this.playerKey, JSON.stringify(player));
  }

  getPlayer(): Player | null {
    const playerJson = localStorage.getItem(this.playerKey);
    return playerJson ? JSON.parse(playerJson) : null;
  }
}

import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { ApiService } from './api.service';
import { WebSocketService } from './websocket.service';
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
  private webSocketService = inject(WebSocketService);
  private readonly tokenKey = 'pac-shield-jwt';
  private readonly playerKey = 'pac-shield-player';

  joinGame(roomCode: string, playerName: string) {
    this.webSocketService.connect(roomCode);
    return this.apiService
      .post<{ token: string; player: Player }>('player/join', { roomCode, playerName })
      .pipe(
        tap(({ token, player }) => {
          this.setToken(token);
          this.setPlayer(player);
          const playerId = this.getPlayerIdFromToken();
          if (playerId) {
            localStorage.setItem('playerId', playerId);
          }
        })
      );
  }

  createGameMaster(roomCode: string, playerName: string, pin: string) {
    this.webSocketService.connect(roomCode);
    return this.apiService
      .post<{ token: string; player: Player }>('player/join', { 
        roomCode, 
        playerName,
        pin,
        role: 'GM'
      })
      .pipe(
        tap(({ token, player }) => {
          this.setToken(token);
          this.setPlayer(player);
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
    this.webSocketService.disconnect();
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.playerKey);
    localStorage.removeItem('playerId');
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

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      // Check if token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      return (decodedToken as any).exp ? (decodedToken as any).exp > currentTime : true;
    } catch (error) {
      console.error('Failed to validate JWT:', error);
      this.logout();
      return false;
    }
  }
}

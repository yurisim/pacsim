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
/**
 * AuthService orchestrates the join/auth flow and session persistence.
 *
 * Responsibilities:
 * - Initiate WebSocket connection prior to HTTP join to ensure real-time readiness
 * - Call backend auth/player endpoints and persist JWT + player locally
 * - Decode/validate JWT to derive gameId/playerId and auth state
 * - Provide helper APIs for PIN/name-conflict and GM creation flows
 */
export class AuthService {
  private apiService = inject(ApiService);
  private webSocketService = inject(WebSocketService);
  private readonly tokenKey = 'pac-shield-jwt';
  private readonly playerKey = 'pac-shield-player';

  /**
   * Join a game as a new player using a room code.
   * Flow:
   * 1) Connect WebSocket to the room (so server can immediately push updates)
   * 2) POST /player/join to create the player session
   * 3) Persist JWT + player; extract and store playerId for convenience
   */
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

  /**
   * Resume an existing player by verifying a PIN for a name collision.
   * Connects socket to the roomCode, then attempts to join with { roomCode, playerName, pin }.
   * Persists JWT + player on success.
   */
  joinGameWithPin(roomCode: string, playerName: string, pin: string) {
    this.webSocketService.connect(roomCode);
    return this.apiService
      .post<{ token: string; player: Player }>('player/join', { roomCode, playerName, pin })
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

  /**
   * Validate if a room code exists before attempting to join.
   * @returns { valid: boolean, gameId?: number }
   */
  validateRoomCode(roomCode: string) {
    return this.apiService.get<{ valid: boolean; gameId?: number }>(`game/validate/${roomCode}`);
  }

  /**
   * Check if a player name is available within a given room code.
   * Used to drive name conflict UI and PIN entry flow.
   */
  checkPlayerNameAvailability(roomCode: string, playerName: string) {
    return this.apiService.post<{ isAvailable: boolean }>('player/check-name-availability', { roomCode, playerName });
  }

  /**
   * Create a Game Master session for a room.
   * Same join endpoint with role='GM' to elevate permissions server-side.
   */
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

  /**
   * Get the raw JWT from localStorage.
   * Do not assume validity; use isAuthenticated() if needed.
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Decode JWT and extract gameId.
   * Returns null if token missing or invalid; clears invalid tokens.
   */
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

  /**
   * Convenience accessor for cached playerId.
   * Note: This is separately stored after decoding the JWT during join.
   */
  getPlayerId(): string | null {
    return localStorage.getItem('playerId');
  }

  /**
   * Clear session and close WebSocket connection.
   * Use when leaving a game or when token becomes invalid/expired.
   */
  logout(): void {
    this.webSocketService.disconnect();
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.playerKey);
    localStorage.removeItem('playerId');
  }

  /**
   * Persist JWT in localStorage.
   * This does not validate the token; callers should handle validation separately.
   */
  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Decode JWT to read the playerId claim.
   * Returns null on failure; also clears storage by calling logout().
   */
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

  /**
   * Cache the current player object locally for quick access.
   */
  setPlayer(player: Player) {
    localStorage.setItem(this.playerKey, JSON.stringify(player));
  }

  /**
   * Retrieve cached player from localStorage, if any.
   */
  getPlayer(): Player | null {
    const playerJson = localStorage.getItem(this.playerKey);
    return playerJson ? JSON.parse(playerJson) : null;
  }

  /**
   * Validate the presence and (if provided) expiry of the JWT.
   * Returns false on decode failure or expiration, and clears storage.
   */
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

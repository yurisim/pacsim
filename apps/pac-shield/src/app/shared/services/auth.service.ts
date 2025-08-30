import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { ApiService } from './api.service';

interface JwtPayload {
  gameId: string;
  // Add other relevant properties from your JWT payload as needed
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiService = inject(ApiService);
  private readonly tokenKey = 'pac-shield-jwt';

  joinGame(roomCode: string) {
    return this.apiService.post<{ token: string }>('auth/join', { roomCode }).pipe(
      tap(({ token }) => {
        this.setToken(token);
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

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }
}

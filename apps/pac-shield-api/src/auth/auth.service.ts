import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Authentication service for managing JWT tokens and session security.
 * Handles token generation and validation for game session access control.
 */
@Injectable()
export class AuthService {
  /**
   * Creates an instance of AuthService.
   * @param jwtService - NestJS JWT service for token signing and verification
   */
  constructor(private jwtService: JwtService) {}

  /**
   * Generates JWT authentication token for game session access.
   * Embeds gameId and playerId claims for API authorization and player identity verification.
   * Token validates player's membership in specific game and enables secure multiplayer operations.
   * @param gameId - The unique identifier of the game session
   * @param playerId - Optional player identifier for player-specific operations
   * @returns Promise resolving to object containing signed JWT token
   * @example
   * // Returns: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
   */
  async login(gameId: number, playerId?: number) {
    const payload = { gameId, sub: playerId, playerId };
    return {
      token: this.jwtService.sign(payload),
    };
  }
}

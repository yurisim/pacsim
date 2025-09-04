import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  /**
   * Generates JWT authentication token for game session access.
   * Embeds gameId and playerId claims for API authorization and player identity verification.
   * Token validates player's membership in specific game and enables secure multiplayer operations.
   */
  async login(gameId: number, playerId?: number) {
    const payload = { gameId, sub: playerId, playerId };
    return {
      token: this.jwtService.sign(payload),
    };
  }
}

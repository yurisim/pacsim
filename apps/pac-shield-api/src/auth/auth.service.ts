import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(gameId: number, playerId?: number) {
    const payload = { gameId, sub: playerId, playerId };
    return {
      token: this.jwtService.sign(payload),
    };
  }
}

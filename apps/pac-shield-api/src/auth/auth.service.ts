import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(gameId: number, userId?: number) {
    const payload = { gameId, sub: userId };
    return {
      token: this.jwtService.sign(payload),
    };
  }
}

import { Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Minimal authentication controller.
 * Note: The primary authentication flow for this app is tied to game join endpoints
 * (see PlayerController), which mint session-scoped JWTs. This controller exists
 * for potential tooling/manual testing and future expansion.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Placeholder login endpoint (not used by the Angular app).
   * A full implementation would accept credentials/DTO and return a JWT.
   */
  @Post('login')
  login() {
    // TODO: This is a placeholder. The front end does not call this endpoint directly.
    // A DTO and request body would be needed for a real implementation.
    return this.authService.login(-1);
  }
}

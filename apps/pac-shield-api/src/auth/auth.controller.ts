import { Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login() {
    // TODO: This is a placeholder. The front end does not call this endpoint directly.
    // A DTO and request body would be needed for a real implementation.
    return this.authService.login(-1);
  }
}

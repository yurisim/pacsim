import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  login() {
    return { msg: 'This is a placeholder for the login endpoint.' };
  }
}

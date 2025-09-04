import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

/**
 * Http interceptor that attaches a Bearer JWT to outgoing requests.
 * - Reads token from AuthService
 * - Only sets Authorization header if a token exists AND is currently valid
 * - Leaves requests untouched otherwise (e.g., public endpoints)
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token && authService.isAuthenticated()) {
    const authRequest = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authRequest);
  }

  return next(request);
};

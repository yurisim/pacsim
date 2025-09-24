import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Http interceptor that attaches a Bearer JWT to outgoing requests and handles auth errors.
 * - Reads token from AuthService
 * - Only sets Authorization header if a token exists AND is currently valid
 * - Leaves requests untouched otherwise (e.g., public endpoints)
 * - Intercepts 401/403 errors to clear invalid JWTs and redirect to home
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let authRequest = request;
  if (token && authService.isAuthenticated()) {
    authRequest = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle authentication errors globally
      if (error.status === 401 || error.status === 403) {
        console.warn('JWT authentication failed, clearing token and redirecting to home', error);
        authService.logout(true);
      }
      return throwError(() => error);
    })
  );
};

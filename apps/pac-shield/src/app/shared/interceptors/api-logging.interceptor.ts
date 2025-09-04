import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { tap } from 'rxjs/operators';

/**
 * Interceptor that:
 * - Generates a unique x-request-id and attaches it to each outgoing HTTP request
 * - Logs request/response details in the browser console for easier debugging
 *
 * The x-request-id header is correlated on the backend by LoggingInterceptor
 * to tie together frontend and backend logs for a single request path.
 */
@Injectable()
export class ApiLoggingInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    // Generate request ID for correlation
    const requestId = `fe_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Clone request to add the request ID header
    const clonedRequest = req.clone({
      setHeaders: {
        'x-request-id': requestId
      }
    });

    console.log(`[${requestId}] Frontend API Call: ${req.method} ${req.url}`, {
      body: req.body,
      headers: Object.fromEntries(
        req.headers.keys().map(key => [key, req.headers.get(key)])
      )
    });

    return next.handle(clonedRequest).pipe(
      tap({
        next: (response) => {
          console.log(`[${requestId}] API Success: ${req.method} ${req.url}`, response);
        },
        error: (error) => {
          console.error(`[${requestId}] API Error: ${req.method} ${req.url}`, {
            status: error.status,
            message: error.message,
            error: error.error
          });
        }
      })
    );
  }
}

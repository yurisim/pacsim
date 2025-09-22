import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that validates session context for game-scoped routes.
 *
 * Behavior:
 * - Only enforces authentication when a game route param exists (:gameId or :id)
 * - Unauthenticated users attempting to access game routes are redirected to /join with a `redirect` query param
 * - Authenticated users with a different game in their JWT are redirected to their own lobby
 *
 * @function sessionAuthGuard
 * @param route Activated route snapshot for the target navigation
 * @param state Router state snapshot containing the attempted URL
 * @returns True when navigation is allowed, or a UrlTree redirect when blocked
 */
export const sessionAuthGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Only guard routes that actually have a game id parameter (avoid blocking root or non-game pages).
  const paramGameIdRaw = route.paramMap.get('gameId') ?? route.paramMap.get('id');
  if (!paramGameIdRaw) {
    // Not a game-specific route; never block (prevents accidental guarding of root).
    return true;
  }

  // Must be authenticated for game-specific routes
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/join'], { queryParams: { redirect: state.url } });
  }

  // Coerce to string to avoid strict inequality issues when JWT encodes gameId as a number
  const tokenGameIdRaw = auth.getGameId();
  const tokenGameId = tokenGameIdRaw != null ? tokenGameIdRaw.toString() : null;
  const paramGameId = paramGameIdRaw.toString();

  // If user has a valid session but tries to access a different game, redirect to their own lobby
  if (tokenGameId && tokenGameId !== paramGameId) {
    return router.createUrlTree(['/lobby', tokenGameId]);
  }

  return true;
};

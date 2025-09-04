import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard to prevent navigating to arbitrary game IDs.
 * - Only enforces auth when a game route param exists (:gameId or :id)
 * - Redirects unauthenticated users on game routes to /join with redirect
 * - Redirects authenticated users with mismatched game to their own lobby
 */
export const sessionAuthGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Only guard routes that actually have a game id parameter.
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

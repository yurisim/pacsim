import { test, expect, request } from '@playwright/test';
import { createGameAndJoin, setJwtToken, waitForConnection } from './test-utils';

test.describe('Route Guard and Toolbar/Logout/WebSocket indicators', () => {
  /**
   * Test Intent: Verify that unauthenticated users attempting to access protected routes
   * are properly redirected to the join page with the original destination preserved.
   *
   * This test validates:
   * - Route guard functionality for protected pages
   * - Proper redirect URL construction with query parameters
   * - Session state checking for authentication
   * - Graceful handling of unauthorized access attempts
   */
  test('unauthenticated users are redirected to /join with redirect query param', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/lobby/1234');

    // Assert we are on /join and redirect query is set to the original path.
    await expect(page).toHaveURL(/\/join(\?|$)/);
    const redirectedParam = await page.evaluate(() => new URL(location.href).searchParams.get('redirect'));
    expect(redirectedParam).toBe('/lobby/1234');
  });

  /**
   * Test Intent: Ensure authenticated users are redirected to their correct game lobby
   * when attempting to access a different game's lobby, preventing cross-game access.
   *
   * This test validates:
   * - Game ownership validation in route guards
   * - Proper redirection to user's assigned game
   * - JWT token validation for game access
   * - Session integrity across different game contexts
   */
  test('authenticated users are redirected to their own lobby when accessing a different gameId', async ({ page }) => {
    const api = await request.newContext();

    // Create a game and join to get a valid JWT + playerId
    const { gameId, token, playerId } = await createGameAndJoin(api, 'GuardTester-Mismatch');

    // Seed storage before first navigation
    await setJwtToken(page, token, playerId);

    // Try to access a different game
    await page.goto('/lobby/9999');

    // Should be redirected to /lobby/<ownGameId>
    await expect(page).toHaveURL(new RegExp(`/lobby/${gameId}$`));
    await api.dispose();
  });

  /**
   * Test Intent: Verify that authenticated users can successfully access their own
   * game lobby without redirection, confirming proper authorization flow.
   *
   * This test validates:
   * - Successful access to authorized game resources
   * - Proper lobby page rendering for authenticated users
   * - Game ID matching validation in route guards
   * - Session persistence and lobby state loading
   */
  test('authenticated users can access matching gameId lobby', async ({ page }) => {
    const api = await request.newContext();

    const { gameId, token, playerId } = await createGameAndJoin(api, 'GuardTester-Match');

    await setJwtToken(page, token, playerId);

    await page.goto(`/lobby/${gameId}`);
    await expect(page).toHaveURL(new RegExp(`/lobby/${gameId}$`));
    await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
    await api.dispose();
  });

  /**
   * Test Intent: Validate the logout functionality including UI visibility,
   * session cleanup, and proper redirection to home page after logout.
   *
   * This test validates:
   * - Logout button visibility based on authentication state
   * - Session storage cleanup on logout
   * - Proper redirection to home page
   * - Connection status persistence after logout
   * - UI state management during logout process
   */
  test('toolbar shows Logout only when authenticated; clicking Logout clears session and returns to Home', async ({ page }) => {
    const api = await request.newContext();
    const { token, playerId } = await createGameAndJoin(api, 'GuardTester-Logout');

    // With JWT, toolbar "Logout" should be visible
    await setJwtToken(page, token, playerId);

    await page.goto('/');
    // Connected indicator should appear eventually
    await waitForConnection(page);

    const logoutButton = page.getByRole('button', { name: 'Logout' });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // After logout, we should be on home and token should be cleared
    await expect(page).toHaveURL(/\/$/);
    const stored = await page.evaluate(() => localStorage.getItem('pac-shield-jwt'));
    expect(stored).toBeNull();

    // Home still shows connection status (baseline reconnect)
    await waitForConnection(page);
    await api.dispose();
  });

  /**
   * Test Intent: Ensure initial application navigation works correctly without
   * redirect loops and displays proper connection status indicators.
   *
   * This test validates:
   * - Clean initial page loads without authentication redirects
   * - Proper home page rendering and content display
   * - Connection status indicator visibility and functionality
   * - Navigation between home and join pages
   * - Absence of infinite redirect loops
   */
  test('initial navigation loads Home and Join without redirect loops; connection status visible', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    // Home card header
    await expect(page.getByRole('heading', { name: 'OPERATION: PACIFIC SHIELD' }).or(page.getByText('OPERATION: PACIFIC SHIELD'))).toHaveCount(3);
    // Connected indicator on toolbar (allow some time)
    await waitForConnection(page);

    await page.goto('/join');
    await expect(page).toHaveURL(/\/join(\?.*)?$/);
  });
});

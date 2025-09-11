import { test, expect, request, type APIRequestContext } from '@playwright/test';

async function createGame(api: APIRequestContext, victoryConditionMP = 100) {
  const createRes = await api.post('http://localhost:3000/api/game/create', {
    data: { victoryConditionMP },
  });
  expect(createRes.ok()).toBeTruthy();
  expect(createRes.status()).toBe(201);
  const game = await createRes.json();
  return { gameId: game.id as number, roomCode: game.roomCode as string };
}

async function joinGame(api: APIRequestContext, roomCode: string, playerName: string) {
  const joinRes = await api.post('http://localhost:3000/api/player/join', {
    data: { roomCode, playerName },
  });
  expect(joinRes.ok()).toBeTruthy();
  expect(joinRes.status()).toBe(201);
  const { token, player } = await joinRes.json();
  return { token: token as string, playerId: (player?.id ?? player?.playerId) as number };
}

async function createGameAndJoin(api: APIRequestContext, playerName: string) {
  const { gameId, roomCode } = await createGame(api);
  const { token, playerId } = await joinGame(api, roomCode, playerName);
  return { gameId, roomCode, token, playerId };
}

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
    await page.addInitScript(([jwt, pid]) => {
      localStorage.setItem('pac-shield-jwt', String(jwt));
      localStorage.setItem('playerId', String(pid));
    }, [token, playerId]);

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

    await page.addInitScript(([jwt, pid]) => {
      localStorage.setItem('pac-shield-jwt', String(jwt));
      localStorage.setItem('playerId', String(pid));
    }, [token, playerId]);

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
    await page.addInitScript(([jwt, pid]) => {
      localStorage.setItem('pac-shield-jwt', String(jwt));
      localStorage.setItem('playerId', String(pid));
    }, [token, playerId]);

    await page.goto('/');
    // Connected indicator should appear eventually
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10000 });

    const logoutButton = page.getByRole('button', { name: 'Logout' });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // After logout, we should be on home and token should be cleared
    await expect(page).toHaveURL(/\/$/);
    const stored = await page.evaluate(() => localStorage.getItem('pac-shield-jwt'));
    expect(stored).toBeNull();

    // Home still shows connection status (baseline reconnect)
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10000 });
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
    await expect(page.getByText('Connected').or(page.getByText('Disconnected'))).toBeVisible({ timeout: 10000 });

    await page.goto('/join');
    await expect(page).toHaveURL(/\/join(\?.*)?$/);
  });
});

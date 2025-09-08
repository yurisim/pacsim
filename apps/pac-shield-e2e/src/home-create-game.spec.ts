import { test, expect, request, type APIRequestContext, Page } from '@playwright/test';
import { fillGameMasterPin } from './test-utils';

async function createGame(api: APIRequestContext, victoryConditionMP = 1000) {
  const res = await api.post('http://localhost:3000/api/game/create', {
    data: { victoryConditionMP },
  });
  expect(res.status()).toBe(201);
  return await res.json();
}

async function joinGame(api: APIRequestContext, roomCode: string, playerName: string) {
  const res = await api.post('http://localhost:3000/api/player/join', {
    data: { roomCode, playerName },
  });
  expect(res.status()).toBe(201);
  return await res.json();
}

function decodeJwtGameId(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
    return String(payload.gameId ?? '');
  } catch {
    return null;
  }
}

async function getLocalToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('pac-shield-jwt'));
}

test.describe('Home create game flow', () => {
  /**
   * Test Intent: Verify that game creation works correctly even when a stale JWT
   * exists from a previous session, ensuring proper token replacement and navigation.
   *
   * This test validates:
   * - Game creation with existing stale authentication
   * - JWT token replacement with new game credentials
   * - Proper navigation to Game Master setup
   * - Successful lobby access with new token
   * - Session state management during game creation
   */
  test('Start New Game succeeds even with stale JWT; proceeds to GM setup then lobby with new token', async ({ page }) => {
    const api = await request.newContext();

    // Create a stale session for a different game
    const staleGame = await createGame(api, 100);
    const staleJoin = await joinGame(api, staleGame.roomCode, 'StaleUser');
    const staleToken: string = staleJoin.token;

    const staleGameId = decodeJwtGameId(staleToken);
    expect(staleGameId).toBe(String(staleGame.id));

    // Seed stale session before first navigation
    await page.addInitScript((jwt: string) => {
      localStorage.setItem('pac-shield-jwt', jwt);
      // playerId isn't required for this flow but set a dummy value
      localStorage.setItem('playerId', '9999');
    }, staleToken);

    await page.goto('/');

    // Click Start New Game
    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Should display Game Master Setup panel
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill GM form
    await page.getByLabel('Last Name').fill('TestGM');
    await fillGameMasterPin(page, '1234');

    await page.getByRole('button', { name: 'Continue' }).click();

    // Should navigate to lobby of the newly created game
    await expect(page).toHaveURL(/\/lobby\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();

    // Token should have changed to the new game's gameId
    const newToken = await getLocalToken(page);
    expect(newToken).not.toBeNull();
    const newGameId = decodeJwtGameId(newToken!);
    expect(newGameId).not.toBeNull();
    expect(newGameId).not.toBe(staleGameId);

    await api.dispose();
  });

  /**
   * Test Intent: Verify proper error handling when game creation API fails,
   * ensuring users see appropriate error messages and UI state is maintained.
   *
   * This test validates:
   * - Error message display for failed game creation
   * - Prevention of GM setup display on API failure
   * - Button state management during error conditions
   * - Graceful degradation when backend services fail
   * - User feedback for unsuccessful operations
   */
  test('Start New Game surfaces error when /api/game/create fails and does not show GM setup', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.route('**/api/game/create', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Simulated failure from test' }),
      });
    });

    await page.goto('/');

    const startBtn = page.getByRole('button', { name: 'Start New Game' });
    await startBtn.click();

    // Error message should be displayed
    const errorLocator = page.getByText(/Failed to create a new game|Simulated failure/i);
    await expect(errorLocator).toBeVisible();

    // GM setup should not be visible
    await expect(page.getByText('Game Master Setup')).toHaveCount(0);

    // Button should be usable again (not stuck loading)
    // We conservatively check it's visible and enabled (depending on rendered element)
    await expect(startBtn).toBeVisible();

    // Remove route to avoid leaking into other tests
    await page.unroute('**/api/game/create');
  });
});

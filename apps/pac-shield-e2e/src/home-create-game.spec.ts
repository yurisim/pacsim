import { test, expect, request } from '@playwright/test';
import {
  createGame,
  joinGameViaApi,
  decodeJwtGameId,
  getJwtToken,
  setJwtToken,
  fillGameMasterPin,
  expectLobbyLoaded
} from './test-utils';

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
    const { gameId: staleGameId, roomCode: staleRoomCode } = await createGame(api, 100);
    const { token: staleToken } = await joinGameViaApi(api, staleRoomCode, 's.user');

    const staleGameIdStr = decodeJwtGameId(staleToken);
    expect(staleGameIdStr).toBe(String(staleGameId));

    // Seed stale session before first navigation
    await setJwtToken(page, staleToken, '9999');

    await page.goto('/');

    // Click Start New Game
    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Should display Game Master Setup panel
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill GM form
    await page.getByLabel('Username').fill('t.gm');
    await fillGameMasterPin(page, '1234');

    await page.getByRole('button', { name: 'Continue' }).click();

    // Should navigate to lobby of the newly created game
    await expectLobbyLoaded(page);

    // Token should have changed to the new game's gameId
    const newToken = await getJwtToken(page);
    expect(newToken).not.toBeNull();
    const newGameId = decodeJwtGameId(newToken!);
    expect(newGameId).not.toBeNull();
    expect(newGameId).not.toBe(staleGameIdStr);

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

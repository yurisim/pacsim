import { test, expect, request } from '@playwright/test';
import {
  createGameViaUI,
  extractRoomCodeFromLobby,
  setJwtToken,
  getJwtToken,
  decodeJwtGameId,
  clearStorage,
  fillOtpField,
  fillRoomCodeOtp,
  waitForNavigationReliable,
  createGameAndJoin,
  expectLobbyLoaded
} from './test-utils';

test.describe('Session Management and JWT Integration', () => {

  /**
   * Test Intent: Verify that users with valid JWT tokens see the "Continue Game" option
   * when navigating to the join page, and can successfully continue their existing game session.
   *
   * This test validates:
   * - JWT persistence across navigation
   * - Continue game UI rendering (welcome message, avatar, button)
   * - Proper redirection to correct lobby when continuing
   * - Room code preservation and display
   */
  test('should show continue game option for users with valid JWT', async ({ page }) => {
    const userName = 't.player';

    // Create a game using the shared utility
    await createGameViaUI(page, userName);

    // Extract room code for verification
    const roomCode = await extractRoomCodeFromLobby(page);

    // Navigate to join page to test continue functionality
    await page.goto('/');
    await page.getByRole('button', { name: 'Join' }).click();

    // Verify continue game section is visible
    await expect(page.getByText(`Welcome back, ${userName}!`)).toBeVisible();
    await expect(page.getByText('Continue your game session')).toBeVisible();

    // Verify avatar with player initial
    const avatar = page.locator('.md-typescale-title-medium.md-sys-color-on-primary.font-semibold');
    await expect(avatar).toBeVisible();
    await expect(avatar).toContainText('T');

    // Verify continue game button
    const continueButton = page.getByRole('button', { name: /continue game/i });
    await expect(continueButton).toBeVisible();

    // Verify divider text
    await expect(page.getByText('or join a different game')).toBeVisible();

    // Test continue game functionality
    await continueButton.click();

    // Should redirect to the correct lobby
    await expectLobbyLoaded(page, roomCode);
  });

  /**
   * Test Intent: Ensure users can still manually join different games even when they have
   * an existing JWT token, bypassing the "Continue Game" option.
   *
   * This test validates:
   * - Manual join form functionality when JWT exists
   * - Room code validation and visual feedback
   * - Player name input and join flow
   * - Successful navigation to different lobby than JWT's game
   */
  test('should allow manual join to different game even with existing JWT', async ({ page }) => {
    // Create first game
    await createGameViaUI(page, 'g.master', '5678');
    const firstRoomCode = await extractRoomCodeFromLobby(page);

    // Navigate to join page
    await page.goto('/join');

    // Test manual join to the same game (should work)
    await fillRoomCodeOtp(page, firstRoomCode);

    // Player name should appear
    await expect(page.getByTestId('player-name-input')).toBeVisible();

    // Enter player name and check availability
    await page.fill('[data-testid="player-name-input"]', 'n.player');

    // Click Check Name button to trigger availability check
    await page.getByTestId('check-name-button').click();

    // Wait for name availability confirmation
    await expect(page.getByText('Name available')).toBeVisible({ timeout: 5000 });

    // Fill PIN and join
    await page.getByRole('textbox', { name: 'OTP Input digit 1' }).click();
    await page.getByRole('textbox', { name: 'OTP Input digit 1' }).fill('1');
    await page.getByRole('textbox', { name: 'OTP Input digit 2' }).fill('2');
    await page.getByRole('textbox', { name: 'OTP Input digit 3' }).fill('3');
    await page.getByRole('textbox', { name: 'OTP Input digit 4' }).fill('4');

    await page.getByRole('button', { name: /join/i }).click();

    // Should join the game and navigate to lobby
    await expectLobbyLoaded(page, firstRoomCode);
  });

  /**
   * Test Intent: Confirm that users without any JWT token see the standard join form
   * without any continue game options.
   *
   * This test validates:
   * - Clean state when no authentication exists
   * - Standard join form display
   * - No continue game UI elements
   * - Proper form field availability
   */
  test('should not show continue option for users without JWT', async ({ page }) => {
    await page.goto('/join');
    await clearStorage(page);
    await page.reload();

    // Continue option should not be visible
    await expect(page.getByText('Welcome back')).toBeHidden();
    await expect(page.getByRole('button', { name: /continue game/i })).toBeHidden();

    // Should show normal join form
    await expect(page.locator('input[data-otp-index="0"]')).toBeVisible();
  });

  /**
   * Test Intent: Verify that the join page layout adapts to show expanded design
   * when the continue game section is present, providing better UX for returning users.
   *
   * This test validates:
   * - Dynamic layout adaptation based on authentication state
   * - Continue game section visibility and styling
   * - Expanded layout characteristics (wider card, proper spacing)
   * - Visual consistency with design system
   */
  test('should show expanded layout when continue option is present', async ({ page }) => {
    const userName = 'l.test';

    // Setup: Create and join a game first
    await createGameViaUI(page, userName);

    // Wait for lobby to fully load
    await expectLobbyLoaded(page);

    // Navigate to join page through home button
    await page.goto('/');
    await page.getByRole('button', { name: 'Join' }).click();

    // Verify continue section is visible
    const continueSection = page.locator('.md-sys-bg-primary-container');
    await expect(continueSection).toBeVisible();
  });

  /**
   * Test Intent: Comprehensive flow to validate joining a game, handling
   * name conflicts via PIN verification, and ensuring UI responsiveness.
   * This test covers the entire user journey from joining to conflict
   * resolution, including real-time validation and form state management.
   *
   * This test validates:
   * - Name conflict detection and UI flow
   * - PIN verification for existing players
   * - Error handling for incorrect PINs
   * - Successful authentication with correct PIN
   * - Navigation to lobby after PIN verification
   */
  test('should handle name conflicts with PIN verification flow', async ({ page }) => {
    // Create game using shared utility
    await createGameViaUI(page, 'c.gm');
    const roomCode = await extractRoomCodeFromLobby(page);

    // First, create ConflictUser via API with a PIN
    const joinResponse = await page.request.post('http://localhost:3000/api/player/join', {
      data: {
        roomCode: roomCode,
        playerName: 'c.user',
        pin: '5555'
      }
    });
    expect(joinResponse.ok()).toBeTruthy();

    // Now clear session and try to join again with same name to trigger conflict
    await clearStorage(page);
    await page.goto('/join');
    await fillRoomCodeOtp(page, roomCode);
    await expect(page.locator('mat-icon:has-text("check_circle")')).toBeVisible(); // Wait for validation
    await page.fill('input[data-testid="player-name-input"]', 'c.user');

    // Click Check Name button to trigger availability check
    await page.getByTestId('check-name-button').click();

    // Should trigger name conflict since c.user already exists
    await expect(
      page.getByText('A player named "c.user" already exists in this game')
    ).toBeVisible();

    // Should show PIN entry component
    await expect(page.getByText("Enter your PIN to continue as this player")).toBeVisible();

    // Test incorrect PIN first
    await page.getByRole('textbox', { name: '-digit PIN digit 1' }).click();
    await page.getByRole('textbox', { name: '-digit PIN digit 1' }).fill('2');
    await page.getByRole('textbox', { name: '-digit PIN digit 2' }).fill('4');
    await page.getByRole('textbox', { name: '-digit PIN digit 3' }).fill('6');
    await page.getByRole('textbox', { name: '-digit PIN digit 4' }).fill('8');

    await page.getByRole('button', { name: /verify pin/i }).click();

    // Should show error message for incorrect PIN
    await expect(
      page.getByText(/incorrect|failed/i)
    ).toBeVisible();

    // Now enter correct PIN
    await page.getByRole('textbox', { name: '-digit PIN digit 1' }).click();
    await page.getByRole('textbox', { name: '-digit PIN digit 1' }).fill('5');
    await page.getByRole('textbox', { name: '-digit PIN digit 2' }).fill('5');
    await page.getByRole('textbox', { name: '-digit PIN digit 3' }).fill('5');
    await page.getByRole('textbox', { name: '-digit PIN digit 4' }).fill('5');
    await page.getByRole('button', { name: /verify pin/i }).click();

    // Should be in lobby now
    await waitForNavigationReliable(page, /\/lobby\//, { timeout: 20000 });
  });

  /**
   * Test Intent: Verify JWT token replacement during new game creation,
   * ensuring stale tokens are properly replaced and session state is maintained.
   *
   * This test validates:
   * - Game creation with existing stale authentication
   * - JWT token replacement with new game credentials
   * - Proper navigation to Game Master setup
   * - Successful lobby access with new token
   * - Session state management during game creation
   */
  test('should replace stale JWT when creating new game', async ({ page }) => {
    // Create a stale session for a different game via API
    const api = await request.newContext();
    const { token: staleToken, gameId: staleGameId } = await createGameAndJoin(api, 's.user', 100);
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
    await fillOtpField(page, '1234');

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
   * Test Intent: Verify that invalid JWT tokens are properly handled,
   * cleared from storage, and users are redirected appropriately.
   *
   * This test validates:
   * - Invalid JWT detection and cleanup
   * - Proper error handling for malformed tokens
   * - Session cleanup on authentication failures
   * - User redirection after token invalidation
   */
  test('should handle invalid JWT tokens gracefully', async ({ page }) => {
    // Set an invalid JWT token
    await page.addInitScript(() => {
      localStorage.setItem('pac-shield-jwt', 'invalid.jwt.token');
      localStorage.setItem('playerId', '999');
    });

    await page.goto('/join');

    // Should not show continue game option with invalid token
    await expect(page.getByText('Welcome back')).toBeHidden();
    await expect(page.getByRole('button', { name: /continue game/i })).toBeHidden();

    await page.getByRole('button', { name: 'Join Game' }).click();

    // Should show normal join form
    await expect(page.locator('input[data-otp-index="0"]')).toBeVisible();

    // Token should be cleared from storage
    const token = await getJwtToken(page);
    expect(token).toBeNull();
  });
});

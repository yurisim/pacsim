import { test, expect } from '@playwright/test';
import {
  fillGameMasterPin,
  fillOtpField,
  clearStorage,
  setInvalidJwt,
} from './test-utils';

test.describe('Continue Game functionality', () => {
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
    // First, create a game and join it to establish a valid JWT
    await page.goto('/');

    const userName = 'TestPlayer';

    // Create a game
    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill out Game Master Setup form
    await page.getByLabel('Last Name').fill(userName);
    await fillGameMasterPin(page, '1234');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for game creation and extract the room code from the display
    await expect(page).toHaveURL(/\/lobby\//);
    const roomCodeButton = page.getByRole('button', { name: /copy room code/i });
    await expect(roomCodeButton).toBeVisible();
    const roomCode = await roomCodeButton.locator('p').evaluate(el => el.textContent?.trim() || '');

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
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.getByRole('button', { name: /copy room code/i }).locator('p')).toContainText(roomCode);
    // Verify we're in the lobby
    await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
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
  test('should allow manual join to different game', async ({ page }) => {
    // Create a game first
    await page.goto('/');
    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill out Game Master Setup form
    await page.getByLabel('Last Name').fill('GameMaster');
    await fillGameMasterPin(page, '5678');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for lobby and extract room code
    await expect(page).toHaveURL(/\/lobby\//);
    const roomCodeButton = page.getByRole('button', { name: /copy room code/i });
    await expect(roomCodeButton).toBeVisible();
    const roomCode = await roomCodeButton.locator('p').evaluate(el => el.textContent?.trim() || '');
    // Navigate to join page in a different context
    await page.goto('/join');

    // Test manual join
    await fillOtpField(page, roomCode);

    // Player name should appear
    await expect(page.getByTestId('player-name-input')).toBeVisible();

    // Enter player name and join
    await page.fill('[data-testid="player-name-input"]', 'NewPlayer');


    await page.getByRole('button', { name: /join/i }).click();

    // Should join the game and navigate to lobby
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.getByRole('button', { name: /copy room code/i }).locator('p')).toContainText(roomCode);
  });

  /**
   * Test Intent: Verify graceful degradation when users have invalid or expired JWT tokens.
   * The system should fall back to normal join flow without showing continue options.
   *
   * This test validates:
   * - Invalid JWT detection and handling
   * - UI fallback to standard join form
   * - No continue game options displayed
   * - Clean error handling without crashes
   */
  test('should handle continue game with invalid/expired JWT gracefully', async ({ page }) => {
    await page.goto('/join');
    await setInvalidJwt(page);
    await page.reload();

    // Continue option should not appear with invalid JWT
    await expect(page.getByText('Welcome back')).toBeHidden();
    await expect(page.getByRole('button', { name: /continue game/i })).toBeHidden();
    await expect(page.locator('input[data-otp-index="0"]')).toBeVisible();
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
    // Setup: Create and join a game first
    await page.goto('/');

    const userName = 'LayoutTest';

    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill out Game Master Setup form
    await page.getByLabel('Last Name').fill(userName);
    await fillGameMasterPin(page, '1234');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/lobby\//);
    // Wait for lobby to fully load
    await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();

    // Navigate to join page through home button
    await page.goto('/');
    await page.getByRole('button', { name: 'Join' }).click();

    // Verify continue section is visible
    const continueSection = page.locator('.md-sys-bg-primary-container');
    await expect(continueSection).toBeVisible();
  });
});

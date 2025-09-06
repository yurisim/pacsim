import { test, expect } from '@playwright/test';
import { fillGameMasterPin, fillOtpField } from './test-utils';

test.describe('Continue Game functionality', () => {
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
    const roomCode = (await roomCodeButton.locator('p').textContent())?.trim() ?? '';

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
    await expect(page.getByRole('button', { name: /copy room code/i }).locator('p')).toContainText(roomCode!);
    // Verify we're in the lobby
    await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
  });

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
    const roomCode = (await roomCodeButton.locator('p').textContent())?.trim() ?? '';

    // Navigate to join page in a different context
    await page.goto('/join');

    // Test manual join
    await fillOtpField(page, roomCode!);

    // Wait for room validation
    await expect(page.locator('mat-icon[fontIcon="check_circle"]')).toBeVisible();

    // Player name should appear
    await expect(page.locator('input[formControlName="playerName"]')).toBeVisible();

    // Enter player name and join
    await page.fill('input[formControlName="playerName"]', 'NewPlayer');
    await page.getByRole('button', { name: /join/i }).click();

    // Should join the game and navigate to lobby
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.getByRole('button', { name: /copy room code/i }).locator('p')).toContainText(roomCode!);
  });

  test('should handle continue game with invalid/expired JWT gracefully', async ({ page }) => {
    // Manually set an invalid JWT in localStorage
    await page.goto('/join');

    await page.evaluate(() => {
      localStorage.setItem('pac-shield-jwt', 'invalid.jwt.token');
      localStorage.setItem('pac-shield-player', JSON.stringify({
        name: 'FakePlayer',
        id: 999
      }));
    });

    // Refresh to trigger JWT validation
    await page.reload();

    // Continue option should not appear with invalid JWT
    await expect(page.getByText('Welcome back, FakePlayer!')).toBeHidden();
    await expect(page.getByRole('button', { name: /continue game/i })).toBeHidden();

    // Should show normal join form
    await expect(page.locator('input[data-otp-index="0"]')).toBeVisible();
  });

  test('should not show continue option for users without JWT', async ({ page }) => {
    // Clear any existing tokens
    await page.goto('/join');
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.reload();

    // Continue option should not be visible
    await expect(page.getByText('Welcome back')).toBeHidden();
    await expect(page.getByRole('button', { name: /continue game/i })).toBeHidden();

    // Should show normal join form
    await expect(page.locator('input[data-otp-index="0"]')).toBeVisible();

    // Form should be in compact layout (max-w-md = 448px)
    const card = page.locator('mat-card');
    await expect(card).toHaveClass(/max-w-md/);
  });

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

    // Should show expanded layout (max-w-lg = 512px) when continue option is present
    const card = page.locator('mat-card');
    await expect(card).toHaveClass(/max-w-lg/);

    // Verify continue section styling
    const continueSection = page.locator('.md-sys-bg-primary-container');
    await expect(continueSection).toBeVisible();
    await expect(continueSection).toHaveClass(/md-shape-corner-lg/);
  });
});

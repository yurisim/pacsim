import { test, expect } from '@playwright/test';

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
    await page.getByLabel('4-Digit PIN').fill('1234');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for game creation and extract the room code from the display
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.locator('.text-7xl')).toBeVisible();
    const roomCode = await page.locator('.text-7xl').textContent();

    // Navigate to join page to test continue functionality
    await page.goto('/');
    await page.getByRole('button', { name: 'Join' }).click();

    // Verify continue game section is visible
    await expect(page.getByText(`Welcome back, ${userName}!`)).toBeVisible();
    await expect(page.getByText('Continue your game session')).toBeVisible();

    // Verify avatar with player initial
    const avatar = page.locator('.w-10.h-10.rounded-full');
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
    await expect(page.locator('.text-7xl')).toContainText(roomCode!);
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
    await page.getByLabel('4-Digit PIN').fill('5678');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for lobby and extract room code
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.locator('.text-7xl')).toBeVisible();
    const roomCode = await page.locator('.text-7xl').textContent();

    // Navigate to join page in a different context
    await page.goto('/join');

    // Test manual join
    await page.fill('input[placeholder="Room Code"]', roomCode!);

    // Wait for room validation
    await expect(page.locator('mat-icon[fontIcon="check_circle"]')).toBeVisible();

    // Player name should appear
    await expect(page.locator('input[placeholder="Player Name"]')).toBeVisible();

    // Enter player name and join
    await page.fill('input[placeholder="Player Name"]', 'NewPlayer');
    await page.getByRole('button', { name: /join/i }).click();

    // Should join the game and navigate to lobby
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.locator('.text-7xl')).toContainText(roomCode!);
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
    await expect(page.getByText('Welcome back, FakePlayer!')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /continue game/i })).not.toBeVisible();

    // Should show normal join form
    await expect(page.locator('input[placeholder="Room Code"]')).toBeVisible();
  });

  test('should not show continue option for users without JWT', async ({ page }) => {
    // Clear any existing tokens
    await page.goto('/join');
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.reload();

    // Continue option should not be visible
    await expect(page.getByText('Welcome back')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /continue game/i })).not.toBeVisible();

    // Should show normal join form
    await expect(page.locator('input[placeholder="Room Code"]')).toBeVisible();

    // Form should be in compact layout (400px width)
    const card = page.locator('mat-card');
    await expect(card).toHaveClass(/w-\[400px\]/);
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
    await page.getByLabel('4-Digit PIN').fill('1234');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/lobby\//);
    // Wait for lobby to fully load
    await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();

    // Navigate to join page through home button
    await page.goto('/');
    await page.getByRole('button', { name: 'Join' }).click();

    // Should show expanded layout (450px width) when continue option is present
    const card = page.locator('mat-card');
    await expect(card).toHaveClass(/w-\[450px\]/);

    // Verify continue section styling
    const continueSection = page.locator('.bg-blue-50');
    await expect(continueSection).toBeVisible();
    await expect(continueSection).toHaveClass(/border-blue-200/);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Continue Game functionality', () => {
  test('should show continue game option for users with valid JWT', async ({ page }) => {
    // First, create a game and join it to establish a valid JWT
    await page.goto('/');
    
    // Create a game
    await page.getByRole('button', { name: /create game/i }).click();
    await page.fill('input[placeholder="Victory Condition MP"]', '100');
    await page.getByRole('button', { name: /create/i }).click();
    
    // Wait for game creation and note the room code
    await expect(page).toHaveURL(/\/lobby\//);
    const url = page.url();
    const roomCode = url.split('/lobby/')[1];
    
    // Add a player name through game master setup
    await page.getByRole('button', { name: /settings/i }).first().click();
    await page.fill('input[placeholder="Enter your name"]', 'TestPlayer');
    await page.fill('input[type="password"]', '1234');
    await page.getByRole('button', { name: /join as game master/i }).click();
    
    // Wait for successful join
    await expect(page.getByText('TestPlayer')).toBeVisible();
    
    // Now navigate to join page to test continue functionality
    await page.goto('/join');
    
    // Verify continue game section is visible
    await expect(page.getByText('Welcome back, TestPlayer!')).toBeVisible();
    await expect(page.getByText('Continue your game session')).toBeVisible();
    
    // Verify avatar with player initial
    const avatar = page.locator('p-avatar');
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
    await expect(page).toHaveURL(`/lobby/${roomCode}`);
    await expect(page.getByText('TestPlayer')).toBeVisible();
  });

  test('should allow manual join even with valid JWT', async ({ page }) => {
    // Setup: Create and join a game first
    await page.goto('/');
    await page.getByRole('button', { name: /create game/i }).click();
    await page.fill('input[placeholder="Victory Condition MP"]', '100');
    await page.getByRole('button', { name: /create/i }).click();
    
    await expect(page).toHaveURL(/\/lobby\//);
    
    // Add player name
    await page.getByRole('button', { name: /settings/i }).first().click();
    await page.fill('input[placeholder="Enter your name"]', 'ExistingPlayer');
    await page.fill('input[type="password"]', '1234');
    await page.getByRole('button', { name: /join as game master/i }).click();
    await expect(page.getByText('ExistingPlayer')).toBeVisible();
    
    // Create a second game for testing manual join
    await page.goto('/');
    await page.getByRole('button', { name: /create game/i }).click();
    await page.fill('input[placeholder="Victory Condition MP"]', '150');
    await page.getByRole('button', { name: /create/i }).click();
    
    const secondGameUrl = page.url();
    const secondRoomCode = secondGameUrl.split('/lobby/')[1];
    
    // Navigate to join page
    await page.goto('/join');
    
    // Verify continue option is visible
    await expect(page.getByText('Welcome back, ExistingPlayer!')).toBeVisible();
    
    // But test manual join to different game
    await page.fill('input[placeholder="Room Code"]', secondRoomCode);
    
    // Wait for room validation
    await expect(page.locator('.pi-check')).toBeVisible();
    
    // Player name should appear
    await expect(page.locator('input[placeholder="Player Name"]')).toBeVisible();
    
    // Enter different name and join
    await page.fill('input[placeholder="Player Name"]', 'DifferentPlayer');
    await page.getByRole('button', { name: /join/i }).click();
    
    // Should join the second game
    await expect(page).toHaveURL(`/lobby/${secondRoomCode}`);
    await expect(page.getByText('DifferentPlayer')).toBeVisible();
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
    const card = page.locator('p-card');
    await expect(card).toHaveClass(/w-\[400px\]/);
  });

  test('should show expanded layout when continue option is present', async ({ page }) => {
    // Setup: Create and join a game first
    await page.goto('/');
    await page.getByRole('button', { name: /create game/i }).click();
    await page.fill('input[placeholder="Victory Condition MP"]', '100');
    await page.getByRole('button', { name: /create/i }).click();
    
    await expect(page).toHaveURL(/\/lobby\//);
    
    await page.getByRole('button', { name: /settings/i }).first().click();
    await page.fill('input[placeholder="Enter your name"]', 'LayoutTest');
    await page.fill('input[type="password"]', '1234');
    await page.getByRole('button', { name: /join as game master/i }).click();
    await expect(page.getByText('LayoutTest')).toBeVisible();
    
    // Navigate to join page
    await page.goto('/join');
    
    // Should show expanded layout (450px width) when continue option is present
    const card = page.locator('p-card');
    await expect(card).toHaveClass(/w-\[450px\]/);
    
    // Verify continue section styling
    const continueSection = page.locator('.bg-blue-50');
    await expect(continueSection).toBeVisible();
    await expect(continueSection).toHaveClass(/border-blue-200/);
  });
});
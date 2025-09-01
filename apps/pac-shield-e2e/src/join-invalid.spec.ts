import { test, expect } from '@playwright/test';

test.describe('Join page - invalid room code', () => {
  test('should display error message for non-existing room', async ({ page }) => {
    // Navigate directly to the join screen
    await page.goto('/join');

    // Fill the form with a clearly invalid room code and any name
    await page.fill('input[placeholder="Room Code"]', 'BAD123');
    await page.fill('input[placeholder="Player Name"]', 'Tester');

    // Attempt to join
    await page.getByRole('button', { name: /join/i }).click();

    // Expect the UI to show the specific error message
    const error = page.getByText('Invalid room code');
    await expect(error).toBeVisible();

    // Ensure we remain on the join page (no redirect)
    await expect(page).toHaveURL(/\/join/);
  });
});

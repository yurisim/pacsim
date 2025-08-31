import { test, expect } from '@playwright/test';

test('should create a new game and navigate to the game board', async ({ page }) => {
  // Navigate to the homepage.
  await page.goto('/');

  // Click the "Start New Game" button.
  await page.getByRole('button', { name: 'Start New Game' }).click();

  // Wait for the navigation to the game board to complete.
  await page.waitForURL('**/game/*');

  // Assert that the game board has loaded by checking for the heading.
  const heading = page.getByRole('heading', { name: /Game Board:/ });
  await expect(heading).toBeVisible();
});

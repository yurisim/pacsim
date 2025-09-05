import { test, expect } from '@playwright/test';

test('should create a new game and navigate to the game board', async ({
  page,
}) => {
  // Navigate to the homepage.
  await page.goto('/');

  // Wait for WebSocket connection to be established
  await expect(page.locator('mat-icon[fontIcon="wifi"]')).toBeVisible();
  await expect(page.locator('span', { hasText: 'Connected' })).toBeVisible();

  // Click the "Start New Game" button.
  await page.getByRole('button', { name: 'Start New Game' }).click();

  // Wait for Game Master Setup form to appear

  await expect(page.getByText('Game Master Setup')).toBeVisible();

  // Fill out Game Master Setup form
  await page.getByLabel('Last Name').fill('TestGM');
  await page.getByLabel('4-Digit PIN').fill('1234');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Assert that the game lobby has loaded by checking for the heading.
  const heading = page.getByRole('heading', { name: 'Game Lobby' });
  await expect(heading).toBeVisible();
});

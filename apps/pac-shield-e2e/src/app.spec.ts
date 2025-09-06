import { test, expect } from '@playwright/test';

test.describe('App Component', () => {
  test.setTimeout(10000);

  test('should display connected status on load', async ({ page }) => {
    await page.goto('/');

    // Wait for the connected status to appear
    const connectedIcon = page.locator('mat-icon[fontIcon="wifi"]');
    const connectedText = page.locator('span', { hasText: 'Connected' });

    // Assert that the connected icon and text are visible
    await expect(connectedIcon).toBeVisible();
    await expect(connectedText).toBeVisible();
  });
});

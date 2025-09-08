import { test, expect } from '@playwright/test';

test.describe('App Component', () => {
  test.setTimeout(10000);

  /**
   * Test Intent: Verify that the application displays the correct connection status
   * on initial load, ensuring users can see the WebSocket connection state.
   *
   * This test validates:
   * - Initial page load displays connection status
   * - WebSocket connection indicator is visible
   * - Connection status text is properly shown
   * - UI elements render correctly on application startup
   */
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

import { test, expect } from '@playwright/test';
import { fillRoomCodeOtp } from './test-utils';

test.describe('Join page - invalid room code', () => {
  test('should display error message for non-existing room', async ({ page }) => {
    // Navigate directly to the join screen
    await page.goto('/join');

    // Fill the OTP input with a clearly invalid room code
    await fillRoomCodeOtp(page, 'BAD123');

    // Wait for validation to complete
    await page.waitForSelector('mat-icon[fontIcon="cancel"]', { timeout: 5000 });

    // Expect the UI to show the error icon
    const errorIcon = page.locator('mat-icon[fontIcon="cancel"]');
    await expect(errorIcon).toBeVisible();

    // Ensure we remain on the join page (no redirect)
    await expect(page).toHaveURL(/\/join/);
  });
});

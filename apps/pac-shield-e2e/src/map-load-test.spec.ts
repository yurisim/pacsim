import { test, expect } from '@playwright/test';
import { fillGameMasterPin } from './test-utils';

/**
 * Barebones map loading test.
 * Simple verification that the MapLibre GL map loads without errors.
 */
test('map should load successfully', async ({ page }) => {
  // Create game and navigate to map
  await page.goto('/');

  // Wait for connection
  await expect(page.locator('mat-icon:has-text("wifi")')).toBeVisible();

  // Create new game
  await page.getByRole('button', { name: 'Start New Game' }).click();
  await expect(page.getByText('Game Master Setup')).toBeVisible();

  // Setup GM
  await page.getByLabel('Last Name').fill('MapTest');
  await fillGameMasterPin(page, '1234');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Navigate to map
  await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
  await page.getByRole('button', { name: 'View Pacific Map' }).click();

  // Verify map loads
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

  // Verify no error messages
  await expect(page.locator('text=Error loading game')).not.toBeVisible();

  await page.locator('div').filter({ hasText: /^homeKadena$/ }).locator('span').click();
  await page.locator('app-location-panel').getByRole('button').click();
  await page.getByRole('tab', { name: 'FOS' }).click();
  await page.getByRole('button', { name: 'Activate' }).click();
  await page.getByRole('combobox', { name: 'Assign to Team' }).locator('span').click();
  await page.getByRole('option', { name: 'MOB Yokota, Japan (MOB_YOKOTA)' }).click();
  await page.getByRole('button', { name: 'Activate FOS' }).click();
  await expect(page.getByText('activated successfully')).toBeVisible({ timeout: 5000 });
});

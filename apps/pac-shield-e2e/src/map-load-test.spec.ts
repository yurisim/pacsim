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
  await page.getByLabel('Username').fill('m.test');
  await fillGameMasterPin(page, '1234');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Navigate to map
  await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
  await page.getByRole('button', { name: 'View Pacific Map' }).click();

  // Verify map loads
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

  // Verify no error messages
  await expect(page.locator('text=Error loading game')).toBeHidden();

  await page.locator('div').filter({ hasText: /^homeKadena$/ }).locator('span').click();
  await page.locator('app-location-panel').getByRole('button').click();
  await page.getByRole('tab', { name: 'FOS' }).click();
  await page.getByRole('button', { name: 'Activate' }).click();
  await page.getByRole('combobox', { name: 'Assign to Team' }).locator('span').click();
  await page.getByRole('option', { name: 'MOB Yokota, Japan (MOB_YOKOTA)' }).click();
  await page.getByRole('button', { name: 'Activate FOS' }).click();
  await expect(page.getByText('activated successfully')).toBeVisible();

  // Wait for activation snackbar to disappear before proceeding
  await expect(page.getByText('activated successfully')).toBeHidden({ timeout: 5000 });

  // Switch to Tasks subview and verify it renders
  await page.getByRole('button', { name: 'Tasks' }).click();
  await page.getByRole('heading', { name: 'Overall Progress' }).click();

  // Close the Tasks dialog using a more specific selector
await page.getByRole('button').filter({ hasText: 'close' }).click();

  // Test FOS deactivation with confirmation dialog
  await page.getByRole('button', { name: 'Deactivate' }).click();

  // Verify confirmation dialog appears
  await expect(page.getByText('Deactivate FOS 5')).toBeVisible();
  await expect(page.getByText('Are you sure you want to deactivate this FOS?')).toBeVisible();

  // Confirm deactivation
  await page.getByRole('button', { name: 'Deactivate FOS' }).click();
  await expect(page.getByText('deactivated successfully')).toBeVisible();

  // Wait for deactivation snackbar to disappear and UI to update
  await expect(page.getByText('deactivated successfully')).toBeHidden({ timeout: 5000 });

  // Verify the button changed back to "Activate" after deactivation
  await expect(page.getByRole('button', { name: 'Activate' })).toBeVisible();
});

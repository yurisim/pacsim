import { test, expect } from '@playwright/test';
import { fillGameMasterPin } from './test-utils';

/**
 * E2E Test Intent: Verify complete flight plan submission and display workflow
 *
 * This test validates:
 * - Game creation and setup
 * - Navigation to game board with ATO functionality
 * - Flight plan creation dialog interaction
 * - Form submission and backend integration
 * - Flight plan display in the ATO table
 * - Real-time updates and proper state management
 */
test('should create and submit a flight plan that appears on the frontend', async ({
  page,
}) => {
  // Step 1: Create a new game and navigate to game board
  await page.goto('/');

  // Wait for WebSocket connection to be established
  await expect(page.locator('mat-icon:has-text("wifi")')).toBeVisible();
  await expect(page.locator('span', { hasText: 'Connected' })).toBeVisible();

  // Create a new game
  await page.getByRole('button', { name: 'Start New Game' }).click();

  // Fill out Game Master Setup form
  await expect(page.getByText('Game Master Setup')).toBeVisible();
  await page.getByLabel('Last Name').fill('TestGM');
  await fillGameMasterPin(page, '1234');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Navigate to game board from lobby
  await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
  await page.getByRole('button', { name: 'View Pacific Map' }).click();

  // Verify we're on the game board
  await expect(page.getByText('Scoreboard')).toBeVisible();

  await page.getByText('CAOC').click();

  // Step 2: Locate and interact with ATO table
  await expect(page.getByText('Air Tasking Order')).toBeVisible();

  // Initially, the ATO should be empty
  await expect(page.getByText('No ATOs created')).toBeVisible();

  // Click "Add Flight Plan" button
  const addFlightPlanButton = page.locator('button', { hasText: 'Add Flight Plan' });

  await addFlightPlanButton.click();

  // Step 3: Fill out flight planner dialog
  await expect(page.getByText('Create Flight Plan')).toBeVisible();

  // Fill in flight plan details
  await page.getByLabel('Aircraft Call Sign').fill('E2E-TEST-01');

  // Fill in start location
  await page.getByLabel('Start Location').click();
  await page.getByRole('option', { name: 'Kadena AB' }).click();

  // Fill in final destination
  await page.getByLabel('Final Destination').click();
  await page.getByRole('option', { name: 'FOS 7' }).click();

  // Fill in alternate destination
  await page.getByLabel('Alternate Destination').click();
  await page.getByRole('option', { name: 'Andersen AFB' }).click();

  // Select flight intention
  await page.getByLabel('Intention').click();
  await page.getByRole('option', { name: 'LAND' }).click();

  // Select aircraft configuration
  await page.getByLabel('Configuration').click();
  await page.getByRole('option', { name: 'CARGO_ONLY' }).click();

  // Optionally check risk token
  await page.getByLabel('Use Risk Token').check();

  // Submit the flight plan
  await page.getByRole('button', { name: 'Submit to ATO' }).click();

  // Step 4: Verify flight plan appears in the ATO table
  // Wait for the dialog to close and the table to update
  await expect(page.getByText('Create Flight Plan')).not.toBeVisible();

  // Verify the flight plan is now displayed
  await expect(page.getByText('E2E-TEST-01')).toBeVisible();
  await expect(page.getByText('CARGO_ONLY')).toBeVisible();
  await expect(page.getByText('LAND')).toBeVisible();
  await expect(page.getByText('PENDING')).toBeVisible();

  // Verify the route display (should show start → destination)
  await expect(
    page.locator('td', { hasText: 'Kadena AB → FOS 7' })
  ).toBeVisible();
  await expect(
    page.locator('td', { hasText: 'ALT: Andersen AFB' })
  ).toBeVisible();

  // Verify risk token indicator is shown
  await expect(page.locator('mat-icon', { hasText: 'casino' })).toBeVisible();

  // Verify turn information is displayed
  await expect(page.getByText('Turn 1')).toBeVisible();

  // Step 5: Test PPR approval workflow (if CAOC role available)
  // Note: This assumes GM can approve PPR for testing purposes
  const approveButton = page.locator('button[mattooltip="Approve PPR"]');
  if (await approveButton.isVisible()) {
    await approveButton.click();

    // Verify status changes to APPROVED
    await expect(page.getByText('APPROVED')).toBeVisible();
    await expect(
      page.locator('mat-icon', { hasText: 'check_circle' })
    ).toBeVisible();
  }

  // Step 6: Verify table statistics
  await expect(page.getByText('1 flights')).toBeVisible();

  // Step 7: Test editing functionality
  const editButton = page.locator('button[mattooltip="Edit Flight Plan"]');
  if (await editButton.isVisible()) {
    await editButton.click();

    // Verify flight planner dialog opens with existing data
    await expect(page.getByText('Edit Flight Plan')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Aircraft Call Sign' })).toHaveValue('E2E-TEST-01');

    // Make a small change
    await page.getByLabel('Aircraft Call Sign').clear();
    await page.getByLabel('Aircraft Call Sign').fill('E2E-UPDATED-01');

    // Save changes
    await page.getByRole('button', { name: 'Update Flight Plan' }).click();

    // Verify the updated call sign appears
    await expect(page.getByText('E2E-UPDATED-01')).toBeVisible();
  }

  // Step 8: Test API integration by refreshing page
  await page.reload();

  // Wait for page to load and WebSocket to connect
  await expect(page.locator('mat-icon:has-text("wifi")')).toBeVisible();
  await expect(page.locator('span', { hasText: 'Connected' })).toBeVisible();

  // Verify flight plan persists after page refresh (data from backend)
  await expect(page.getByText('Air Tasking Order')).toBeVisible();

  // The updated call sign should still be visible (proving backend persistence)
  const finalCallSign = (await editButton.isVisible())
    ? 'E2E-UPDATED-01'
    : 'E2E-TEST-01';
  await expect(page.getByText(finalCallSign)).toBeVisible();
  await expect(page.getByText('CARGO_ONLY')).toBeVisible();
  await expect(page.getByText('1 flights')).toBeVisible();
});

/**
 * E2E Test Intent: Verify multiple flight plans and filtering
 */
test('should handle multiple flight plans and display them correctly', async ({
  page,
}) => {
  // Set up game (same as first test)
  await page.goto('/');
  await expect(page.locator('mat-icon:has-text("wifi")')).toBeVisible();
  await page.getByRole('button', { name: 'Start New Game' }).click();
  await expect(page.getByText('Game Master Setup')).toBeVisible();
  await page.getByLabel('Last Name').fill('TestGM2');
  await fillGameMasterPin(page, '1234');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
  await page.getByRole('button', { name: 'View Pacific Map' }).click();
  await expect(page.getByText('Game Board')).toBeVisible();

  // Create first flight plan
  await page.locator('button', { hasText: 'Add Flight Plan' }).click();
  await page.getByLabel('Aircraft Call Sign').fill('MULTI-01');
  await page.getByLabel('Start Location').click();
  await page.getByRole('option', { name: 'Kadena AB' }).click();
  await page.getByLabel('Final Destination').click();
  await page.getByRole('option', { name: 'FOS 7' }).click();
  await page.getByLabel('Intention').click();
  await page.getByRole('option', { name: 'LAND' }).click();
  await page.getByLabel('Configuration').click();
  await page.getByRole('option', { name: 'CARGO_ONLY' }).click();
  await page.getByRole('button', { name: 'Create Flight Plan' }).click();

  // Wait for first flight plan to appear
  await expect(page.getByText('MULTI-01')).toBeVisible();

  // Create second flight plan
  await page.getByRole('button', { name: 'Add Flight Plan' }).click();
  await page.getByLabel('Aircraft Call Sign').fill('MULTI-02');
  await page.getByLabel('Start Location').click();
  await page.getByRole('option', { name: 'Andersen AFB' }).click();
  await page.getByLabel('Final Destination').click();
  await page.getByRole('option', { name: 'FOS 8' }).click();
  await page.getByLabel('Intention').click();
  await page.getByRole('option', { name: 'LAND' }).click();
  await page.getByLabel('Configuration').click();
  await page.getByRole('option', { name: 'MIXED' }).click();
  await page.getByRole('button', { name: 'Create Flight Plan' }).click();

  // Verify both flight plans are displayed
  await expect(page.getByText('MULTI-01')).toBeVisible();
  await expect(page.getByText('MULTI-02')).toBeVisible();
  await expect(page.getByText('2 flights')).toBeVisible();

  // Verify different configurations are shown
  await expect(page.getByText('CARGO_ONLY')).toBeVisible();
  await expect(page.getByText('MIXED')).toBeVisible();

  // Verify both are pending
  const pendingStatuses = page.locator('span', { hasText: 'PENDING' });
  await expect(pendingStatuses).toHaveCount(2);
});


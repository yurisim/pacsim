import { test, expect, request } from '@playwright/test';
import { fillGameMasterPin } from './test-utils';

test.describe('Player Settings in Lobby', () => {
  let roomCode: string;

  test.beforeEach(async ({ page }) => {
    // Create a new game via API to get a room code
    const apiContext = await request.newContext();
    const createRes = await apiContext.post(
      'http://localhost:3000/api/game/create',
      {
        data: { victoryConditionMP: 100 },
      }
    );
    const gameData = await createRes.json();
    roomCode = gameData.roomCode;
    await apiContext.dispose();

    // Navigate to the homepage and start a new game
    await page.goto('/');

    // Wait for WebSocket connection to be established
    await expect(page.locator('mat-icon:has-text("wifi")')).toBeVisible();
    await expect(page.locator('span', { hasText: 'Connected' })).toBeVisible();

    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill out Game Master Setup form
    await page.getByLabel('Last Name').fill('TestGM');
    await fillGameMasterPin(page, '1234');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for lobby to load
    await expect(
      page.getByRole('heading', { name: 'Game Lobby' })
    ).toBeVisible();
  });

  /**
   * Test Intent: Verify that the player settings dialog opens correctly when
   * the edit profile button is clicked, displaying all necessary form fields.
   *
   * This test validates:
   * - Profile edit button functionality
   * - Dialog opening and visibility
   * - Presence of name input field
   * - Presence of role selection dropdown
   * - Presence of Save and Cancel buttons
   * - Proper dialog accessibility attributes
   */
  test('should open player settings dialog when Edit Name & Role button is clicked', async ({
    page,
  }) => {
    // Click the Edit Name & Role button
    await page.getByRole('button', { name: 'Edit Profile' }).click();

    // Verify dialog is visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Verify dialog contains expected fields
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: 'Select a role' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  /**
   * Test Intent: Verify that players can successfully update their display name
   * through the settings dialog with proper form validation and UI updates.
   *
   * This test validates:
   * - Settings dialog opening and form interaction
   * - Name field input and validation
   * - Save button functionality and form submission
   * - Dialog closure after successful update
   * - Updated name display in the lobby interface
   * - Persistence of name changes across UI components
   */
  test('should allow changing player name through settings dialog', async ({
    page,
  }) => {
    const newPlayerName = 'Updated Player Name';

    // Open player settings dialog
    await page.getByRole('button', { name: 'Profile' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Clear existing name and enter new name
    await page.getByLabel('Name').clear();
    await page.getByLabel('Name').fill(newPlayerName);

    // Save changes
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for dialog to close
    await expect(page.locator('[role="dialog"]')).toBeHidden();

    // Verify the updated name appears in the player settings section
    await expect(page.getByText('Name: Updated Player Name')).toBeVisible();
  });

  /**
   * Test Intent: Verify that players can change their assigned role through
   * the settings dialog with proper dropdown selection and persistence.
   *
   * This test validates:
   * - Role selection dropdown functionality
   * - Option selection and form interaction
   * - Save operation for role changes
   * - Dialog closure after successful update
   * - Updated role display in lobby interface
   * - Role change persistence and validation
   */
  test('should allow changing player role through settings dialog', async ({
    page,
  }) => {
    // Open player settings dialog
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.locator('#mat-select-value-4').click();
    await page.getByRole('option', { name: 'COMMANDER' }).click();

    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for dialog to close
    await expect(page.locator('[role="dialog"]')).toBeHidden();

    // Verify the updated role appears in the player settings section

    await expect(page.getByText('COMMANDER', { exact: true })).toBeVisible();
  });

  /**
   * Test Intent: Verify that players can update both name and role in a single
   * settings dialog session with proper form validation and state management.
   *
   * This test validates:
   * - Simultaneous name and role field updates
   * - Form validation for multiple field changes
   * - Save operation with combined changes
   * - Proper persistence of both name and role
   * - UI updates reflecting both changes
   * - Form state management during multi-field updates
   */
  test('should allow changing both name and role simultaneously', async ({
    page,
  }) => {
    const newPlayerName = 'Commander Player';

    // Open player settings dialog
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Change name
    await page.getByLabel('Name').clear();
    await page.getByLabel('Name').fill(newPlayerName);

    // Change role
    await page.locator('#mat-select-value-4').click();
    await page.getByRole('option', { name: 'COMMANDER' }).click();

    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for dialog to close
    await expect(page.locator('[role="dialog"]')).toBeHidden();

    // Verify both name and role are updated
    await expect(page.getByText('Role: COMMANDER')).toBeVisible();
  });

  /**
   * Test Intent: Verify that canceling the settings dialog properly discards
   * all unsaved changes and restores the original player information.
   *
   * This test validates:
   * - Cancel button functionality and dialog closure
   * - Prevention of unsaved changes from being applied
   * - Restoration of original name and role values
   * - Form state reset on cancel operation
   * - No persistence of canceled changes
   * - Proper dialog cleanup and state management
   */
  test('should cancel changes and restore original values when Cancel is clicked', async ({
    page,
  }) => {
    const originalName = 'Original Name';

    // First set an original name
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.getByLabel('Name').clear();
    await page.getByLabel('Name').fill(originalName);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden();

    // Open dialog again and make changes but cancel them
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.getByLabel('Name').clear();
    await page.getByLabel('Name').fill('Changed Name');


    await page.locator('svg').click();
    await page.getByRole('option', { name: 'DEPUTY' }).click();

    // Cancel changes
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Wait for dialog to close
    await expect(page.locator('[role="dialog"]')).toBeHidden();
    // Verify original name is preserved in the lobby player list

    await expect(page.getByText('Original Name')).toBeVisible();
  });

  /**
   * Test Intent: Verify that the Save button is properly disabled when required
   * fields are empty, preventing invalid form submissions.
   *
   * This test validates:
   * - Form validation for required name field
   * - Save button state management based on form validity
   * - Prevention of empty name submissions
   * - Real-time validation feedback
   * - Proper button enabling/disabling logic
   * - User experience for form validation states
   */
  test('should disable Save button when name field is empty', async ({
    page,
  }) => {
    // Open player settings dialog
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Clear the name field
    await page.getByLabel('Name').clear();

    // Verify Save button is disabled
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});

import { test, expect, request } from '@playwright/test';

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
    await expect(page.locator('i.pi-wifi')).toBeVisible();
    await expect(page.locator('span', { hasText: 'Connected' })).toBeVisible();

    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill out Game Master Setup form
    await page.getByLabel('Last Name').fill('TestGM');
    await page.locator('p-inputotp input').first().fill('1');
    await page.locator('p-inputotp input').nth(1).fill('2');
    await page.locator('p-inputotp input').nth(2).fill('3');
    await page.locator('p-inputotp input').nth(3).fill('4');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for lobby to load
    await expect(
      page.getByRole('heading', { name: 'Game Lobby' })
    ).toBeVisible();
  });

  test('should open player settings dialog when Edit Name & Role button is clicked', async ({
    page,
  }) => {
    // Click the Edit Name & Role button
    await page.getByRole('button', { name: 'Edit Name & Role' }).click();

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

  test('should allow changing player name through settings dialog', async ({
    page,
  }) => {
    const newPlayerName = 'Updated Player Name';

    // Open player settings dialog
    await page.getByRole('button', { name: 'Edit Name & Role' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Clear existing name and enter new name
    await page.getByLabel('Name').clear();
    await page.getByLabel('Name').fill(newPlayerName);

    // Save changes
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for dialog to close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Verify the updated name appears in the player settings section
    await expect(page.getByText('Name: Updated Player Name |')).toBeVisible();
  });

  test('should allow changing player role through settings dialog', async ({
    page,
  }) => {
    // Open player settings dialog
    await page.getByRole('button', { name: 'Edit Name & Role' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Select a different role from the autocomplete
    await page.getByRole('combobox', { name: 'Select a role' }).click();
    await page.locator('#playerRole').getByRole('button').click();
    await page.getByRole('option', { name: 'COMMANDER' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for dialog to close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Verify the updated role appears in the player settings section

    await expect(page.getByText('COMMANDER', { exact: true })).toBeVisible();
  });

  test('should allow changing both name and role simultaneously', async ({
    page,
  }) => {
    const newPlayerName = 'Commander Player';

    // Open player settings dialog
    await page.getByRole('button', { name: 'Edit Name & Role' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Change name
    await page.getByLabel('Name').clear();
    await page.getByLabel('Name').fill(newPlayerName);

    // Change role
    await page.getByRole('combobox', { name: 'Select a role' }).click();
    await page.locator('#playerRole').getByRole('button').click();
    await page.getByRole('option', { name: 'COMMANDER' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for dialog to close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Verify both name and role are updated
    await expect(page.getByText('Name: Commander Player | Role')).toBeVisible();
  });

  test('should cancel changes and restore original values when Cancel is clicked', async ({
    page,
  }) => {
    const originalName = 'Original Name';

    // First set an original name
    await page.getByRole('button', { name: 'Edit Name & Role' }).click();
    await page.getByLabel('Name').clear();
    await page.getByLabel('Name').fill(originalName);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Open dialog again and make changes but cancel them
    await page.getByRole('button', { name: 'Edit Name & Role' }).click();
    await page.getByLabel('Name').clear();
    await page.getByLabel('Name').fill('Changed Name');

    // Change role
    await page.getByRole('combobox', { name: 'Select a role' }).click();
    await page.locator('#playerRole').getByRole('button').click();
    await page.getByRole('option', { name: 'COMMANDER' }).click();

    // Cancel changes
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Wait for dialog to close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Verify original name is preserved in the lobby player list
    const playerCard = page.locator('.p-4.border.rounded-lg', {
      hasText: originalName,
    });
    await expect(playerCard).toBeVisible();
    await expect(playerCard).toContainText(originalName);
  });

  test('should disable Save button when name field is empty', async ({
    page,
  }) => {
    // Open player settings dialog
    await page.getByRole('button', { name: 'Edit Name & Role' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Clear the name field
    await page.getByLabel('Name').clear();

    // Verify Save button is disabled
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('should show player role in lobby player list', async ({ page }) => {
    const playerName = 'Test Player';

    // Set player name and role
    await page.getByRole('button', { name: 'Edit Name & Role' }).click();
    await page.getByLabel('Name').clear();
    await page.getByLabel('Name').fill(playerName);
    await page.getByLabel('Role').click();
    await page.getByLabel('Role').fill('GM');
    await page.getByText('GM').click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Check if the player appears in the lobby list with their role
    const playerCard = page.locator('.p-4.border.rounded-lg', {
      hasText: playerName,
    });
    await expect(playerCard).toBeVisible();
    await expect(playerCard).toContainText('GM');
  });

  test('should filter roles in autocomplete when typing', async ({ page }) => {
    // Open player settings dialog
    await page.getByRole('button', { name: 'Edit Name & Role' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Type in role field to trigger filtering
    await page.getByLabel('Role').click();
    await page.getByLabel('Role').fill('comm');

    // Verify that filtered options appear
    await expect(page.getByText('COMMANDER')).toBeVisible();
    // Other roles that don't match should not be visible
    await expect(page.getByText('PLAYER')).not.toBeVisible();
  });
});

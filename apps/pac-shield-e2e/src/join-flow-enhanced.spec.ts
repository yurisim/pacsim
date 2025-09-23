import { test, expect } from '@playwright/test';
import {
  waitForJoinStep,
  waitForNavigationReliable,
  waitForLobbyLoaded,
  submitFormReliably,
  getElementReliably,
  createTestIsolation,
  fillRoomCodeOtp,
  fillOtp,
  generateTestIds,
  createGame
} from './test-utils';

/**
 * Core Join Flow Tests - Essential Functionality Only
 *
 * This test suite covers the essential join flow functionality that's not
 * covered by other test files. Redundant tests have been removed.
 */
test.describe('Core Join Flow Tests', () => {

  /**
   * Test room code validation with proper visual feedback states.
   * Essential for testing the core room validation functionality.
   */
  test('should validate room code with visual feedback', async ({ page }) => {
    // Create a fresh game using shared utility
    const { roomCode } = await createGame(page, 100);

    await page.goto('/join');

    // wait for join page to load
    await expect(page.getByText('Join Game')).toBeVisible({ timeout: 5000 });

    // Test invalid room code first - fill each OTP input directly
    const inputs = await page.locator('input[data-otp-index]').all();
    await inputs[0].fill('I');
    await inputs[1].fill('N');
    await inputs[2].fill('V');
    await inputs[3].fill('A');
    await inputs[4].fill('L');
    await inputs[5].fill('D');

    // Wait for validation spinner
    await expect(page.locator('mat-progress-spinner')).toBeVisible({ timeout: 5000 });

    // Wait for error icon and message
    await expect(page.locator('mat-icon:has-text("cancel"), mat-icon:has-text("error"), .error-icon')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Invalid room code')).toBeVisible({ timeout: 3000 });

    // Test valid room code - clear and fill with valid code
    for (let i = 0; i < roomCode.length; i++) {
      await inputs[i].clear();
      await inputs[i].fill(roomCode[i]);
    }

    // Wait for success icon
    await expect(page.locator('mat-icon:has-text("check_circle"), mat-icon:has-text("check"), .success-icon')).toBeVisible({ timeout: 10000 });

    // Player name field should become visible
    await expect(page.locator('[data-testid="player-name-input"]')).toBeVisible({ timeout: 5000 });
  });

  // /**
  //  * Test the "I'm a new person" flow for name conflicts.
  //  * This is a critical path that's not covered elsewhere.
  //  */
  // test('should complete "I\'m a new person" flow for name conflicts', async ({ page }) => {
  //   const { setup, cleanup } = createTestIsolation(page, 'new-person-flow');
  //   const testIds = generateTestIds('new-person-reliable');

  //   try {
  //     // Setup isolated game with name conflict scenario
  //     const gameData = await setup('name-conflict');

  //     // Navigate to join page
  //     await page.goto('/join');

  //     // Fill room code with enhanced validation waiting
  //     await fillRoomCodeOtp(page, gameData.roomCode);
  //     await expect(page.locator('mat-icon:has-text("check_circle")')).toBeVisible({ timeout: 10000 });

  //     // Enter conflicting name
  //     const playerNameInput = await getElementReliably(page, [
  //       '[data-testid="player-name-input"]',
  //       'input[aria-label*="player name"]',
  //       'input[formControlName="playerName"]'
  //     ]);

  //     await playerNameInput.fill('c.user');

  //     // Click Check Name button to trigger availability check
  //     const checkNameButton = await getElementReliably(page, [
  //       '[data-testid="check-name-button"]',
  //       'button:has-text("Check Name")',
  //       'button:has-text("Check")'
  //     ]);
  //     await checkNameButton.click();

  //     // Verify we're on conflict step with proper UI elements
  //     await expect(page.getByText(`A player named "c.user" already exists in this game`))
  //       .toBeVisible({ timeout: 5000 });

  //     // Click "I'm a new person"
  //     const newPersonButton = await page.getByTestId('new-person-button');
  //     await newPersonButton.click();

  //     // Wait for transition to new person step
  //     await waitForJoinStep(page, 'new', 10000);

  //     await page.getByTestId('new-player-name-input').click();

  //     const newNameInput = page.getByTestId('new-player-name-input').first();
  //     await newNameInput.click();

  //     const uniqueName = testIds.playerName;
  //     await newNameInput.fill(uniqueName);

  //     // Enter PIN
  //     await fillOtp(page, 'new-person-pin-otp', '1234');

  //     // Check name availability
  //     const checkButton = await getElementReliably(page, [
  //       '[data-testid="check-name-availability"]',
  //       'button:has-text("availability")'
  //     ]);

  //     await checkButton.click();

  //     // Wait for availability confirmation
  //     await expect(page.getByText('This name is available!')).toBeVisible({ timeout: 8000 });

  //     // Create new player
  //     await submitFormReliably(
  //       page,
  //       '[data-testid="create-new-player"]',
  //       { navigatesTo: /\/lobby\//, timeout: 15000 }
  //     );

  //     // Verify successful navigation to lobby
  //     await waitForLobbyLoaded(page, gameData.roomCode, 10000);

  //     // Verify new player name appears in lobby
  //     await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 5000 });

  //   } finally {
  //     await cleanup();
  //   }
  // });
});

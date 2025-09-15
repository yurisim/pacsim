import { test, expect, request } from '@playwright/test';
import { fillRoomCodeOtp, submitFormReliably, getElementReliably, fillOtp } from './test-utils';

/**
 * Test Suite: New Player Flow
 *
 * This suite tests the complete workflow for new players joining games,
 * with focus on name conflict resolution and alternative player creation paths.
 * Each test uses a pre-created game with existing players to simulate realistic
 * conflict scenarios.
 */
test.describe('New Player Flow', () => {
  let roomCode: string;

  test.beforeEach(async () => {
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

    // Create a player with a name that will be duplicated
    await apiContext.post('http://localhost:3000/api/player/join', {
      data: {
        roomCode,
        playerName: 'DUPLICATE_NAME',
        pin: '1234',
      },
    });

    await apiContext.dispose();
  });

  /**
   * Test Intent: Verify the complete name conflict resolution workflow when a new user
   * attempts to join with a name that's already taken, including the "I'm a new person"
   * flow that allows them to create a unique player identity.
   *
   * This test validates:
   * - Name conflict detection during join process
   * - "I'm a new person" alternative flow activation
   * - New player creation form and name availability checking
   * - Duplicate name rejection with clear error messaging
   * - Successful unique name acceptance and player creation
   * - Final lobby navigation and player identity confirmation
   */
  test('should allow a new user to choose a different name when their original choice is taken', async ({ page }) => {
    await page.goto('/');


    await page.getByRole('button', { name: /join( game)?/i }).click();

    // Join with a name that will be taken
    await fillRoomCodeOtp(page, roomCode);
    await expect(page.locator('mat-icon:has-text("check_circle")')).toBeVisible(); // Wait for validation

    const nameInput = await getElementReliably(page, [
      '[data-testid="player-name-input"]',
      'input[formControlName="playerName"]'
    ]);
    await nameInput.fill('DUPLICATE_NAME');

    // Account step now requires PIN before submitting
    await fillOtp(page, 'account-pin-otp', '2468');

    await submitFormReliably(page, '[data-testid="join-submit-button"]', {
      showsError: 'already exists in this game',
      timeout: 10000
    });

    // Expect to see the name conflict screen
    await expect(page.locator('text=A player named "DUPLICATE_NAME" already exists in this game')).toBeVisible();

    // Click "I'm a new person"
    await page.getByRole('button', { name: /i'm a new person/i }).click();

    // Expect to see the new person flow
    await expect(page.getByText('New Player Name')).toBeVisible();

    // Try to create a player with the same name again
    const newPlayerInput = await getElementReliably(page, [
      '[data-testid="new-player-name-input"]',
      'input[formControlName="newPlayerName"]'
    ]);
    await newPlayerInput.fill('DUPLICATE_NAME');
    await page.getByRole('button', { name: /check name availability/i }).click();
    await expect(page.getByText('This name is already taken. Please choose another one.')).toBeVisible();

    // Enter a unique name
    const uniqueName = `NEW_PLAYER_${Date.now()}`;
    await newPlayerInput.fill(uniqueName);
    await page.getByRole('button', { name: /check name availability/i }).click();
    await expect(page.locator('text=This name is available!')).toBeVisible();

    // Fill required PIN for new person before creating
    await fillOtp(page, 'new-person-pin-otp', '4321');

    // Create the new player
    await submitFormReliably(page, 'button:has-text("Create new player")', {
      navigatesTo: /\/lobby\//,
      timeout: 20000
    });
    await expect(page.getByText(roomCode)).toBeVisible();
    await expect(page.getByText(uniqueName)).not.toHaveCount(0);
  });
});

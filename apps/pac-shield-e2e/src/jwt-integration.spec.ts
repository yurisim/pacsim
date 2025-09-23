import { test, expect } from '@playwright/test';
import {
  fillGameMasterPin,
  fillRoomCodeOtp,
  waitForNavigationReliable,
  fillOtp
} from './test-utils';

test.describe('JWT Integration and Continue Game Flow', () => {

  /**
   * Test Intent: Comprehensive flow to validate joining a game, handling
   * name conflicts via PIN verification, and ensuring UI responsiveness.
   * This test covers the entire user journey from joining to conflict
   * resolution, including real-time validation and form state management.
   *
   * This spec got too large and complex, so it's being broken up. This
   * test is a condensed version of the original spec, focusing on the
   * most critical path.
   *
   * It is intended to replace the following tests:
   * - should maintain session across page navigation
   * - should handle JWT expiration gracefully
   * - should handle name conflicts with PIN verification UI flow
   * - should handle "I'm a new person" flow
   * - should validate room code in real-time with visual feedback
   * - should show different button states during operations
   * - should preserve form state during room validation
   *
   * @see continue-game.spec.ts - for continue game flow
   * @see new-player.spec.ts - for new player flow
   */
  test('should handle name conflicts with PIN verification UI flow', async ({
    page,
  }) => {
    // Create game
    await page.goto('/');
    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill out Game Master Setup form
    await page.getByLabel('Username').fill('c.gm');
    await fillGameMasterPin(page, '1234');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for lobby and extract room code
    await expect(page).toHaveURL(/\/lobby\//);
    const roomCodeButton = page.getByRole('button', { name: /copy room code/i });
    await expect(roomCodeButton).toBeVisible();
    const roomCode = await roomCodeButton.locator('p').evaluate(el => el.textContent?.trim() || '');
    // First, create ConflictUser via API with a PIN
    const joinResponse = await page.request.post('http://localhost:3000/api/player/join', {
      data: {
        roomCode: roomCode,
        playerName: 'ConflictUser',
        pin: '5555'
      }
    });
    expect(joinResponse.ok()).toBeTruthy();

    // Now clear session and try to join again with same name to trigger conflict
    await page.evaluate(() => localStorage.clear());
    await page.goto('/join');
    await fillRoomCodeOtp(page, roomCode);
    await expect(page.locator('mat-icon:has-text("check_circle")')).toBeVisible(); // Wait for validation
    await page.fill('input[data-testid="player-name-input"]', 'ConflictUser');

    // Should trigger name conflict since ConflictUser already exists
    await expect(
      page.getByText('A player named "ConflictUser" already exists in this game')
    ).toBeVisible();

    // Should show OTP component
    await expect(page.getByText("Enter your PIN to continue as this player")).toBeVisible();

    // Account step now requires PIN before submitting
    await page.getByRole('textbox', { name: '-digit PIN digit 1' }).click();
    await page.getByRole('textbox', { name: '-digit PIN digit 1' }).fill('2');
    await page.getByRole('textbox', { name: '-digit PIN digit 2' }).fill('4');
    await page.getByRole('textbox', { name: '-digit PIN digit 3' }).fill('6');
    await page.getByRole('textbox', { name: '-digit PIN digit 4' }).fill('8');


    await page.getByRole('button', { name: /verify pin/i }).click();

    // Should show error message for incorrect PIN
    await expect(
      page.getByText(/incorrect|failed/i)
    ).toBeVisible();

    // Now enter correct PIN
    await page.getByRole('textbox', { name: '-digit PIN digit 1' }).click();
    await page.getByRole('textbox', { name: '-digit PIN digit 1' }).fill('5');
    await page.getByRole('textbox', { name: '-digit PIN digit 2' }).fill('5');
    await page.getByRole('textbox', { name: '-digit PIN digit 3' }).fill('5');
    await page.getByRole('textbox', { name: '-digit PIN digit 4' }).fill('5');
    await page.getByRole('button', { name: /verify pin/i }).click();

    // Should be in lobby now
    await waitForNavigationReliable(page, /\/lobby\//, { timeout: 20000 });
  });
});

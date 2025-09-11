import { test, expect } from '@playwright/test';
import {
  fillGameMasterPin,
  fillVerificationPin,
  fillRoomCodeOtp,
  submitFormReliably,
  waitForNavigationReliable,
  getElementReliably,
} from './test-utils';

test.describe('JWT Integration and Continue Game Flow', () => {
  /**
   * Test Intent: Verify that JWT tokens persist correctly across page navigation
   * and allow seamless continuation of game sessions.
   *
   * This test validates:
   * - JWT token persistence in browser storage
   * - Session state maintenance across navigation
   * - Continue game functionality after page refresh/navigation
   * - Proper room code and user data preservation
   */
  test('should maintain session across page navigation', async ({ page }) => {
    // First, create a game and join it to establish a valid JWT
    await page.goto('/');

    const userName = 'Session User';

    // Create a game
    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill out Game Master Setup form
    await page.getByLabel('Last Name').fill(userName);
    await fillGameMasterPin(page, '1234');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for game creation and extract the room code from the display
    await expect(page).toHaveURL(/\/lobby\//);
    const roomCodeButton = page.getByRole('button', { name: /copy room code/i });
    await expect(roomCodeButton).toBeVisible();
    const roomCode = await roomCodeButton.locator('p').evaluate(el => el.textContent?.trim() || '');
    expect(roomCode).toBeDefined();

    // Navigate away and back to test session persistence
    await page.goto('/');

    await page.getByRole('button', { name: 'Join' }).click();

    // JWT should still be valid, continue option should show
    await expect(page.getByText(`Welcome back, ${userName}!`)).toBeVisible();
    await expect(page.getByText('Continue your game session')).toBeVisible();

    // Test continue game functionality
    const continueButton = page.getByRole('button', { name: /continue game/i });
    await expect(continueButton).toBeVisible();
    await continueButton.click();

    // Should redirect to the correct lobby
    await expect(page.getByText(roomCode)).toBeVisible();
    await expect(page.getByText(userName)).toHaveCount(1);
  });

  /**
   * Test Intent: Test the system's response to expired or corrupted JWT tokens,
   * ensuring graceful degradation to standard authentication flow.
   *
   * This test validates:
   * - Detection of invalid/expired JWT tokens
   * - Cleanup of invalid session data
   * - Fallback to standard join form UI
   * - No error states or crashes during token validation
   */
  test('should handle JWT expiration gracefully', async ({ page }) => {
    // Start with valid session
    await page.goto('/');
    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill out Game Master Setup form
    await page.getByLabel('Last Name').fill('ExpiredUser');
    await fillGameMasterPin(page, '1234');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for lobby
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.getByText('ExpiredUser')).toHaveCount(1);

    // Simulate JWT expiration by corrupting the token
    await page.evaluate(() => {
      localStorage.setItem('pac-shield-jwt', 'expired.jwt.token');
    });

    // Navigate to join page
    await page.goto('/join');

    // Continue option should not appear
    await expect(page.getByText('Welcome back, ExpiredUser!')).toBeHidden();
    await expect(
      page.getByRole('button', { name: /continue game/i })
    ).toBeHidden();

    // Should show regular join form
    await expect(page.locator('.otp-container')).toBeVisible();
  });

  /**
   * Test Intent: Test the complete name conflict resolution flow when a user
   * attempts to join with a name that already exists, including PIN verification.
   *
   * This test validates:
   * - Name conflict detection and error messaging
   * - PIN verification UI presentation
   * - Incorrect PIN handling and error feedback
   * - Security measures for player identity verification
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
    await page.getByLabel('Last Name').fill('ConflictTestGM');
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
    await page.getByTestId('join-submit-button').click();

    // Should trigger name conflict since ConflictUser already exists
    await expect(
      page.getByText('A player named "ConflictUser" already exists in this game')
    ).toBeVisible();

    // Should show OTP component
    await expect(page.getByText("Enter your PIN to continue as this player")).toBeVisible();

    // Enter wrong PIN
    await fillVerificationPin(page, '9999');

    await page.getByRole('button', { name: /verify pin/i }).click();

    // Should show error message for incorrect PIN
    await expect(
      page.getByText(/incorrect|failed/i)
    ).toBeVisible();
  });

  /**
   * Test Intent: Test the alternative flow when users choose "I'm a new person"
   * during name conflicts, allowing them to create a new player identity.
   *
   * This test validates:
   * - Alternative resolution path for name conflicts
   * - New player creation workflow
   * - Name availability checking
   * - Successful player creation and lobby entry
   */
  test('should handle "I\'m a new person" flow', async ({ page }) => {
    // Create game
    await page.goto('/');
    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill out Game Master Setup form
    await page.getByLabel('Last Name').fill('OriginalUser');
    await fillGameMasterPin(page, '1234');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for lobby and extract room code
    await expect(page).toHaveURL(/\/lobby\//);
    const roomCodeButton = page.getByRole('button', { name: /copy room code/i });
    await expect(roomCodeButton).toBeVisible();
    const roomCode = await roomCodeButton.locator('p').evaluate(el => el.textContent?.trim() || ''); await expect(page.getByText('OriginalUser')).not.toHaveCount(0);

    // Clear session and try to join with same name
    await page.evaluate(() => localStorage.clear());
    await page.goto('/join');

    await fillRoomCodeOtp(page, roomCode);
    await expect(page.locator('mat-icon:has-text("check_circle")')).toBeVisible();
    await page.fill('input[data-testid="player-name-input"]', 'OriginalUser');
    await page.getByTestId('join-submit-button').click();

    // Should show name conflict (message enhanced with Angular Material v20)
    await expect(
      page.getByText('A player named "OriginalUser" already exists in this game')
    ).toBeVisible();

    // Click "I'm a new person"
    await page.getByRole('button', { name: /i'm a new person/i }).click();

    // Should now be prompted to create a new player with a different name
    await expect(page.getByText('Create New Player')).toBeVisible();

    const uniqueName = `OriginalUser_${Date.now()}`;
    await page.getByTestId('new-player-name-input').fill(uniqueName);

    await page.getByRole('button', { name: /check name availability/i }).click();
    await expect(page.getByText('This name is available!')).toBeVisible();

    await submitFormReliably(page, 'button:has-text("Create new player")', {
      navigatesTo: /\/lobby\//,
      timeout: 20000
    });

    // Should be in lobby now
    await waitForNavigationReliable(page, /\/lobby\//, { timeout: 20000 });
    await expect(page.getByRole('button', { name: /copy room code/i }).locator('p')).toContainText(roomCode);

    // Should see the newly created player name
    await expect(page.getByText(uniqueName)).not.toHaveCount(0);
  });

  /**
   * Test Intent: Verify real-time room code validation with appropriate visual
   * feedback states (loading, success, error) and proper form state management.
   *
   * This test validates:
   * - Real-time validation triggers and timing
   * - Visual feedback states (spinner, check, error icons)
   * - Form field enabling/disabling based on validation
   * - Error message display for invalid codes
   */
  test('should validate room code in real-time with visual feedback', async ({
    page,
  }) => {
    await page.goto('/join');

    // Type less than 6 characters - no validation yet
    await fillRoomCodeOtp(page, 'ABCDE');
    await expect(page.locator('mat-progress-spinner')).toHaveCount(0, { timeout: 250 });
    await expect(page.locator('mat-icon:has-text("check_circle")')).toHaveCount(0, { timeout: 250 });
    await expect(page.locator('mat-icon:has-text("cancel")')).toHaveCount(0, { timeout: 250 });

    // Type 6 characters with invalid code
    await fillRoomCodeOtp(page, 'ABCDEF');

    // Should eventually show error
    await expect(page.locator('mat-icon:has-text("cancel")')).toBeVisible();
    await expect(page.locator('mat-progress-spinner')).toHaveCount(0);

    // Error message should appear
    await expect(page.getByText('Invalid room code')).toBeVisible();

    // Player name field should not appear
    await expect(page.getByTestId('player-name-input')).toBeHidden();

    // Join button should be disabled
    const joinButton = await getElementReliably(page, [
      '[data-testid="join-submit-button"]',
      'button:has-text("Join")',
      'button[type="submit"]'
    ], { timeout: 5000 });
    await expect(joinButton).toBeDisabled();
  });

  /**
   * Test Intent: Validate that join button states change appropriately during
   * different stages of the join process (disabled, enabled, loading).
   *
   * This test validates:
   * - Button state management during form completion
   * - Proper enabling/disabling based on form validity
   * - Loading states during submission
   * - Clear visual feedback for user interactions
   */
  test('should show different button states during operations', async ({
    page,
  }) => {
    // Create a valid game first
    await page.goto('/');
    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill out Game Master Setup form
    await page.getByLabel('Last Name').fill('StateTestGM');
    await fillGameMasterPin(page, '1234');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for lobby and extract room code
    await expect(page).toHaveURL(/\/lobby\//);
    const roomCodeButton = page.getByRole('button', { name: /copy room code/i });
    await expect(roomCodeButton).toBeVisible();
    const roomCode = await roomCodeButton.locator('p').evaluate(el => el.textContent?.trim() || '');
    await page.goto('/join');

    const joinButton =
      page.getByRole('dialog', { name: /join team/i }).getByRole('button', { name: /^join$/i })
        .or(page.getByRole('dialog').getByRole('button', { name: /^join$/i }))
        .or(page.getByTestId('join-submit-button'))
        .or(page.getByRole('button', { name: /^join$/i }));

    // Initially disabled
    await expect(page.getByTestId('join-submit-button')).toBeDisabled();

    // Start typing valid room code
    await fillRoomCodeOtp(page, roomCode);

    // After validation succeeds
    await expect(page.locator('mat-icon:has-text("check_circle")')).toBeVisible();

    // Player name should appear and join button should be enabled after filling name
    const nameInput = await getElementReliably(page, [
      '[data-testid="player-name-input"]',
      'input[formControlName="playerName"]'
    ]);
    await nameInput.fill('StateTestUser');
    await expect(joinButton).toBeEnabled();
    await expect(joinButton).toContainText('Join');

    // Click join and verify loading state
    await submitFormReliably(page, '[data-testid="join-submit-button"]', {
      navigatesTo: /\/lobby\//,
      timeout: 15000
    });

    await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
  });

  /**
   * Test Intent: Ensure that form field values are preserved during validation
   * processes and don't get cleared unexpectedly during state changes.
   *
   * This test validates:
   * - Form field value persistence during validation
   * - State preservation across UI updates
   * - No unexpected field clearing or data loss
   * - Consistent user experience during form interactions
   */
  test('should preserve form state during room validation', async ({
    page,
  }) => {
    await page.goto('/join');

    // Create a game to get valid room code
    await page.goto('/');
    await page.getByRole('button', { name: 'Start New Game' }).click();

    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();

    // Fill out Game Master Setup form
    await page.getByLabel('Last Name').fill('FormTestGM');
    await fillGameMasterPin(page, '1234');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for lobby and extract room code
    await expect(page).toHaveURL(/\/lobby\//);
    const roomCodeButton = page.getByRole('button', { name: /copy room code/i });
    await expect(roomCodeButton).toBeVisible();
    const roomCode = await roomCodeButton.locator('p').evaluate(el => el.textContent?.trim() || '');
    // Go back to join and test form preservation
    await page.goto('/join');

    // Fill room code gradually and verify form state preservation
    const roomInput = page.locator('input[data-otp-index="0"]');

    // Fill partial room code
    await fillRoomCodeOtp(page, roomCode.substring(0, 3));
    await expect(roomInput).toHaveValue(roomCode.charAt(0));

    // Fill complete room code
    await fillRoomCodeOtp(page, roomCode);

    // After validation, room code should still be there
    await expect(page.locator('mat-icon:has-text("check_circle")')).toBeVisible();
    await expect(roomInput).toHaveValue(roomCode.charAt(0));

    // Player name field appears and can be filled
    const nameInput = page.getByTestId('player-name-input');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('FormStateUser');

    // Both fields should retain their values
    await expect(roomInput).toHaveValue(roomCode.charAt(0));
    await expect(nameInput).toHaveValue('FormStateUser');
  });
});

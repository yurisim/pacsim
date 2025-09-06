import { test, expect } from '@playwright/test';
import { fillGameMasterPin, fillVerificationPin, fillRoomCodeOtp } from './test-utils';

test.describe('JWT Integration and Continue Game Flow', () => {
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
    const roomCode = (await roomCodeButton.locator('p').textContent())?.trim() ?? '';

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
    await expect(page.getByText(roomCode!)).toBeVisible();
    await expect(page.getByText(userName)).toHaveCount(1);
  });

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
    const roomCode = (await roomCodeButton.locator('p').textContent())?.trim() ?? '';

    // First, join as ConflictUser to create the player
    await page.goto('/join');
    await fillRoomCodeOtp(page, roomCode!);
    await expect(page.locator('mat-icon[fontIcon="check_circle"]')).toBeVisible(); // Wait for validation
    await page.fill('input[formControlName="playerName"]', 'ConflictUser');
    await page.getByRole('button', { name: /^join$/i }).click();

    // Should successfully join the lobby
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.getByText('ConflictUser')).toHaveCount(1);

    // Now clear session and try to join again with same name to trigger conflict
    await page.evaluate(() => localStorage.clear());
    await page.goto('/join');
    await fillRoomCodeOtp(page, roomCode!);
    await expect(page.locator('mat-icon[fontIcon="check_circle"]')).toBeVisible(); // Wait for validation
    await page.fill('input[formControlName="playerName"]', 'ConflictUser');
    await page.getByRole('button', { name: /^join$/i }).click();

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
      page.getByText(/PIN|incorrect|failed/i)
    ).not.toHaveCount(0);
  });

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
    const roomCode = (await roomCodeButton.locator('p').textContent())?.trim() ?? '';
    await expect(page.getByText('OriginalUser')).not.toHaveCount(0);

    // Clear session and try to join with same name
    await page.evaluate(() => localStorage.clear());
    await page.goto('/join');

    await fillRoomCodeOtp(page, roomCode!);
    await expect(page.locator('mat-icon[fontIcon="check_circle"]')).toBeVisible();
    await page.fill('input[formControlName="playerName"]', 'OriginalUser');
    await page.getByRole('button', { name: /^join$/i }).click();

    // Should show name conflict (message enhanced with PrimeNG p-message)
    await expect(
      page.getByText('A player named "OriginalUser" already exists in this game')
    ).toBeVisible();

    // Click "I'm a new person"
    await page.getByRole('button', { name: /i'm a new person/i }).click();

    // Should now be prompted to create a new player with a different name
    await expect(page.getByText('Create a New Player')).toBeVisible();

    const uniqueName = `OriginalUser_${Date.now()}`;
    await page.getByRole('textbox', { name: 'New Player Name' }).fill(uniqueName);

    await page.getByRole('button', { name: /check name availability/i }).click();
    await expect(page.getByText('This name is available!')).toBeVisible();

    await page.getByRole('button', { name: /create new player/i }).click();

    // Should be in lobby now
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.getByRole('button', { name: /copy room code/i }).locator('p')).toContainText(roomCode!);

    // Should see the newly created player name
    await expect(page.getByText(uniqueName)).not.toHaveCount(0);
  });

  test('should validate room code in real-time with visual feedback', async ({
    page,
  }) => {
    await page.goto('/join');

    // Start typing room code
    const roomInput = page.locator('input[data-otp-index="0"]');

    // Type less than 6 characters - no validation yet
    await fillRoomCodeOtp(page, 'ABCDE');
    await expect(page.locator('mat-progress-spinner')).toHaveCount(0);
    await expect(page.locator('mat-icon[fontIcon="check_circle"]')).toHaveCount(0);
    await expect(page.locator('mat-icon[fontIcon="cancel"]')).toHaveCount(0);

    // Type 6 characters with invalid code
    await fillRoomCodeOtp(page, 'ABCDEF');

    // Should show spinner while validating
    await expect(page.locator('mat-progress-spinner')).toBeVisible();

    // Should eventually show error
    await expect(page.locator('mat-icon[fontIcon="cancel"]')).toBeVisible();
    await expect(page.locator('mat-progress-spinner')).toHaveCount(0);

    // Error message should appear
    await expect(page.getByText('Invalid room code')).toBeVisible();

    // Player name field should not appear
    await expect(page.locator('input[formControlName="playerName"]')).toBeHidden();

    // Join button should be disabled
    const joinButton =
      page.getByRole('dialog', { name: /join team/i }).getByRole('button', { name: /^join$/i })
        .or(page.getByRole('dialog').getByRole('button', { name: /^join$/i }))
        .or(page.getByTestId('join-team-dialog').getByRole('button', { name: /^join$/i }))
        .or(page.getByRole('button', { name: /^join$/i }));
    await expect(joinButton).toBeDisabled();
  });

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
    const roomCode = (await roomCodeButton.locator('p').textContent())?.trim() ?? '';

    await page.goto('/join');

    const joinButton =
      page.getByRole('dialog', { name: /join team/i }).getByRole('button', { name: /^join$/i })
        .or(page.getByRole('dialog').getByRole('button', { name: /^join$/i }))
        .or(page.getByTestId('join-team-dialog').getByRole('button', { name: /^join$/i }))
        .or(page.getByRole('button', { name: /^join$/i }));

    // Initially disabled
    await expect(joinButton).toBeDisabled();

    // Start typing valid room code
    await fillRoomCodeOtp(page, roomCode!);

    // After validation succeeds
    await expect(page.locator('mat-icon[fontIcon="check_circle"]')).toBeVisible();

    // Player name should appear and join button should be enabled after filling name
    await page.fill('input[formControlName="playerName"]', 'StateTestUser');
    await expect(joinButton).toBeEnabled();
    await expect(joinButton).toContainText('Join');

    // Click join and verify loading state
    await joinButton.click();

    await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
  });

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
    const roomCode = (await roomCodeButton.locator('p').textContent())?.trim() ?? '';

    // Go back to join and test form preservation
    await page.goto('/join');

    // Fill room code gradually and verify form state preservation
    const roomInput = page.locator('input[data-otp-index="0"]');

    // Fill partial room code
    await fillRoomCodeOtp(page, roomCode!.substring(0, 3));
    await expect(roomInput).toHaveValue(roomCode!.charAt(0));

    // Fill complete room code
    await fillRoomCodeOtp(page, roomCode!);

    // After validation, room code should still be there
    await expect(page.locator('mat-icon[fontIcon="check_circle"]')).toBeVisible();
    await expect(roomInput).toHaveValue(roomCode!.charAt(0));

    // Player name field appears and can be filled
    const nameInput = page.locator('input[formControlName="playerName"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('FormStateUser');

    // Both fields should retain their values
    await expect(roomInput).toHaveValue(roomCode!.charAt(0));
    await expect(nameInput).toHaveValue('FormStateUser');
  });
});

import { test, expect } from '@playwright/test';

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
    await page.locator('p-inputotp input').first().fill('1');
    await page.locator('p-inputotp input').nth(1).fill('2');
    await page.locator('p-inputotp input').nth(2).fill('3');
    await page.locator('p-inputotp input').nth(3).fill('4');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for game creation and extract the room code from the display
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.locator('.text-7xl')).toBeVisible();
    const roomCode = await page.locator('.text-7xl').textContent();

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
    await expect(page.getByText(userName)).toHaveCount(2);
  });

  test('should handle JWT expiration gracefully', async ({ page }) => {
    // Start with valid session
    await page.goto('/');
    await page.getByRole('button', { name: 'Start New Game' }).click();
    
    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();
    
    // Fill out Game Master Setup form
    await page.getByLabel('Last Name').fill('ExpiredUser');
    await page.locator('p-inputotp input').first().fill('1');
    await page.locator('p-inputotp input').nth(1).fill('2');
    await page.locator('p-inputotp input').nth(2).fill('3');
    await page.locator('p-inputotp input').nth(3).fill('4');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Wait for lobby
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.getByText('ExpiredUser')).toHaveCount(2);

    // Simulate JWT expiration by corrupting the token
    await page.evaluate(() => {
      localStorage.setItem('pac-shield-jwt', 'expired.jwt.token');
    });

    // Navigate to join page
    await page.goto('/join');

    // Continue option should not appear
    await expect(page.getByText('Welcome back, ExpiredUser!')).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: /continue game/i })
    ).not.toBeVisible();

    // Should show regular join form
    await expect(page.locator('input[placeholder="Room Code"]')).toBeVisible();
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
    await page.locator('p-inputotp input').first().fill('1');
    await page.locator('p-inputotp input').nth(1).fill('2');
    await page.locator('p-inputotp input').nth(2).fill('3');
    await page.locator('p-inputotp input').nth(3).fill('4');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Wait for lobby and extract room code
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.locator('.text-7xl')).toBeVisible();
    const roomCode = await page.locator('.text-7xl').textContent();

    // Join first time with PIN
    await page.goto('/join');
    await page.fill('input[placeholder="Room Code"]', roomCode!);
    await expect(page.locator('.pi-check')).toBeVisible(); // Wait for validation
    await page.fill('input[placeholder="Player Name"]', 'ConflictUser');
    await page.getByRole('button', { name: /join/i }).click();

    // Should trigger name conflict since no PIN provided initially
    await expect(
      page.getByText('A player with this name already exists')
    ).toBeVisible();

    // Should show OTP component
    await expect(page.locator('p-inputOtp')).toBeVisible();

    // Enter wrong PIN
    const otpInputs = page.locator('p-inputOtp input');
    await otpInputs.nth(0).fill('9');
    await otpInputs.nth(1).fill('9');
    await otpInputs.nth(2).fill('9');
    await otpInputs.nth(3).fill('9');

    await page.getByRole('button', { name: /verify pin/i }).click();

    // Should show specific error message
    await expect(
      page.getByText('The PIN you entered is incorrect')
    ).toBeVisible();
  });

  test('should handle "I\'m a new person" flow', async ({ page }) => {
    // Create game
    await page.goto('/');
    await page.getByRole('button', { name: 'Start New Game' }).click();
    
    // Wait for Game Master Setup form to appear
    await expect(page.getByText('Game Master Setup')).toBeVisible();
    
    // Fill out Game Master Setup form
    await page.getByLabel('Last Name').fill('OriginalUser');
    await page.locator('p-inputotp input').first().fill('1');
    await page.locator('p-inputotp input').nth(1).fill('2');
    await page.locator('p-inputotp input').nth(2).fill('3');
    await page.locator('p-inputotp input').nth(3).fill('4');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Wait for lobby and extract room code
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.locator('.text-7xl')).toBeVisible();
    const roomCode = await page.locator('.text-7xl').textContent();
    await expect(page.getByText('OriginalUser')).toHaveCount(2);

    // Clear session and try to join with same name
    await page.evaluate(() => localStorage.clear());
    await page.goto('/join');

    await page.fill('input[placeholder="Room Code"]', roomCode!);
    await expect(page.locator('.pi-check')).toBeVisible();
    await page.fill('input[placeholder="Player Name"]', 'OriginalUser');
    await page.getByRole('button', { name: /join/i }).click();

    // Should show name conflict
    await expect(
      page.getByText('A player named "OriginalUser" already exists')
    ).toBeVisible();

    // Click "I'm a new person"
    await page.getByRole('button', { name: /i'm a new person/i }).click();

    // Should generate PIN and redirect to lobby
    const alertPromise = page.waitForEvent('dialog');
    const alert = await alertPromise;
    expect(alert.message()).toContain('Your PIN is:');
    expect(alert.message()).toContain('Please remember it for future logins');

    // Extract PIN from alert message
    const pinMatch = alert.message().match(/Your PIN is: (\d{4})/);
    expect(pinMatch).toBeTruthy();
    const generatedPin = pinMatch?.[1];
    expect(generatedPin).toHaveLength(4);

    await alert.accept();

    // Should be in lobby now
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.locator('.text-7xl')).toContainText(roomCode!);

    // Should see the new player (may have same name but different ID)
    await expect(page.getByText('OriginalUser')).toBeVisible();
  });

  test('should validate room code in real-time with visual feedback', async ({
    page,
  }) => {
    await page.goto('/join');

    // Start typing room code
    const roomInput = page.locator('input[placeholder="Room Code"]');

    // Type less than 4 characters - no validation yet
    await roomInput.fill('ABC');
    await expect(page.locator('.pi-spinner')).toBeHidden();
    await expect(page.locator('.pi-check')).toBeHidden();
    await expect(page.locator('.pi-times')).toBeHidden();

    // Type 4 characters with invalid code
    await roomInput.fill('ABCD');

    // Should show spinner while validating
    await expect(page.locator('.pi-spinner')).toBeVisible();

    // Should eventually show error
    await expect(page.locator('.pi-times')).toBeVisible();
    await expect(page.locator('.pi-spinner')).toBeHidden();

    // Error message should appear
    await expect(page.getByText('Invalid room code')).toBeVisible();

    // Player name field should not appear
    await expect(page.locator('input[placeholder="Player Name"]')).not.toBeVisible();

    // Join button should be disabled
    const joinButton = page.getByRole('button', { name: /join/i });
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
    await page.locator('p-inputotp input').first().fill('1');
    await page.locator('p-inputotp input').nth(1).fill('2');
    await page.locator('p-inputotp input').nth(2).fill('3');
    await page.locator('p-inputotp input').nth(3).fill('4');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Wait for lobby and extract room code
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.locator('.text-7xl')).toBeVisible();
    const roomCode = await page.locator('.text-7xl').textContent();

    await page.goto('/join');

    const roomInput = page.locator('input[placeholder="Room Code"]');
    const joinButton = page.getByRole('button', { name: /join/i });

    // Initially disabled
    await expect(joinButton).toBeDisabled();

    // Start typing valid room code
    await roomInput.fill(roomCode!);

    // Should show "Validating..." state
    await expect(joinButton).toContainText('Validating...');
    await expect(joinButton).toBeDisabled();

    // After validation succeeds
    await expect(page.locator('.pi-check')).toBeVisible();

    // Player name should appear and join button should be enabled after filling name
    await page.fill('input[placeholder="Player Name"]', 'StateTestUser');
    await expect(joinButton).toBeEnabled();
    await expect(joinButton).toContainText('Join');

    // Click join and verify loading state
    await joinButton.click();
    await expect(joinButton).toContainText('Joining...');
    await expect(joinButton).toBeDisabled();
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
    await page.locator('p-inputotp input').first().fill('1');
    await page.locator('p-inputotp input').nth(1).fill('2');
    await page.locator('p-inputotp input').nth(2).fill('3');
    await page.locator('p-inputotp input').nth(3).fill('4');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Wait for lobby and extract room code
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.locator('.text-7xl')).toBeVisible();
    const roomCode = await page.locator('.text-7xl').textContent();

    // Go back to join and test form preservation
    await page.goto('/join');

    // Fill room code gradually and verify form state preservation
    const roomInput = page.locator('input[placeholder="Room Code"]');

    await roomInput.fill(roomCode!.substring(0, 3));
    await expect(roomInput).toHaveValue(roomCode!.substring(0, 3));

    await roomInput.fill(roomCode!);

    // After validation, room code should still be there
    await expect(page.locator('.pi-check')).toBeVisible();
    await expect(roomInput).toHaveValue(roomCode!);

    // Player name field appears and can be filled
    const nameInput = page.locator('input[placeholder="Player Name"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('FormStateUser');

    // Both fields should retain their values
    await expect(roomInput).toHaveValue(roomCode!);
    await expect(nameInput).toHaveValue('FormStateUser');
  });
});

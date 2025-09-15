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
  generateTestIds
} from './test-utils';

/**
 * Enhanced Join Flow Tests - Reliability Fixes Applied
 *
 * This test suite demonstrates the reliability fixes for the PAC Shield E2E tests,
 * addressing the primary issues:
 * 1. Navigation failures (stuck on /join?step=new)
 * 2. Element selector failures with data-testid attributes
 * 3. Timeout issues with multi-step flows
 * 4. Game state isolation problems
 */
test.describe('Enhanced Join Flow - Reliability Fixes', () => {

  /**
   * Test the "I'm a new person" flow with proper wait strategies
   * and enhanced element selectors. This addresses the navigation
   * issue where tests got stuck on /join?step=new.
   */
  test('should complete "I\'m a new person" flow reliably', async ({ page }) => {
    const { setup, cleanup } = createTestIsolation(page, 'new-person-flow');
    const testIds = generateTestIds('new-person-reliable');

    try {
      // Setup isolated game with name conflict scenario
      const gameData = await setup('name-conflict');

      // Navigate to join page
      await page.goto('/join');

      // Fill room code with enhanced validation waiting
      await fillRoomCodeOtp(page, gameData.roomCode);
      await expect(page.locator('mat-icon:has-text("check_circle")')).toBeVisible({ timeout: 10000 });

      // Enter conflicting name
      const playerNameInput = await getElementReliably(page, [
        '[data-testid="player-name-input"]',
        'input[aria-label*="player name"]',
        'input[formControlName="playerName"]'
      ]);

      await playerNameInput.fill('ConflictUser');

      // PIN is required on Account step before submitting
      await fillOtp(page, 'account-pin-otp', '2468');

      // Submit and wait for conflict step with enhanced reliability
      await submitFormReliably(
        page,
        '[data-testid="join-submit-button"]',
        { showsStep: 'conflict', timeout: 15000 }
      );

      // Verify we're on conflict step with proper UI elements
      await expect(page.getByText(`A player named "${'ConflictUser'}" already exists in this game`))
        .toBeVisible({ timeout: 5000 });

      // Click "I'm a new person" with fallback selectors
      const newPersonButton = await getElementReliably(page, [
        'button[data-testid="new-person-button"]',
        'button:has-text("I\'m a new person")',
        'button:has-text("new person")'
      ]);

      await newPersonButton.click();

      // Wait for transition to new person step
      await waitForJoinStep(page, 'new', 10000);

      // Fill new unique name with enhanced element detection
      const newNameInput = await getElementReliably(page, [
        '[data-testid="new-player-name-input"]',
        'input[aria-label*="new player"]',
        'input[formControlName="newPlayerName"]'
      ], { timeout: 8000 });

      const uniqueName = `${testIds.playerName}_unique`;
      await newNameInput.fill(uniqueName);

      // Check name availability with proper button state handling
      const checkButton = await getElementReliably(page, [
        '[data-testid="check-name-availability"]',
        'button:has-text("Check Name")',
        'button:has-text("availability")'
      ]);

      await checkButton.click();

      // Wait for availability confirmation with proper timing
      await expect(page.getByText('This name is available!')).toBeVisible({ timeout: 8000 });

      // Ensure Create button disabled until PIN is valid
      const createButton = await getElementReliably(page, [
        '[data-testid="create-new-player"]',
        'button:has-text("Create new player")',
        'button:has-text("Create")'
      ]);
      await expect(createButton).toBeDisabled();

      // Fill required PIN for new person
      await fillOtp(page, 'new-person-pin-otp', '1234');

      // Button should now be enabled
      await expect(createButton).toBeEnabled({ timeout: 3000 });

      // Create new player with reliable submission
      await submitFormReliably(
        page,
        '[data-testid="create-new-player"]',
        { navigatesTo: /\/lobby\//, timeout: 15000 }
      );

      // Verify successful navigation to lobby
      await waitForLobbyLoaded(page, gameData.roomCode, 10000);

      // Verify new player name appears in lobby
      await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 5000 });

    } finally {
      await cleanup();
    }
  });

  /**
   * Test room code validation with proper visual feedback states
   * This addresses the element selector and timing issues.
   */
  test('should validate room code with reliable visual feedback', async ({ page }) => {
    // Create a fresh game directly via API
    const createResponse = await page.request.post('http://localhost:3000/api/game/create', {
      data: { victoryConditionMP: 100 }
    });
    const gameData = await createResponse.json();

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
    for (let i = 0; i < gameData.roomCode.length; i++) {
      await inputs[i].clear();
      await inputs[i].fill(gameData.roomCode[i]);
    }

    // Wait for success icon
    await expect(page.locator('mat-icon:has-text("check_circle"), mat-icon:has-text("check"), .success-icon')).toBeVisible({ timeout: 10000 });

    // Player name field should become visible
    await expect(page.locator('[data-testid="player-name-input"]')).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test button states during operations with proper timing
   * This addresses button state detection reliability issues.
   */
  test('should show reliable button states during join operations', async ({ page }) => {
    const { setup, cleanup } = createTestIsolation(page, 'button-states');
    const testIds = generateTestIds('button-states-test');

    try {
      const gameData = await setup('fresh-game');

      await page.goto('/join');

      // Find join button with multiple selector strategies
      const joinButton = await getElementReliably(page, [
        '[data-testid="join-submit-button"]',
        'button[type="submit"]',
        'button:has-text("Join")'
      ]);

      // Initially should be disabled
      await expect(joinButton).toBeDisabled();

      // Fill valid room code
      await fillRoomCodeOtp(page, gameData.roomCode);
      await expect(page.locator('mat-icon:has-text("check_circle")')).toBeVisible({ timeout: 8000 });

      // Button should still be disabled (no player name)
      await expect(joinButton).toBeDisabled();

      // Fill player name
      const playerNameInput = await getElementReliably(page, [
        '[data-testid="player-name-input"]',
        'input[formControlName="playerName"]'
      ]);

      await playerNameInput.fill(testIds.playerName);

      // Join remains disabled until PIN is filled
      await expect(joinButton).toBeDisabled();

      // Fill required Account step PIN
      await fillOtp(page, 'account-pin-otp', '2468');

      // Button should now be enabled
      await expect(joinButton).toBeEnabled({ timeout: 3000 });
      await expect(joinButton).toContainText('Join');

      // Click and verify navigation
      await joinButton.click();

      // Should navigate to lobby reliably
      await waitForNavigationReliable(page, /\/lobby\//, { timeout: 15000 });
      await waitForLobbyLoaded(page, gameData.roomCode);

    } finally {
      await cleanup();
    }
  });

  /**
   * Test form state preservation during validation
   * This ensures form fields don't get cleared unexpectedly.
   */
  test('should preserve form state during room validation reliably', async ({ page }) => {
    const { setup, cleanup } = createTestIsolation(page, 'form-preservation');
    const testIds = generateTestIds('form-state-test');

    try {
      const gameData = await setup('fresh-game');

      await page.goto('/join');

      // Fill partial room code
      const roomCodeInputs = page.locator('input[data-otp-index]');
      await roomCodeInputs.nth(0).fill(gameData.roomCode.charAt(0));
      await roomCodeInputs.nth(1).fill(gameData.roomCode.charAt(1));

      // Verify partial values are preserved
      await expect(roomCodeInputs.nth(0)).toHaveValue(gameData.roomCode.charAt(0));
      await expect(roomCodeInputs.nth(1)).toHaveValue(gameData.roomCode.charAt(1));

      // Complete room code
      await fillRoomCodeOtp(page, gameData.roomCode);

      // Wait for validation
      await expect(page.locator('mat-icon:has-text("check_circle")')).toBeVisible({ timeout: 10000 });

      // Verify room code is still preserved after validation
      await expect(roomCodeInputs.nth(0)).toHaveValue(gameData.roomCode.charAt(0));

      // Fill player name
      const playerNameInput = await getElementReliably(page, [
        '[data-testid="player-name-input"]',
        'input[formControlName="playerName"]'
      ]);

      await playerNameInput.fill(testIds.playerName);

      // Both fields should retain their values
      await expect(roomCodeInputs.nth(0)).toHaveValue(gameData.roomCode.charAt(0));
      await expect(playerNameInput).toHaveValue(testIds.playerName);

      // PIN is required before submitting
      await fillOtp(page, 'account-pin-otp', '2468');

      // Submit should work reliably
      await submitFormReliably(
        page,
        '[data-testid="join-submit-button"]',
        { navigatesTo: /\/lobby\//, timeout: 15000 }
      );

    } finally {
      await cleanup();
    }
  });

  /**
   * Test PIN verification flow with enhanced error handling
   * This addresses timing issues in PIN verification scenarios.
   */
  test('should handle PIN verification flow reliably', async ({ page }) => {
    const { setup, cleanup } = createTestIsolation(page, 'pin-verification');

    try {
      const gameData = await setup('pin-verification');

      await page.goto('/join');

      // Enter room code and existing player name
      await fillRoomCodeOtp(page, gameData.roomCode);
      await expect(page.locator('mat-icon:has-text("check_circle")')).toBeVisible({ timeout: 8000 });

      const playerNameInput = await getElementReliably(page, [
        '[data-testid="player-name-input"]',
        'input[formControlName="playerName"]'
      ]);

      await playerNameInput.fill('PinUser');

      // PIN is required on Account step before submitting
      await fillOtp(page, '-digit PIN digit 1', '2468');

      // Submit to trigger name conflict
      await submitFormReliably(
        page,
        '[data-testid="join-submit-button"]',
        { showsStep: 'conflict', timeout: 10000 }
      );

      // Verify conflict resolution UI
      await expect(page.getByText('A player named "PinUser" already exists in this game'))
        .toBeVisible({ timeout: 5000 });

      // Verify PIN entry field becomes available
      await expect(page.getByText('Enter your PIN to continue as this player'))
        .toBeVisible({ timeout: 5000 });

      // Test wrong PIN first
      const pinInputs = page.locator('input[data-otp-index]');
      await pinInputs.nth(0).fill('1');
      await pinInputs.nth(1).fill('2');
      await pinInputs.nth(2).fill('3');
      await pinInputs.nth(3).fill('4');

      const verifyButton = await getElementReliably(page, [
        'button[data-testid="verify-pin-button"]',
        'button:has-text("Verify")',
        'button:has-text("PIN")'
      ]);

      await verifyButton.click();

      // Should show error for wrong PIN
      await expect(page.getByText(/incorrect|failed/i)).toBeVisible({ timeout: 8000 });

    } finally {
      await cleanup();
    }
  });
});

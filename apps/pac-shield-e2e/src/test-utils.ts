import { Page, expect } from '@playwright/test';

/**
 * Test utilities for PAC Shield E2E tests
 */

/**
 * Fills an OTP (One-Time Password) field by targeting individual input fields with data-otp-index attributes.
 * This helper handles the custom app-input-otp component that creates multiple individual input fields.
 *
 * @param page - Playwright Page object
 * @param pin - The PIN string to enter (e.g., '1234')
 * @param waitForComponent - Whether to wait for the OTP component to be ready (default: true)
 * @returns Promise<void>
 *
 * @example
 * await fillOtpField(page, '1234');
 */
export async function fillOtpField(page: Page, pin: string, waitForComponent = true): Promise<void> {
  if (!pin || typeof pin !== 'string') {
    throw new Error('PIN must be a non-empty string');
  }

  // Wait for OTP component container to be visible
  if (waitForComponent) {
    await expect(page.locator('.otp-container')).toBeVisible();
  }

  // Wait for the first OTP input to be visible
  await expect(page.locator('input[data-otp-index="0"]')).toBeVisible();

  // Fill each OTP input field individually
  for (let i = 0; i < pin.length; i++) {
    const inputSelector = `input[data-otp-index="${i}"]`;
    const inputElement = page.locator(inputSelector);

    // Wait for this specific input to be visible and enabled
    await expect(inputElement).toBeVisible();
    await expect(inputElement).toBeEnabled();

    // Clear the input first, then fill with the digit
    await inputElement.clear();
    await inputElement.fill(pin[i]);

    // Small delay to allow for auto-focus to next field
    await page.waitForTimeout(50);
  }

  // Wait a moment for the component to process the complete PIN
  await page.waitForTimeout(100);
}

/**
 * Fills an OTP field by first locating the component using its aria-label, then filling the individual inputs.
 * This is useful when there are multiple OTP components on the same page.
 *
 * @param page - Playwright Page object
 * @param ariaLabel - The aria-label of the OTP component to target
 * @param pin - The PIN string to enter (e.g., '1234')
 * @param waitForComponent - Whether to wait for the OTP component to be ready (default: true)
 * @returns Promise<void>
 *
 * @example
 * await fillOtpFieldByAriaLabel(page, '4-digit PIN for Game Master', '1234');
 * await fillOtpFieldByAriaLabel(page, /4-digit PIN/i, '5678');
 */
export async function fillOtpFieldByAriaLabel(
  page: Page,
  ariaLabel: string | RegExp,
  pin: string,
  waitForComponent = true
): Promise<void> {
  if (!pin || typeof pin !== 'string') {
    throw new Error('PIN must be a non-empty string');
  }

  // Find the OTP container by its aria-label
  const otpContainer = page.locator('.otp-container').filter({ hasNot: page.locator('*') }).or(
    page.locator(`[role="group"][aria-label*="${typeof ariaLabel === 'string' ? ariaLabel : ariaLabel.source}"]`)
  );

  if (waitForComponent) {
    await expect(otpContainer.first()).toBeVisible();
  }

  // For each character in the PIN, fill the corresponding input within this container
  for (let i = 0; i < pin.length; i++) {
    const inputSelector = `input[data-otp-index="${i}"]`;

    // Find the input within the specific OTP container that matches our aria-label
    let inputElement;
    if (typeof ariaLabel === 'string') {
      inputElement = page.locator('.otp-container').filter({ hasText: ariaLabel }).locator(inputSelector);
      // Fallback: try finding by aria-label attribute on the container
      if (await inputElement.count() === 0) {
        inputElement = page.locator(`[aria-label*="${ariaLabel}"]`).locator(inputSelector);
      }
    } else {
      // For RegExp, we need to find all containers and filter
      inputElement = page.locator('.otp-container').locator(inputSelector);
    }

    // If we still don't find it, try the general approach but verify it's the right component
    if (await inputElement.count() === 0) {
      inputElement = page.locator(inputSelector);
    }

    // Wait for this specific input to be visible and enabled
    await expect(inputElement.first()).toBeVisible();
    await expect(inputElement.first()).toBeEnabled();

    // Clear the input first, then fill with the digit
    await inputElement.first().clear();
    await inputElement.first().fill(pin[i]);

    // Small delay to allow for auto-focus to next field
    await page.waitForTimeout(50);
  }

  // Wait a moment for the component to process the complete PIN
  await page.waitForTimeout(100);
}

/**
 * Simplified helper for the most common case: filling Game Master setup PIN
 * @param page - Playwright Page object
 * @param pin - The PIN string to enter (e.g., '1234')
 * @returns Promise<void>
 */
export async function fillGameMasterPin(page: Page, pin: string): Promise<void> {
  await fillOtpFieldByAriaLabel(page, '4-digit PIN for Game Master', pin);
}

/**
 * Simplified helper for PIN verification during join flow (name conflicts)
 * @param page - Playwright Page object
 * @param pin - The PIN string to enter (e.g., '9999')
 * @returns Promise<void>
 */
export async function fillVerificationPin(page: Page, pin: string): Promise<void> {
  // For the verification PIN, we can use a more generic approach since it's typically the only OTP on the page
  await fillOtpField(page, pin);
}

/**
 * Fill OTP inputs within a specific OTP component targeted by data-testid.
 * Example: await fillOtp(page, 'new-person-pin-otp', '1234')
 */
export async function fillOtp(page: Page, testId: string, pin: string): Promise<void> {
  if (!pin || typeof pin !== 'string') {
    throw new Error('PIN must be a non-empty string');
  }

  const root = page.getByTestId(testId);
  await expect(root).toBeVisible();

  for (let i = 0; i < pin.length; i++) {
    const input = root.locator(`input[data-otp-index="${i}"]`).first();
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
    await input.clear();
    await input.fill(pin[i]);
    await page.waitForTimeout(30);
  }

  await page.waitForTimeout(100);
}

/**
 * Conditionally fill an OTP by data-testid only if the component is visible.
 * Safe to call when the OTP is optional (e.g., account PIN).
 * Example: await maybeFillOtpIfVisible(page, 'account-pin-otp', '2468')
 */
export async function maybeFillOtpIfVisible(page: Page, testId: string, pin: string): Promise<void> {
  try {
    const root = page.getByTestId(testId);

    // If component not present or not visible, skip without error
    if ((await root.count()) === 0) return;
    if (!(await root.isVisible())) return;

    await fillOtp(page, testId, pin);
  } catch {
    // No-op: treat as optional
  }
}
/**
 * Helper to wait for OTP component to be ready for input
 * @param page - Playwright Page object
 * @param ariaLabel - Optional aria-label to target a specific OTP component
 * @returns Promise<void>
 */
export async function waitForOtpComponent(page: Page, ariaLabel?: string | RegExp): Promise<void> {
  if (ariaLabel) {
    if (typeof ariaLabel === 'string') {
      await expect(page.locator(`[aria-label*="${ariaLabel}"]`).first()).toBeVisible();
    } else {
      await expect(page.locator('.otp-container').first()).toBeVisible();
    }
  } else {
    await expect(page.locator('.otp-container')).toBeVisible();
  }

  // Ensure the first input is ready
  await expect(page.locator('input[data-otp-index="0"]').first()).toBeVisible();
}

/**
 * Helper to clear an OTP field completely
 * @param page - Playwright Page object
 * @param length - Number of OTP digits (default: 4)
 * @returns Promise<void>
 */
export async function clearOtpField(page: Page, length = 4): Promise<void> {
  for (let i = 0; i < length; i++) {
    const inputSelector = `input[data-otp-index="${i}"]`;
    const inputElement = page.locator(inputSelector).first();

    if (await inputElement.isVisible()) {
      await inputElement.clear();
    }
  }
}

/**
 * Enhanced room code filling with validation waiting
 * @param page - Playwright Page object
 * @param roomCode - The room code string to enter (e.g., 'ABC123')
 * @returns Promise<void>
 */
export async function fillRoomCodeOtp(page: Page, roomCode: string): Promise<void> {
  await fillOtpFieldByAriaLabel(page, '6-character Room Code', roomCode);

  // Wait for validation to complete (success or error)
  try {
    await Promise.race([
      page.locator('mat-icon:has-text("check_circle")').waitFor({ state: 'visible', timeout: 8000 }),
      page.locator('mat-icon:has-text("cancel")').waitFor({ state: 'visible', timeout: 8000 })
    ]);
  } catch (error) {
    // Validation didn't complete - this might be expected for some tests
    console.warn('Room code validation did not complete within timeout');
  }
}

/**
 * Enhanced wait for navigation with retry and specific URL pattern matching
 * @param page - Playwright Page object
 * @param urlPattern - URL pattern to wait for (string or regex)
 * @param options - Configuration options
 * @returns Promise<void>
 */
export async function waitForNavigationReliable(
  page: Page,
  urlPattern: string | RegExp,
  options: {
    timeout?: number;
    waitUntil?: 'load' | 'domcontentloaded' | 'commit';
    retries?: number;
  } = {}
): Promise<void> {
  const { timeout = 10000, waitUntil = 'domcontentloaded', retries = 3 } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await expect(page).toHaveURL(urlPattern, { timeout });

      // Additional wait for DOM stability
      if (waitUntil === 'domcontentloaded') {
        await page.waitForLoadState('domcontentloaded');
      } else if (waitUntil === 'load') {
        await page.waitForLoadState('load');
      }

      return; // Success
    } catch (error) {
      if (attempt === retries) {
        throw new Error(
          `Failed to navigate to ${urlPattern.toString()} after ${retries} attempts. Current URL: ${page.url()}`
        );
      }

      // Wait before retry
      await page.waitForTimeout(1000 * attempt);
    }
  }
}




/**
 * Wait for button state changes with proper loading/disabled handling
 * @param page - Playwright Page object
 * @param buttonSelector - Button selector or data-testid
 * @param expectedStates - Array of expected states in sequence
 * @returns Promise<void>
 */
export async function waitForButtonStates(
  page: Page,
  buttonSelector: string,
  expectedStates: Array<'enabled' | 'disabled' | 'loading' | 'contains-text'>,
  textToContain?: string
): Promise<void> {
  const button = await getElementReliably(page, [buttonSelector]);

  for (const state of expectedStates) {
    switch (state) {
      case 'enabled':
        await expect(button).toBeEnabled();
        break;
      case 'disabled':
        await expect(button).toBeDisabled();
        break;
      case 'loading':
        // Look for loading spinner or loading text
        await expect(
          button.locator('mat-progress-spinner')
            .or(page.locator('mat-progress-spinner'))
        ).toBeVisible();
        break;
      case 'contains-text':
        if (textToContain) {
          await expect(button).toContainText(textToContain);
        }
        break;
    }

    // Small delay between state checks
    await page.waitForTimeout(100);
  }
}

/**
 * Clear localStorage and sessionStorage completely
 * @param page - Playwright Page object
 * @returns Promise<void>
 */
export async function clearStorage(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // SecurityError: localStorage/sessionStorage not accessible
        console.warn('Cannot clear storage:', e);
      }
    });
  } catch (error) {
    // Page might not have a valid origin, ignore storage clearing
    console.warn('Storage clearing skipped due to page context:', error);
  }
}

/**
 * Set invalid JWT token in localStorage for testing error scenarios
 * @param page - Playwright Page object
 * @param playerName - Optional player name for fake player data (default: 'FakePlayer')
 * @param playerId - Optional player ID for fake player data (default: 999)
 * @returns Promise<void>
 */
export async function setInvalidJwt(page: Page, playerName = 'FakePlayer', playerId = 999): Promise<void> {
  try {
    await page.evaluate(({ name, id }) => {
      try {
        localStorage.setItem('pac-shield-jwt', 'invalid.jwt.token');
        localStorage.setItem('pac-shield-player', JSON.stringify({
          name,
          id
        }));
      } catch (e) {
        // SecurityError: localStorage not accessible
        console.warn('Cannot set invalid JWT in storage:', e);
      }
    }, { name: playerName, id: playerId });
  } catch (error) {
    console.warn('setInvalidJwt failed due to page context:', error);
  }
}

/**
 * Custom assertion for checking if continue game section is hidden
 * @param page - Playwright Page object
 * @returns Promise<void>
 */
export async function expectContinueGameHidden(page: Page): Promise<void> {
  await expect(page.getByText('Welcome back')).toBeHidden();
  await expect(page.getByRole('button', { name: /continue game/i })).toBeHidden();
}

/**
 * Assert that the card width is appropriate for compact layout (narrower)
 * Tests actual width rather than CSS classes to avoid brittleness
 * @param page - Playwright Page object
 * @returns Promise<void>
 */
export async function expectCompactLayout(page: Page): Promise<void> {
  const card = page.locator('mat-card');
  const cardBox = await card.boundingBox();

  // Compact layout should be narrower (roughly 448px max-w-md equivalent)
  expect(cardBox?.width).toBeLessThan(500);
  await expect(page.locator('input[data-otp-index="0"]')).toBeVisible();
}

/**
 * Assert that the card width is appropriate for expanded layout (wider)
 * Tests actual width rather than CSS classes to avoid brittleness
 * @param page - Playwright Page object
 * @returns Promise<void>
 */
export async function expectExpandedLayout(page: Page): Promise<void> {
  const card = page.locator('mat-card');
  const cardBox = await card.boundingBox();

  // Expanded layout should be wider (roughly 640px max-w-xl equivalent)
  expect(cardBox?.width).toBeGreaterThan(500);
  await expect(page.locator('.md-sys-bg-primary-container')).toBeVisible();
}

/**
 * Enhanced element selection with fallback strategies for reliability
 * @param page - Playwright Page object
 * @param selectors - Array of selectors to try in order (primary to fallback)
 * @param options - Options for timeout and visibility requirements
 * @returns Promise<Locator>
 */
export async function getElementReliably(
  page: Page,
  selectors: string[],
  options: { timeout?: number; visible?: boolean } = {}
) {
  const { timeout = 5000, visible = true } = options;

  for (const selector of selectors) {
    try {
      const element = page.locator(selector);
      if (visible) {
        await expect(element.first()).toBeVisible({ timeout: timeout / selectors.length });
      } else {
        await expect(element.first()).toBeAttached({ timeout: timeout / selectors.length });
      }
      return element.first();
    } catch (error) {
      // Continue to next selector if current one fails
      continue;
    }
  }

  throw new Error(`None of the selectors found an element: ${selectors.join(', ')}`);
}


/**
 * Form submission with outcome verification and enhanced error handling
 * @param page - Playwright Page object
 * @param submitButton - Button selector or element
 * @param expectedOutcome - Expected outcome after submission
 * @returns Promise<void>
 */
export async function submitFormReliably(
  page: Page,
  submitButton: string,
  expectedOutcome: {
    navigatesTo?: string | RegExp;
    showsError?: string;
    showsStep?: 'account' | 'conflict' | 'new' | 'done';
    timeout?: number;
  }
): Promise<void> {
  const { navigatesTo, showsError, showsStep, timeout = 15000 } = expectedOutcome;

  // Get submit button with fallback selectors
  const button = await getElementReliably(page, [
    submitButton,
    'button[type="submit"]',
    'button:has-text("Join")',
    'button:has-text("Continue")',
    'button:has-text("Create")'
  ]);

  // Ensure button is enabled before clicking
  await expect(button).toBeEnabled({ timeout: 5000 });

  // Click and handle different expected outcomes
  await button.click();

  if (navigatesTo) {
    await waitForNavigationReliable(page, navigatesTo, { timeout });
  } else if (showsError) {
    await expect(page.getByText(showsError)).toBeVisible({ timeout });
  } else if (showsStep) {
    await waitForJoinStep(page, showsStep, timeout);
  }
}

/**
 * Wait for specific join flow step with proper state validation
 * @param page - Playwright Page object
 * @param expectedStep - The expected step in the join flow
 * @param timeout - Timeout in milliseconds
 * @returns Promise<void>
 */
export async function waitForJoinStep(
  page: Page,
  expectedStep: 'account' | 'conflict' | 'new' | 'done',
  timeout = 10000
): Promise<void> {
  const stepIndicators = {
    account: [
      '[data-testid="player-name-input"]',
      'input[formControlName="playerName"]',
      'text=Enter your name'
    ],
    conflict: [
      'text=already exists in this game',
      'button:has-text("I\'m a new person")',
      '[data-testid="verify-pin-button"]'
    ],
    new: [
      'text=Create New Player',
      '[data-testid="new-player-name-input"]',
      'button:has-text("Check name availability")'
    ],
    done: [
      'text=Game Lobby',
      'button:has-text("Copy Room Code")',
      '.lobby-container'
    ]
  };

  const indicators = stepIndicators[expectedStep];
  if (!indicators) {
    throw new Error(`Unknown join step: ${expectedStep}`);
  }

  // Wait for at least one indicator of the expected step
  const promises = indicators.map(selector =>
    page.locator(selector).first().waitFor({ state: 'visible', timeout })
      .catch(() => null) // Don't fail immediately, try other selectors
  );

  const results = await Promise.allSettled(promises);
  const hasSuccess = results.some(result => result.status === 'fulfilled');

  if (!hasSuccess) {
    throw new Error(`Failed to detect join step "${expectedStep}". Expected one of: ${indicators.join(', ')}`);
  }
}

// === GAME STATE ISOLATION UTILITIES ===

/**
 * Generate unique test identifiers for game isolation
 * @param testName - Name of the test for identification
 * @returns Unique test identifiers
 */
export function generateTestIds(testName: string) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const prefix = testName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  return {
    gameId: `test_${prefix}_${timestamp}_${random}`,
    playerName: `Player_${timestamp}_${random}`,
    gmName: `GM_${timestamp}_${random}`,
    roomCode: '', // Will be populated after game creation
  };
}

/**
 * Create isolated game state via API for testing
 * @param page - Playwright Page object
 * @param options - Game creation options
 * @returns Promise with game data
 */
export async function createIsolatedGame(
  page: Page,
  options: {
    gameMasterName?: string;
    victoryConditionMP?: number;
    players?: Array<{ name: string; pin?: string; role?: string }>;
  } = {}
): Promise<{ roomCode: string; gameId: string; players: any[] }> {
  const {
    gameMasterName = `GM_${Date.now()}`,
    victoryConditionMP = 100,
    players = []
  } = options;

  // Create game via API
  const createResponse = await page.request.post('http://localhost:3000/api/game/create', {
    data: { victoryConditionMP }
  });

  if (!createResponse.ok()) {
    throw new Error(`Failed to create game: ${createResponse.status()}`);
  }

  const gameData = await createResponse.json();
  const roomCode = gameData.roomCode;
  const gameId = gameData.gameId;

  // Create GM player
  const gmResponse = await page.request.post('http://localhost:3000/api/player/join', {
    data: {
      roomCode,
      playerName: gameMasterName,
      pin: '1234'
    }
  });

  if (!gmResponse.ok()) {
    throw new Error(`Failed to create GM: ${gmResponse.status()}`);
  }

  const createdPlayers = [await gmResponse.json()];

  // Create additional players if specified
  for (const player of players) {
    const playerResponse = await page.request.post('http://localhost:3000/api/player/join', {
      data: {
        roomCode,
        playerName: player.name,
        pin: player.pin || '5555',
      }
    });

    if (playerResponse.ok()) {
      createdPlayers.push(await playerResponse.json());
    }
  }

  return {
    roomCode,
    gameId,
    players: createdPlayers
  };
}

/**
 * Clean up test game and associated data
 * @param page - Playwright Page object
 * @param gameId - Game ID to clean up
 * @returns Promise<void>
 */
export async function cleanupGame(page: Page, gameId: string): Promise<void> {
  try {
    // Clean up via API if endpoint exists
    await page.request.delete(`http://localhost:3000/api/game/${gameId}`);
  } catch (error) {
    // Cleanup failed, but don't fail the test
    console.warn(`Warning: Failed to cleanup game ${gameId}:`, error);
  }
}

/**
 * Setup complete game scenario with multiple players and conflicts
 * @param page - Playwright Page object
 * @param scenario - Predefined scenario type
 * @returns Promise with scenario data
 */
export async function setupGameScenario(
  page: Page,
  scenario: 'name-conflict' | 'multi-player' | 'pin-verification' | 'fresh-game' = 'fresh-game'
): Promise<{
  roomCode: string;
  gameId: string;
  players: Array<{ name: string; pin?: string; id?: string }>;
  conflictName?: string;
}> {
  const testIds = generateTestIds(`scenario_${scenario}`);

  switch (scenario) {
    case 'name-conflict': {
      const gameData = await createIsolatedGame(page, {
        gameMasterName: testIds.gmName,
        players: [
          { name: 'ConflictUser', pin: '5555' }
        ]
      });

      return {
        ...gameData,
        conflictName: 'ConflictUser'
      };
    }

    case 'multi-player': {
      return createIsolatedGame(page, {
        gameMasterName: testIds.gmName,
        players: [
          { name: 'Player1', pin: '1111' },
          { name: 'Player2', pin: '2222' },
          { name: 'Player3', pin: '3333' }
        ]
      });
    }

    case 'pin-verification': {
      return createIsolatedGame(page, {
        gameMasterName: testIds.gmName,
        players: [
          { name: 'PinUser', pin: '9999' }
        ]
      });
    }

    case 'fresh-game':
    default: {
      return createIsolatedGame(page, {
        gameMasterName: testIds.gmName
      });
    }
  }
}

/**
 * Wait for lobby page to fully load with game data
 * @param page - Playwright Page object
 * @param expectedRoomCode - Expected room code to verify
 * @param timeout - Timeout in milliseconds
 * @returns Promise<void>
 */
export async function waitForLobbyLoaded(
  page: Page,
  expectedRoomCode?: string,
  timeout = 10000
): Promise<void> {
  // Wait for lobby URL
  await expect(page).toHaveURL(/\/lobby\//, { timeout });

  // Wait for lobby heading
  await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible({ timeout });

  // Wait for room code display
  const roomCodeButton = page.getByRole('button', { name: /copy room code/i });
  await expect(roomCodeButton).toBeVisible({ timeout });

  // Verify specific room code if provided
  if (expectedRoomCode) {
    await expect(roomCodeButton.locator('p')).toContainText(expectedRoomCode, { timeout });
  }

  // Wait for players list to be visible (even if empty)
  await expect(page.locator('.md-sys-color-on-surface').first()).toBeVisible({ timeout });
}

/**
 * Comprehensive test isolation setup and teardown helper
 * @param page - Playwright Page object
 * @param testName - Name of test for unique identification
 * @returns Setup and cleanup functions
 */
export function createTestIsolation(page: Page, testName: string) {
  let gameData: { gameId: string; roomCode: string } | null = null;

  const setup = async (scenario: Parameters<typeof setupGameScenario>[1] = 'fresh-game') => {
    // Clear any existing session
    await clearStorage(page);

    // Setup game scenario
    gameData = await setupGameScenario(page, scenario);

    return gameData;
  };

  const cleanup = async () => {
    if (gameData?.gameId) {
      await cleanupGame(page, gameData.gameId);
    }

    // Navigate to a valid page before clearing storage
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 });
    } catch (error) {
      // Navigation failed, but continue with cleanup
      console.warn('Navigation failed during cleanup:', error);
    }

    // Clear session
    await clearStorage(page);
  };

  return { setup, cleanup };
}

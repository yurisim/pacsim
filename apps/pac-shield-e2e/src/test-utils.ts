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
 * Simplified helper for filling room code OTP component
 * @param page - Playwright Page object
 * @param roomCode - The room code string to enter (e.g., 'ABC123')
 * @returns Promise<void>
 */
export async function fillRoomCodeOtp(page: Page, roomCode: string): Promise<void> {
  await fillOtpFieldByAriaLabel(page, '6-character Room Code', roomCode);
}

/**
 * Clear localStorage and sessionStorage completely
 * @param page - Playwright Page object
 * @returns Promise<void>
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Set invalid JWT token in localStorage for testing error scenarios
 * @param page - Playwright Page object
 * @param playerName - Optional player name for fake player data (default: 'FakePlayer')
 * @param playerId - Optional player ID for fake player data (default: 999)
 * @returns Promise<void>
 */
export async function setInvalidJwt(page: Page, playerName = 'FakePlayer', playerId = 999): Promise<void> {
  await page.evaluate(({ name, id }) => {
    localStorage.setItem('pac-shield-jwt', 'invalid.jwt.token');
    localStorage.setItem('pac-shield-player', JSON.stringify({
      name,
      id
    }));
  }, { name: playerName, id: playerId });
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

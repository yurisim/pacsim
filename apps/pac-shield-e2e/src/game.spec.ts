import { test, expect } from '@playwright/test';
import { createGameViaUI, expectLobbyLoaded } from './test-utils';

/**
 * Test Intent: Verify the complete game creation flow from homepage to lobby,
 * ensuring all critical steps work together for new game initialization.
 *
 * This test validates:
 * - Homepage navigation and WebSocket connection display
 * - Game creation button functionality
 * - Game Master setup form display and completion
 * - Successful navigation to game lobby
 * - Proper lobby heading and UI elements
 */
test('should create a new game and navigate to the game board', async ({
  page,
}) => {
  // Create game using shared utility
  await createGameViaUI(page);

  // Verify that the game lobby has loaded
  await expectLobbyLoaded(page);
});

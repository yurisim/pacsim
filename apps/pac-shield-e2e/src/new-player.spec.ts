import { test, expect, request } from '@playwright/test';

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

  test('should allow a new user to choose a different name when their original choice is taken', async ({ page }) => {
    await page.goto('/');


    await page.getByRole('button', { name: /join( game)?/i }).click();

    // Join with a name that will be taken
    await page.fill('input[formcontrolname="gameId"]', roomCode);
    await page.press('input[formcontrolname="gameId"]', 'Enter');
    await page.fill('input[formcontrolname="playerName"]', 'DUPLICATE_NAME');
    await page.click('button:has-text("Join")');

    // Expect to see the name conflict screen
    await expect(page.locator('text=A player with this name already exists')).toBeVisible();

    // Click "I'm a new person"
    await page.getByRole('button', { name: /i'm a new person/i }).click();

    // Expect to see the new person flow
    await expect(page.locator('text=Create a New Player')).toBeVisible();

    // Try to create a player with the same name again
    await page.fill('input[formcontrolname="newPlayerName"]', 'DUPLICATE_NAME');

    await page.getByRole('textbox', { name: 'Enter a new player name' }).fill('DUPLICATE_NAME');
    await page.getByRole('button', { name: /check name availability/i }).click();
    await expect(page.getByText('This name is already taken')).toBeVisible();

    // Enter a unique name
    const uniqueName = `NEW_PLAYER_${Date.now()}`;
    await page.fill('input[formcontrolname="newPlayerName"]', uniqueName);
    await page.getByRole('button', { name: /check name availability/i }).click();
    await expect(page.locator('text=This name is available!')).toBeVisible();

    // Create the new player
    await page.getByRole('button', { name: /create new player/i }).click();

    // Expect to be redirected to the lobby and see the new player
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.getByText(roomCode)).toBeVisible();
    await expect(page.getByText(uniqueName)).toHaveCount(2);
  });
});

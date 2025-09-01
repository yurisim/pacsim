import { test, expect, request } from '@playwright/test';

test('should create a new game and navigate to the game board', async ({
  page,
}) => {
  // Navigate to the homepage.
  await page.goto('/');

  // Wait for WebSocket connection to be established
  await expect(page.locator('i.pi-wifi')).toBeVisible();
  await expect(page.locator('span', { hasText: 'Connected' })).toBeVisible();

  // Click the "Start New Game" button.
  await page.getByRole('button', { name: 'Start New Game' }).click();

  // Wait for Game Master Setup form to appear
  await expect(page.getByRole('heading', { name: 'Game Master Setup' })).toBeVisible();
  
  // Fill out Game Master Setup form
  await page.getByLabel('Last Name').fill('TestGM');
  await page.locator('p-inputotp input').first().fill('1');
  await page.locator('p-inputotp input').nth(1).fill('2');
  await page.locator('p-inputotp input').nth(2).fill('3');
  await page.locator('p-inputotp input').nth(3).fill('4');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Assert that the game lobby has loaded by checking for the heading.
  const heading = page.getByRole('heading', { name: 'Game Lobby' });
  await expect(heading).toBeVisible();
});

// test('should show other players in the lobby', async ({ browser }) => {
//   // Create game
//   const apiContext = await request.newContext();
//   const createRes = await apiContext.post(
//     'http://localhost:3000/api/game/create',
//     {
//       data: { victoryConditionMP: 100 },
//     }
//   );
//   const { roomCode } = await createRes.json();
//   await apiContext.dispose();

//   // Open two browser contexts
//   const context1 = await browser.newContext();
//   const context2 = await browser.newContext();
//   const page1 = await context1.newPage();
//   const page2 = await context2.newPage();

//   // Both join the game
//   await page1.goto(`/join?roomCode=${roomCode}`);
//   await page1.fill('input[name="roomCode"]', roomCode);
//   await page1.fill('input[name="playerName"]', 'Player1');
//   await page1.getByRole('button', { name: 'Join' }).click();

//   await page2.goto(`/join?roomCode=${roomCode}`);
//   await page2.fill('input[name="roomCode"]', roomCode);
//   await page2.fill('input[name="playerName"]', 'Player2');
//   await page2.getByRole('button', { name: 'Join' }).click();

//   // Verify both players see each other
//   await expect(page1.getByText('Player2')).toBeVisible();
//   await expect(page2.getByText('Player1')).toBeVisible();
// });

// test('should allow team selection in lobby', async ({ page }) => {
//   // Create game and join
//   const apiContext = await request.newContext();
//   const createRes = await apiContext.post(
//     'http://localhost:3000/api/game/create',
//     {
//       data: { victoryConditionMP: 100 },
//     }
//   );
//   const { roomCode } = await createRes.json();
//   await apiContext.dispose();

//   await page.goto(`/join?roomCode=${roomCode}`);
//   await page.fill('input[name="roomCode"]', roomCode);
//   await page.fill('input[name="playerName"]', 'Player1');
//   await page.getByRole('button', { name: 'Join' }).click();

//   // Select team
//   await page.click('button:has-text("Red Team")');
//   await expect(page.locator('.selected-team')).toHaveText('Red Team');

//   // Verify team selection persists
//   await page.reload();
//   await expect(page.locator('.selected-team')).toHaveText('Red Team');
// });

// test('should join an existing game and navigate to the lobby', async ({
//   page,
// }) => {
//   // Create a game via API
//   const apiContext = await request.newContext();
//   const createRes = await apiContext.post(
//     'http://localhost:3000/api/game/create',
//     {
//       data: { victoryConditionMP: 100 },
//     }
//   );
//   const { roomCode } = await createRes.json();
//   await apiContext.dispose();

//   // Navigate to join page
//   await page.goto('/join');

//   // Fill room code and submit
//   await page.fill('input[name="roomCode"]', roomCode);
//   await page.fill('input[name="playerName"]', 'TestPlayer');
//   await page.getByRole('button', { name: 'Join' }).click();

//   // Check if redirected to lobby
//   await expect(page).toHaveURL(/\/lobby/);
// });

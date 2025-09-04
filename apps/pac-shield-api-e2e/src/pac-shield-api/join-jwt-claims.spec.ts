import axios from 'axios';

function decodeJwt(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT');
  }
  const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
  return JSON.parse(payload);
}

describe('POST /api/player/join - JWT claims', () => {
  it('should issue a JWT whose gameId matches the created game and contains a playerId claim', async () => {
    // Create a game
    const createRes = await axios.post(`/api/game/create`, { victoryConditionMP: 100 });
    expect(createRes.status).toBe(201);
    const gameId = createRes.data.id as number;
    const roomCode = createRes.data.roomCode as string;

    // Join the game
    const joinRes = await axios.post(`/api/player/join`, {
      roomCode,
      playerName: 'JWT-Claims-Tester',
    });

    expect(joinRes.status).toBe(201);
    expect(joinRes.data).toHaveProperty('token');
    expect(joinRes.data).toHaveProperty('player');
    const token: string = joinRes.data.token;
    const player = joinRes.data.player;

    // Basic token shape
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    // Decode claims and validate known fields
    const claims = decodeJwt(token);
    expect(String(claims.gameId)).toBe(String(gameId));
    // playerId might be under playerId or sub depending on auth service payload; assert presence.
    expect(claims.playerId ?? claims.sub).toBeDefined();
    // If API returned a player object, the claim should match that too
    if (player?.id != null) {
      expect(String(claims.playerId ?? claims.sub)).toBe(String(player.id));
    }
  });
});

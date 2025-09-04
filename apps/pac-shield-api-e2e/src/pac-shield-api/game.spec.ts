import axios from 'axios';

describe('Game Controller E2E', () => {
  describe('POST /api/game/create', () => {
    it('should create a new game and return it', async () => {
      const res = await axios.post(`/api/game/create`, {
        victoryConditionMP: 100,
      });

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data).toHaveProperty('roomCode');
      expect(res.data.roomCode).toHaveLength(6);
    });
  });

  describe('POST /api/game/join', () => {
    it('should allow a player to join an existing game', async () => {
      // 1. Create a game to get a room code
      const createRes = await axios.post(`/api/game/create`, {
        victoryConditionMP: 100,
      });
      const { roomCode } = createRes.data;
      expect(createRes.status).toBe(201);

      // 2. Join the game using the room code
      const joinRes = await axios.post(`/api/game/join`, {
        roomCode,
        playerName: 'Test Player',
      });

      // 3. Verify the response
      expect(joinRes.status).toBe(201);
      expect(typeof joinRes.data.token).toBe('string');
      expect(joinRes.data.token).not.toBe('');
    });

  it('should return 404 when joining with an invalid roomCode', async () => {
    try {
      await axios.post(`/api/game/join`, {
        roomCode: 'INVALID',
        playerName: 'Test Player',
      });
    } catch (error) {
      expect(error.response.status).toBe(404);
      expect(error.response.data.message).toBe('Invalid room code');
    }
  });
  });
});

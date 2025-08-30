import axios from 'axios';

describe('Game Controller E2E', () => {
  describe('POST /api/game/create', () => {
    it('should create a new game and return it', async () => {
      const gameName = `Test Game ${Date.now()}`;
      const res = await axios.post(`/api/game/create`, {
        name: gameName,
        victoryConditionMP: 100,
      });

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data).toHaveProperty('roomCode');
      expect(res.data.name).toBe(gameName);
      expect(res.data.roomCode).toHaveLength(6);
    });
  });
});

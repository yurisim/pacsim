import axios from 'axios';

describe('Player Controller - join with invalid room code', () => {
  it('should return 404 when joining a non-existent game', async () => {
    try {
      await axios.post(`/api/player/join`, {
        roomCode: 'BAD123',
        playerName: 'Tester',
      });
      // Fail test if request unexpectedly succeeds
      fail('Request unexpectedly succeeded');
    } catch (error: any) {
      expect(error.response.status).toBe(404);
      expect(error.response.data.message).toBe('Invalid room code');
    }
  });
});

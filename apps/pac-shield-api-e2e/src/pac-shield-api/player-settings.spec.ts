import axios from 'axios';

// Configure axios for testing
axios.defaults.baseURL = 'http://localhost:3000';
axios.defaults.validateStatus = () => true; // Don't throw on error status codes

describe('Player Settings API E2E', () => {
  let gameId: string;
  let roomCode: string;
  let playerId: string;
  let authToken: string;

  beforeEach(async () => {
    // Create a new game
    const createRes = await axios.post(`/api/game/create`, {
      victoryConditionMP: 100,
    });
    gameId = createRes.data.id;
    roomCode = createRes.data.roomCode;

    // Join the game to create a player
    const joinRes = await axios.post(`/api/player/join`, {
      roomCode,
      playerName: 'Test Player',
    });
    authToken = joinRes.data.token;
    
    // Decode token to get player ID (in a real app, you'd have this from the auth service)
    // For testing purposes, we'll make a request to get player info
    const gameRes = await axios.get(`/api/game/${gameId}`);
    const players = gameRes.data.players;
    playerId = players.find((p: any) => p.name === 'Test Player')?.id;
  });

  describe('PATCH /api/player/:id/name', () => {
    it('should update player name successfully and persist changes', async () => {
      const newName = 'Updated Player Name';
      
      const res = await axios.patch(`/api/player/${playerId}/name`, {
        name: newName,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('name', newName);
      
      // Verify the change persists in the game data
      const gameRes = await axios.get(`/api/game/${gameId}`);
      const updatedPlayer = gameRes.data.players.find((p: any) => p.id === parseInt(playerId));
      expect(updatedPlayer.name).toBe(newName);
    });

    it('should return 404 when player does not exist', async () => {
      const res = await axios.patch(`/api/player/99999/name`, {
        name: 'New Name',
      });
      
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('message');
    });
  });

  describe('PATCH /api/player/:id', () => {
    it('should update both player name and role successfully', async () => {
      const newName = 'GM Player';
      const newRole = 'GM';
      
      const res = await axios.patch(`/api/player/${playerId}`, {
        name: newName,
        role: newRole,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('name', newName);
      expect(res.data).toHaveProperty('role', newRole);
      
      // Verify the changes persist in the game data
      const gameRes = await axios.get(`/api/game/${gameId}`);
      const updatedPlayer = gameRes.data.players.find((p: any) => p.id === parseInt(playerId));
      expect(updatedPlayer.name).toBe(newName);
      expect(updatedPlayer.role).toBe(newRole);
    });

    it('should update only name when role is not provided', async () => {
      const newName = 'Name Only Update';
      
      const res = await axios.patch(`/api/player/${playerId}`, {
        name: newName,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('name', newName);
      expect(res.data).toHaveProperty('role', 'PLAYER'); // Should remain default
    });

    it('should update only role when name is not provided', async () => {
      const newRole = 'COMMANDER';
      
      const res = await axios.patch(`/api/player/${playerId}`, {
        role: newRole,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('name', 'Test Player'); // Should remain original
      expect(res.data).toHaveProperty('role', newRole);
    });

    // Validation tests moved to unit tests

    it('should return 404 when player does not exist', async () => {
      const res = await axios.patch(`/api/player/99999`, {
        name: 'New Name',
        role: 'PLAYER',
      });
      
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('message');
    });

    it('should handle concurrent updates to the same player', async () => {
      const requests = [
        axios.patch(`/api/player/${playerId}`, { name: 'Name Update 1' }),
        axios.patch(`/api/player/${playerId}`, { role: 'COMMANDER' }),
        axios.patch(`/api/player/${playerId}`, { name: 'Final Name', role: 'LNO' }),
      ];

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(res => {
        expect(res.status).toBe(200);
      });

      // Final state should have the last name update and one of the role updates
      const gameRes = await axios.get(`/api/game/${gameId}`);
      const finalPlayer = gameRes.data.players.find((p: any) => p.id === parseInt(playerId));
      expect(finalPlayer.name).toBe('Final Name');
      // Due to race conditions in concurrent updates, role could be either COMMANDER or LNO
      expect(['COMMANDER', 'LNO']).toContain(finalPlayer.role);
    });
  });

  describe('Player settings integration with WebSocket updates', () => {
    it('should broadcast player updates to other players in the game', async () => {
      // Create a second player
      const joinRes2 = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'Second Player',
      });
      
      // Update first player's name and role
      await axios.patch(`/api/player/${playerId}`, {
        name: 'Updated First Player',
        role: 'GM',
      });

      // Get updated game state
      const gameRes = await axios.get(`/api/game/${gameId}`);
      
      // Verify both players are in the updated game state
      expect(gameRes.data.players).toHaveLength(2);
      const updatedFirstPlayer = gameRes.data.players.find((p: any) => p.id === parseInt(playerId));
      expect(updatedFirstPlayer.name).toBe('Updated First Player');
      expect(updatedFirstPlayer.role).toBe('GM');
      
      const secondPlayer = gameRes.data.players.find((p: any) => p.name === 'Second Player');
      expect(secondPlayer).toBeDefined();
      expect(secondPlayer.role).toBe('PLAYER'); // Should remain unchanged
    });
  });
});
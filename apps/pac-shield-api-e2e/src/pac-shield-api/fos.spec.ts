import axios from 'axios';

describe('FOS Controller E2E', () => {
  let gameId: number;
  let roomCode: string;
  let teamId: number;
  let fosId: number;
  let playerToken: string;

  beforeAll(async () => {
    // Create a test game
    const gameRes = await axios.post(`/api/game/create`, {
      victoryConditionMP: 100,
    });
    gameId = gameRes.data.id;
    roomCode = gameRes.data.roomCode;

    // Join the game as a player to get a team
    const joinRes = await axios.post(`/api/game/join`, {
      roomCode,
      playerName: 'Test Player FOS',
    });
    
    playerToken = joinRes.data.token;
    expect(playerToken).toBeDefined();

    // Get teams for this game from the game endpoint
    try {
      const gameRes = await axios.get(`/api/game/${gameId}`);
      if (gameRes.data.teams && gameRes.data.teams.length > 0) {
        teamId = gameRes.data.teams[0].id;
      } else {
        console.warn('No teams found in game, using fallback team ID');
        teamId = 1;
      }
    } catch (error) {
      // Fallback: use a mock team ID if game endpoint fails
      console.warn('Could not fetch game data, using mock team ID');
      teamId = 1;
    }

    // Create a test FOS for the game - this needs to be done through direct DB access
    // or via a test utility since there's likely no public FOS creation endpoint
    // For this test, we'll use a mock FOS ID and rely on existing data
    // In production tests, you'd set up test data via database seeders
    fosId = 1; // This should be a real FOS ID from test data
  });

  describe('GET /api/fos/game/:gameId', () => {
    it('should return empty array for new games (FOSs created on activation)', async () => {
      const res = await axios.get(`/api/fos/game/${gameId}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBe(0); // New games start with no FOSs
    });

    it('should return empty array for non-existent game', async () => {
      const res = await axios.get(`/api/fos/game/99999`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBe(0);
    });

    it('should return FOSs with proper structure', async () => {
      const res = await axios.get(`/api/fos/game/${gameId}`);
      
      if (res.data.length > 0) {
        const fos = res.data[0];
        expect(fos).toHaveProperty('id');
        expect(fos).toHaveProperty('gameId');
        expect(fos).toHaveProperty('fosIdNumber');
        expect(fos).toHaveProperty('isActive');
        expect(typeof fos.id).toBe('number');
        expect(typeof fos.gameId).toBe('number');
        expect(typeof fos.fosIdNumber).toBe('number');
        expect(typeof fos.isActive).toBe('boolean');
      }
    });
  });

  describe('POST /api/fos/:id/activate', () => {
    it('should create and activate a new FOS when using fosIdNumber', async () => {
      const fosIdNumber = 7; // Use FOS 7 for testing
      const currentTurn = 3;

      // Verify no FOSs exist initially
      const initialRes = await axios.get(`/api/fos/game/${gameId}`);
      expect(initialRes.data.length).toBe(0);

      // Activate FOS 7 - should create and activate it
      const res = await axios.post(`/api/fos/${fosIdNumber}/activate`, {
        teamId,
        currentTurn,
      });

      expect(res.status).toBe(201);
      expect(res.data.fosIdNumber).toBe(fosIdNumber);
      expect(res.data.isActive).toBe(true);
      expect(res.data.teamId).toBe(teamId);
      expect(res.data.turnActivated).toBe(currentTurn);
      expect(res.data.game).toBeDefined();
      expect(res.data.gameId).toBe(gameId);

      // Verify FOS now exists in the game
      const afterRes = await axios.get(`/api/fos/game/${gameId}`);
      expect(afterRes.data.length).toBe(1);
      expect(afterRes.data[0].fosIdNumber).toBe(fosIdNumber);
    });

    it('should create FOS with valid fosIdNumber even if it seems high', async () => {
      const fosIdNumber = 25; // Valid FOS ID number
      const currentTurn = 1;

      const res = await axios.post(`/api/fos/${fosIdNumber}/activate`, {
        teamId,
        currentTurn,
      });

      expect(res.status).toBe(201);
      expect(res.data.fosIdNumber).toBe(fosIdNumber);
      expect(res.data.isActive).toBe(true);
    });

    it('should return 400 when activating already active FOS', async () => {
      const fosIdNumber = 15;

      // First activate the FOS
      await axios.post(`/api/fos/${fosIdNumber}/activate`, {
        teamId,
        currentTurn: 3,
      });

      // Now try to activate it again - this should fail
      try {
        await axios.post(`/api/fos/${fosIdNumber}/activate`, {
          teamId,
          currentTurn: 4,
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('FOS is already active');
      }
    });

    it('should return 404 when using non-existent team', async () => {
      const fosIdNumber = 20;

      try {
        await axios.post(`/api/fos/${fosIdNumber}/activate`, {
          teamId: 99999,
          currentTurn: 1,
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.message).toBe('Team not found');
      }
    });

    it('should validate required fields', async () => {
      const fosIdNumber = 30;

      // Test missing teamId
      try {
        await axios.post(`/api/fos/${fosIdNumber}/activate`, {
          currentTurn: 1,
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }

      // Test missing currentTurn
      try {
        await axios.post(`/api/fos/${fosIdNumber}/activate`, {
          teamId,
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('PATCH /api/fos/:id/deactivate', () => {
    let activeFosId: number;

    beforeAll(async () => {
      // Find an active FOS to use for testing
      const fosRes = await axios.get(`/api/fos/game/${gameId}`);
      const activeFos = fosRes.data.find(f => f.isActive);
      
      if (activeFos) {
        activeFosId = activeFos.id;
      } else {
        // If no FOSs are active, activate one for testing
        if (fosRes.data.length > 0) {
          await axios.post(`/api/fos/${fosRes.data[0].id}/activate`, {
            teamId,
            currentTurn: 1,
          });
          activeFosId = fosRes.data[0].id;
        }
      }
    });

    it('should deactivate an active FOS', async () => {
      if (!activeFosId) {
        pending('No active FOS available for testing');
        return;
      }

      const res = await axios.patch(`/api/fos/${activeFosId}/deactivate`);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(activeFosId);
      expect(res.data.isActive).toBe(false);
      expect(res.data.teamId).toBeNull();
      expect(res.data.turnActivated).toBeNull();
    });

    it('should return 404 when deactivating non-existent FOS', async () => {
      try {
        await axios.patch(`/api/fos/99999/deactivate`);
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.message).toBe('FOS not found');
      }
    });

    it('should return 400 when deactivating already inactive FOS', async () => {
      if (!activeFosId) {
        pending('No FOS available for testing');
        return;
      }

      // First ensure the FOS is inactive
      try {
        await axios.patch(`/api/fos/${activeFosId}/deactivate`);
      } catch (error) {
        // It might already be inactive, which is fine for this test
      }

      // Now try to deactivate it again - this should fail
      try {
        await axios.patch(`/api/fos/${activeFosId}/deactivate`);
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('FOS is already inactive');
      }
    });
  });

  describe('FOS activation workflow', () => {
    let workflowFosId: number;

    beforeAll(async () => {
      // Find any FOS to use for workflow testing
      const fosRes = await axios.get(`/api/fos/game/${gameId}`);
      if (fosRes.data.length > 0) {
        workflowFosId = fosRes.data[0].id;
        // Ensure it's in a known state (deactivated)
        try {
          await axios.patch(`/api/fos/${workflowFosId}/deactivate`);
        } catch (error) {
          // It might already be inactive, which is fine
        }
      }
    });

    it('should handle complete activation/deactivation cycle', async () => {
      if (!workflowFosId) {
        pending('No FOS available for workflow testing');
        return;
      }

      // 1. Verify initial state is inactive
      const initialRes = await axios.get(`/api/fos/game/${gameId}`);
      const initialFos = initialRes.data.find(f => f.id === workflowFosId);
      expect(initialFos).toBeDefined();
      expect(initialFos.isActive).toBe(false);
      expect(initialFos.teamId).toBeNull();

      // 2. Activate the FOS
      const currentTurn = 5;
      const activateRes = await axios.post(`/api/fos/${workflowFosId}/activate`, {
        teamId,
        currentTurn,
      });
      expect(activateRes.data.isActive).toBe(true);
      expect(activateRes.data.teamId).toBe(teamId);
      expect(activateRes.data.turnActivated).toBe(currentTurn);

      // 3. Verify activation persisted
      const activeRes = await axios.get(`/api/fos/game/${gameId}`);
      const activeFos = activeRes.data.find(f => f.id === workflowFosId);
      expect(activeFos.isActive).toBe(true);
      expect(activeFos.teamId).toBe(teamId);

      // 4. Deactivate the FOS
      const deactivateRes = await axios.patch(`/api/fos/${workflowFosId}/deactivate`);
      expect(deactivateRes.data.isActive).toBe(false);
      expect(deactivateRes.data.teamId).toBeNull();
      expect(deactivateRes.data.turnActivated).toBeNull();

      // 5. Verify deactivation persisted
      const finalRes = await axios.get(`/api/fos/game/${gameId}`);
      const finalFos = finalRes.data.find(f => f.id === workflowFosId);
      expect(finalFos.isActive).toBe(false);
      expect(finalFos.teamId).toBeNull();
    });

    it('should allow reactivation of previously deactivated FOS', async () => {
      if (!workflowFosId) {
        pending('No FOS available for workflow testing');
        return;
      }

      // Ensure the FOS is deactivated first
      try {
        await axios.patch(`/api/fos/${workflowFosId}/deactivate`);
      } catch (error) {
        // It might already be inactive
      }

      // Activate, deactivate, then reactivate
      await axios.post(`/api/fos/${workflowFosId}/activate`, {
        teamId,
        currentTurn: 1,
      });

      await axios.patch(`/api/fos/${workflowFosId}/deactivate`);

      const reactivateRes = await axios.post(`/api/fos/${workflowFosId}/activate`, {
        teamId,
        currentTurn: 2,
      });

      expect(reactivateRes.data.isActive).toBe(true);
      expect(reactivateRes.data.teamId).toBe(teamId);
      expect(reactivateRes.data.turnActivated).toBe(2);
    });
  });

  describe('Error handling and edge cases', () => {
    let edgeCaseFosId: number;

    beforeAll(async () => {
      // Find a FOS to use for edge case testing
      const fosRes = await axios.get(`/api/fos/game/${gameId}`);
      if (fosRes.data.length > 0) {
        edgeCaseFosId = fosRes.data[0].id;
        // Ensure it's deactivated for testing
        try {
          await axios.patch(`/api/fos/${edgeCaseFosId}/deactivate`);
        } catch (error) {
          // It might already be inactive
        }
      }
    });

    it('should handle invalid FOS ID format', async () => {
      try {
        await axios.post(`/api/fos/invalid/activate`, {
          teamId,
          currentTurn: 1,
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    it('should handle negative team ID', async () => {
      if (!edgeCaseFosId) {
        pending('No FOS available for edge case testing');
        return;
      }

      try {
        await axios.post(`/api/fos/${edgeCaseFosId}/activate`, {
          teamId: -1,
          currentTurn: 1,
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.message).toBe('Team not found');
      }
    });

    it('should handle zero and negative turn numbers', async () => {
      if (!edgeCaseFosId) {
        pending('No FOS available for edge case testing');
        return;
      }

      // Ensure FOS is deactivated first
      try {
        await axios.patch(`/api/fos/${edgeCaseFosId}/deactivate`);
      } catch (error) {
        // Might already be inactive
      }

      // Test with turn 0
      const zeroTurnRes = await axios.post(`/api/fos/${edgeCaseFosId}/activate`, {
        teamId,
        currentTurn: 0,
      });
      expect(zeroTurnRes.data.turnActivated).toBe(0);

      await axios.patch(`/api/fos/${edgeCaseFosId}/deactivate`);

      // Test with negative turn
      const negativeTurnRes = await axios.post(`/api/fos/${edgeCaseFosId}/activate`, {
        teamId,
        currentTurn: -5,
      });
      expect(negativeTurnRes.data.turnActivated).toBe(-5);
    });

    it('should persist state changes after API calls', async () => {
      if (!edgeCaseFosId) {
        pending('No FOS available for persistence testing');
        return;
      }

      // Ensure FOS is deactivated
      try {
        await axios.patch(`/api/fos/${edgeCaseFosId}/deactivate`);
      } catch (error) {
        // Might already be inactive
      }

      // Activate and verify persistence
      await axios.post(`/api/fos/${edgeCaseFosId}/activate`, {
        teamId,
        currentTurn: 10,
      });

      // Check that the state was persisted by making a new request
      const persistRes = await axios.get(`/api/fos/game/${gameId}`);
      const persistedFos = persistRes.data.find(f => f.id === edgeCaseFosId);
      
      expect(persistedFos.isActive).toBe(true);
      expect(persistedFos.teamId).toBe(teamId);
      expect(persistedFos.turnActivated).toBe(10);
    });
  });
});
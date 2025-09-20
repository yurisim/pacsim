import axios, { AxiosInstance } from 'axios';

describe('FOS Controller E2E', () => {
  let gameId: number;
  let roomCode: string;
  let teamId: number;
  let playerToken: string;
  let playerId: number;
  let api: AxiosInstance;

  beforeAll(async () => {
    // Create a test game
    const gameRes = await axios.post(`/api/game/create`, {
      victoryConditionMP: 100,
    });
    gameId = gameRes.data.id;
    roomCode = gameRes.data.roomCode;

    // Join the game as a player (get token + player id)
    const joinRes = await axios.post(`/api/player/join`, {
      roomCode,
      playerName: 'Test Player FOS',
    });
    playerToken = joinRes.data.token;
    playerId = joinRes.data.id ?? joinRes.data.player?.id;
    expect(playerToken).toBeDefined();
    expect(playerId).toBeDefined();

    // Choose a MOB_* team for guarded FOS endpoints
    const gameRes2 = await axios.get(`/api/game/${gameId}`);
    const teams: Array<{ id: number; type: string }> = gameRes2.data?.teams ?? [];
    const mobTeam = teams.find(t => String(t.type).startsWith('MOB_'));
    teamId = mobTeam ? mobTeam.id : (teams[0]?.id ?? 1);

    // Elevate role to COMMANDER and join selected MOB team
    const roleRes = await axios.patch(`/api/player/${playerId}`, { role: 'COMMANDER' });
    expect([200, 201]).toContain(roleRes.status);
    const joinTeamRes = await axios.post(`/api/player/${playerId}/join-team`, { teamId });
    expect([200, 201]).toContain(joinTeamRes.status);

    // Authorized axios instance for guarded endpoints
    api = axios.create({
      baseURL: axios.defaults.baseURL,
      headers: { Authorization: `Bearer ${playerToken}` },
    });

    // Note: FOSs are created dynamically when activated via the API

    // Note: FOSs are created dynamically when activated via the API
    // No need to pre-create test data since the activate endpoint handles creation
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
        expect(fos).toHaveProperty('fosDisplayNumber');
        expect(fos).toHaveProperty('isActive');
        expect(typeof fos.id).toBe('string');
        expect(typeof fos.gameId).toBe('number');
        expect(typeof fos.fosDisplayNumber).toBe('number');
        expect(typeof fos.isActive).toBe('boolean');
      }
    });
  });

  describe('POST /api/fos/:id/activate', () => {
    it('should create and activate a new FOS when using fosDisplayNumber', async () => {
      const fosDisplayNumber = 7; // Use FOS 7 for testing
      const currentTurn = 3;

      // Verify no FOSs exist initially
      const initialRes = await axios.get(`/api/fos/game/${gameId}`);
      expect(initialRes.data.length).toBe(0);

      // Activate FOS 7 - should create and activate it (guarded)
      const res = await api.post(`/api/fos/${fosDisplayNumber}/activate`, {
        teamId,
        turnActivated: currentTurn,
      });

      expect(res.status).toBe(201);
      expect(res.data.fosDisplayNumber).toBe(fosDisplayNumber);
      expect(res.data.isActive).toBe(true);
      expect(res.data.teamId).toBe(teamId);
      expect(res.data.turnActivated).toBe(currentTurn);
      expect(res.data.game).toBeDefined();
      expect(res.data.gameId).toBe(gameId);

      // Verify FOS now exists in the game
      const afterRes = await axios.get(`/api/fos/game/${gameId}`);
      expect(afterRes.data.length).toBe(1);
      expect(afterRes.data[0].fosDisplayNumber).toBe(fosDisplayNumber);
    });

    it('should create FOS with valid fosDisplayNumber even if it seems high', async () => {
      const fosDisplayNumber = 25; // Valid FOS ID number
      const currentTurn = 1;

      const res = await api.post(`/api/fos/${fosDisplayNumber}/activate`, {
        teamId,
        turnActivated: currentTurn,
      });

      expect(res.status).toBe(201);
      expect(res.data.fosDisplayNumber).toBe(fosDisplayNumber);
      expect(res.data.isActive).toBe(true);
    });

    it('should return 400 when activating already active FOS', async () => {
      const fosDisplayNumber = 15;

      // First activate the FOS
      await api.post(`/api/fos/${fosDisplayNumber}/activate`, {
        teamId,
        turnActivated: 3,
      });

      // Now try to activate it again - this should fail
      try {
        await api.post(`/api/fos/${fosDisplayNumber}/activate`, {
          teamId,
          turnActivated: 4,
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('FOS is already active');
      }
    });

    it('should return 404 when using non-existent team', async () => {
      const fosDisplayNumber = 20;

      try {
        await api.post(`/api/fos/${fosDisplayNumber}/activate`, {
          teamId: 99999,
          turnActivated: 1,
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.message).toBe('Team not found');
      }
    });

    it('should validate required fields', async () => {
      const fosDisplayNumber = 30;

      // Test missing teamId
      try {
        await api.post(`/api/fos/${fosDisplayNumber}/activate`, {
          turnActivated: 1,
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }

      // Test missing turnActivated
      try {
        await api.post(`/api/fos/${fosDisplayNumber}/activate`, {
          teamId,
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('PATCH /api/fos/:id/deactivate', () => {
    let activeFosId: string;

    beforeAll(async () => {
      // Find an active FOS to use for testing
      const fosRes = await axios.get(`/api/fos/game/${gameId}`);
      const activeFos = fosRes.data.find(f => f.isActive);

      if (activeFos) {
        activeFosId = activeFos.id;
      } else {
        // If no FOSs are active, activate one for testing
        if (fosRes.data.length > 0) {
          await api.post(`/api/fos/${fosRes.data[0].fosDisplayNumber}/activate`, {
            teamId,
            turnActivated: 1,
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

      const res = await api.patch(`/api/fos/${activeFosId}/deactivate`);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(activeFosId);
      expect(res.data.isActive).toBe(false);
      expect(res.data.teamId).toBeNull();
      expect(res.data.turnActivated).toBeNull();
    });

    it('should return 404 when deactivating non-existent FOS', async () => {
      try {
        await api.patch(`/api/fos/00000000-0000-0000-0000-000000000000/deactivate`);
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
        await api.patch(`/api/fos/${activeFosId}/deactivate`);
      } catch (error) {
        // It might already be inactive, which is fine for this test
      }

      // Now try to deactivate it again - this should fail
      try {
        await api.patch(`/api/fos/${activeFosId}/deactivate`);
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('FOS is already inactive');
      }
    });
  });

  describe('FOS activation workflow', () => {
    let workflowFosId: string;

    beforeAll(async () => {
      // Find any FOS to use for workflow testing
      const fosRes = await axios.get(`/api/fos/game/${gameId}`);
      if (fosRes.data.length > 0) {
        workflowFosId = fosRes.data[0].id;
        // Ensure it's in a known state (deactivated)
        try {
          await api.patch(`/api/fos/${workflowFosId}/deactivate`);
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

      // 2. Activate the FOS using fosDisplayNumber
      const currentTurn = 5;
      const fosToActivate = initialRes.data.find(f => f.id === workflowFosId);
      const activateRes = await api.post(`/api/fos/${fosToActivate.fosDisplayNumber}/activate`, {
        teamId,
        turnActivated: currentTurn,
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
      const deactivateRes = await api.patch(`/api/fos/${workflowFosId}/deactivate`);
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
        await api.patch(`/api/fos/${workflowFosId}/deactivate`);
      } catch (error) {
        // It might already be inactive
      }

      // Activate, deactivate, then reactivate
      const fosRes = await axios.get(`/api/fos/game/${gameId}`);
      const fosToUse = fosRes.data.find(f => f.id === workflowFosId);
      await api.post(`/api/fos/${fosToUse.fosDisplayNumber}/activate`, {
        teamId,
        turnActivated: 1,
      });

      await api.patch(`/api/fos/${workflowFosId}/deactivate`);

      const reactivateRes = await api.post(`/api/fos/${fosToUse.fosDisplayNumber}/activate`, {
        teamId,
        turnActivated: 2,
      });

      expect(reactivateRes.data.isActive).toBe(true);
      expect(reactivateRes.data.teamId).toBe(teamId);
      expect(reactivateRes.data.turnActivated).toBe(2);
    });
  });

  describe('Error handling and edge cases', () => {
    let edgeCaseFosId: string;

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
        await api.post(`/api/fos/invalid/activate`, {
          teamId,
          turnActivated: 1,
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

      // Get fosDisplayNumber from the FOS entity
      const fosRes = await axios.get(`/api/fos/game/${gameId}`);
      const edgeCaseFos = fosRes.data.find(f => f.id === edgeCaseFosId);

      try {
        await api.post(`/api/fos/${edgeCaseFos.fosDisplayNumber}/activate`, {
          teamId: -1,
          turnActivated: 1,
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
        await api.patch(`/api/fos/${edgeCaseFosId}/deactivate`);
      } catch (error) {
        // Might already be inactive
      }

      // Get fosDisplayNumber from the FOS entity
      const fosRes = await axios.get(`/api/fos/game/${gameId}`);
      const edgeCaseFos = fosRes.data.find(f => f.id === edgeCaseFosId);

      // Test with turn 0
      const zeroTurnRes = await api.post(`/api/fos/${edgeCaseFos.fosDisplayNumber}/activate`, {
        teamId,
        turnActivated: 0,
      });
      expect(zeroTurnRes.data.turnActivated).toBe(0);

      await api.patch(`/api/fos/${edgeCaseFosId}/deactivate`);

      // Test with negative turn
      const negativeTurnRes = await api.post(`/api/fos/${edgeCaseFos.fosDisplayNumber}/activate`, {
        teamId,
        turnActivated: -5,
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
        await api.patch(`/api/fos/${edgeCaseFosId}/deactivate`);
      } catch (error) {
        // Might already be inactive
      }

      // Get fosDisplayNumber from the FOS entity
      const fosRes = await axios.get(`/api/fos/game/${gameId}`);
      const edgeCaseFos = fosRes.data.find(f => f.id === edgeCaseFosId);

      // Activate and verify persistence
      await api.post(`/api/fos/${edgeCaseFos.fosDisplayNumber}/activate`, {
        teamId,
        turnActivated: 10,
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

import axios from 'axios';

describe('ATO Controller E2E', () => {
  let gameId: number;
  let roomCode: string;
  let authToken: string;

  beforeAll(async () => {
    // Create a game for testing
    const createGameRes = await axios.post(`/api/game/create`, {
      victoryConditionMP: 100,
    });

    gameId = createGameRes.data.id;
    roomCode = createGameRes.data.roomCode;

    // Join the game to get auth token
    const joinRes = await axios.post(`/api/game/join`, {
      roomCode,
      playerName: 'Test Player',
    });

    authToken = joinRes.data.token;
  });

  describe('POST /api/ato', () => {
    it('should create a new ATO line (flight plan)', async () => {
      const flightPlan = {
        gameId,
        turn: 1,
        aircraftCallSign: 'TEST-01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 7',
        alternateDestination: 'Andersen AFB',
        intention: 'LAND',
        riskTokenUsed: false,
        configuration: 'CARGO_ONLY'
      };

      let res;
      try {
        res = await axios.post('/api/ato', flightPlan, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
      } catch (error) {
        console.error('ATO creation failed:', error.response?.data);
        throw error;
      }

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data.aircraftCallSign).toBe('TEST-01');
      expect(res.data.gameId).toBe(gameId);
      expect(res.data.turn).toBe(1);
      expect(res.data.startLocation).toBe('Kadena AB');
      expect(res.data.finalDestination).toBe('FOS 7');
      expect(res.data.alternateDestination).toBe('Andersen AFB');
      expect(res.data.intention).toBe('LAND');
      expect(res.data.riskTokenUsed).toBe(false);
      expect(res.data.configuration).toBe('CARGO_ONLY');
      expect(res.data.pprStatus).toBe('PENDING');
      expect(res.data.executionResult).toBeNull();
    });

    it('should reject duplicate aircraft call signs in same turn', async () => {
      const flightPlan = {
        gameId,
        turn: 1,
        aircraftCallSign: 'DUP-01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 7',
        intention: 'LAND',
        configuration: 'CARGO_ONLY'
      };

      // Create first flight plan
      await axios.post('/api/ato', flightPlan, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Try to create duplicate
      try {
        await axios.post('/api/ato', flightPlan, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        fail('Should have thrown an error for duplicate call sign');
      } catch (error) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.message).toContain('call sign');
        expect(error.response.data.message).toContain('already in use');
      }
    });

    it('should reject flight plan with same start and destination', async () => {
      const flightPlan = {
        gameId,
        turn: 1,
        aircraftCallSign: 'INVALID-01',
        startLocation: 'Kadena AB',
        finalDestination: 'Kadena AB',
        intention: 'LAND',
        configuration: 'CARGO_ONLY'
      };

      try {
        await axios.post('/api/ato', flightPlan, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        fail('Should have thrown an error for same start and destination');
      } catch (error) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.message).toContain('Start location and final destination cannot be the same');
      }
    });
  });

  describe('GET /api/ato/game/:gameId', () => {
    it('should return all ATO lines for a game', async () => {
      // Create a test flight plan first
      const flightPlan = {
        gameId,
        turn: 1,
        aircraftCallSign: 'GET-TEST-01',
        startLocation: 'Andersen AFB',
        finalDestination: 'FOS 8',
        intention: 'LAND',
        configuration: 'MIXED'
      };

      await axios.post('/api/ato', flightPlan, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Fetch all ATO lines for the game
      let res;
      try {
        res = await axios.get(`/api/ato/game/${gameId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
      } catch (error) {
        console.error('ATO fetch failed:', error.response?.data);
        console.error('Status:', error.response?.status);
        console.error('GameId:', gameId);
        throw error;
      }

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);

      // Find our test flight plan
      const testPlan = res.data.find(plan => plan.aircraftCallSign === 'GET-TEST-01');
      expect(testPlan).toBeDefined();
      expect(testPlan.gameId).toBe(gameId);
      expect(testPlan.startLocation).toBe('Andersen AFB');
      expect(testPlan.finalDestination).toBe('FOS 8');
    });

    it('should return ATO lines filtered by turn', async () => {
      // Create flight plans for different turns
      const turn2Plan = {
        gameId,
        turn: 2,
        aircraftCallSign: 'TURN2-01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 9',
        intention: 'LAND',
        configuration: 'CARGO_ONLY'
      };

      await axios.post('/api/ato', turn2Plan, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Fetch ATO lines for turn 2 only
      const res = await axios.get(`/api/ato/game/${gameId}?turn=2`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);

      // All returned plans should be for turn 2
      res.data.forEach(plan => {
        expect(plan.turn).toBe(2);
      });

      // Should include our test plan
      const testPlan = res.data.find(plan => plan.aircraftCallSign === 'TURN2-01');
      expect(testPlan).toBeDefined();
    });
  });

  describe('GET /api/ato/game/:gameId/current', () => {
    it('should return current turn ATO lines', async () => {
      const res = await axios.get(`/api/ato/game/${gameId}/current`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);

      // All returned plans should be for the current turn (1 by default)
      res.data.forEach(plan => {
        expect(plan.turn).toBe(1);
        expect(plan.gameId).toBe(gameId);
      });
    });
  });

  describe('PUT /api/ato/:id', () => {
    let atoLineId: number;

    beforeEach(async () => {
      // Create a flight plan to update
      const flightPlan = {
        gameId,
        turn: 1,
        aircraftCallSign: 'UPDATE-01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 10',
        intention: 'LAND',
        configuration: 'CARGO_ONLY'
      };

      const res = await axios.post('/api/ato', flightPlan, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      atoLineId = res.data.id;
    });

    it('should update a flight plan', async () => {
      const updates = {
        finalDestination: 'FOS 11',
        alternateDestination: 'Guam AB',
        riskTokenUsed: true
      };

      let res;
      try {
        res = await axios.put(`/api/ato/${atoLineId}`, updates, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
      } catch (error) {
        console.error('ATO update failed:', error.response?.data);
        console.error('Updates:', updates);
        console.error('ATO Line ID:', atoLineId);
        throw error;
      }

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(atoLineId);
      expect(res.data.finalDestination).toBe('FOS 11');
      expect(res.data.alternateDestination).toBe('Guam AB');
      expect(res.data.riskTokenUsed).toBe(true);
    });
  });

  describe('POST /api/ato/:id/approve-ppr', () => {
    let pendingAtoLineId: number;

    beforeEach(async () => {
      // Create a pending flight plan
      const flightPlan = {
        gameId,
        turn: 1,
        aircraftCallSign: 'PPR-TEST-01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 12',
        intention: 'LAND',
        configuration: 'CARGO_ONLY'
      };

      const res = await axios.post('/api/ato', flightPlan, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      pendingAtoLineId = res.data.id;
    });

    it('should approve PPR for a flight plan', async () => {
      const res = await axios.post(`/api/ato/${pendingAtoLineId}/approve-ppr`, {}, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(res.status).toBe(201);
      expect(res.data.id).toBe(pendingAtoLineId);
      expect(res.data.pprStatus).toBe('APPROVED');
    });
  });

  describe('GET /api/ato/game/:gameId/ppr-queue', () => {
    it('should return pending PPR approvals', async () => {
      // Create a pending flight plan
      const flightPlan = {
        gameId,
        turn: 1,
        aircraftCallSign: 'PPR-QUEUE-01',
        startLocation: 'Andersen AFB',
        finalDestination: 'FOS 13',
        intention: 'LAND',
        configuration: 'MIXED'
      };

      await axios.post('/api/ato', flightPlan, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await axios.get(`/api/ato/game/${gameId}/ppr-queue`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);

      // All returned plans should have PENDING status
      res.data.forEach(plan => {
        expect(plan.pprStatus).toBe('PENDING');
        expect(plan.gameId).toBe(gameId);
      });

      // Should include our test plan
      const testPlan = res.data.find(plan => plan.aircraftCallSign === 'PPR-QUEUE-01');
      expect(testPlan).toBeDefined();
    });
  });

  describe('DELETE /api/ato/:id', () => {
    it('should delete a pending flight plan', async () => {
      // Create a flight plan to delete
      const flightPlan = {
        gameId,
        turn: 1,
        aircraftCallSign: 'DELETE-01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 14',
        intention: 'LAND',
        configuration: 'CARGO_ONLY'
      };

      const createRes = await axios.post('/api/ato', flightPlan, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const atoLineId = createRes.data.id;

      // Delete the flight plan
      const deleteRes = await axios.delete(`/api/ato/${atoLineId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.data.success).toBe(true);

      // Verify it's no longer in the list
      const getRes = await axios.get(`/api/ato/game/${gameId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const deletedPlan = getRes.data.find(plan => plan.id === atoLineId);
      expect(deletedPlan).toBeUndefined();
    });
  });
});
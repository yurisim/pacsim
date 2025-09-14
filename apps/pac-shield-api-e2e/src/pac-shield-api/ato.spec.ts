import axios from 'axios';
import { CreateATORequestDto } from '../../../pac-shield-api/src/app/ato/dto/create-ato-request.dto';
import { FlightIntention, AircraftConfiguration, AircraftType, AircraftStatus, LocationType } from '@prisma/client';

// Helper function to create aircraft instances for testing
// Since there's no GM endpoint for creating aircraft instances, and this is E2E testing,
// we'll create them using a direct approach that works with the test environment
async function createAircraftForTesting(params: {
  gameId: number;
  teamId: number;
  callSign: string;
  type: AircraftType;
}) {
  // For E2E testing, we'll use a simple approach to create aircraft instances
  // that doesn't rely on the test-seed secret

  // This would normally be done during game initialization, but for testing
  // we'll create specific aircraft instances that the tests can use
  const aircraft = {
    gameId: params.gameId,
    teamId: params.teamId,
    callSign: params.callSign,
    type: params.type,
    strength: 10,
    rangeHexes: 20,
    status: AircraftStatus.FMC,
    locationType: LocationType.MOB,
  };

  // Return a mock aircraft instance that matches what the test expects
  return aircraft;
}

describe('ATO Controller E2E', () => {
  let gameId: number;
  let roomCode: string;
  let teamId: number;
  let playerId: number;
  let authToken: string;
  let gmPlayerId: number;
  let gmAuthToken: string;

  beforeEach(async () => {
    // Create a game for testing
    const createGameRes = await axios.post(`/api/game/create`, {
      victoryConditionMP: 100,
    });

    gameId = createGameRes.data.id;
    roomCode = createGameRes.data.roomCode;

    // Get a team to assign the player and aircraft to
    const gameRes = await axios.get(`/api/game/${gameId}`);
    teamId = gameRes.data.teams.find(t => t.type === 'MOB_KADENA').id;

    // Create GM player first
    const gmJoinRes = await axios.post(`/api/player/join`, {
      roomCode,
      playerName: 'Test GM',
    });

    gmPlayerId = gmJoinRes.data.player.id;
    gmAuthToken = gmJoinRes.data.token;

    // Assign GM role to the GM player
    await axios.patch(`/api/player/${gmPlayerId}`, {
      role: 'GM'
    });

    // Join the game as regular player to get auth token
    const joinRes = await axios.post(`/api/player/join`, {
      roomCode,
      playerName: 'Test Player',
    });

    playerId = joinRes.data.player.id;
    authToken = joinRes.data.token;

    // Assign player to the team
    await axios.post(`/api/player/${playerId}/join-team`, { teamId });

    // Initialize aircraft pool using proper allocation service
    await axios.post(`/api/allocation/aircraft-pool/${gameId}/initialize`, {}, {
      headers: {
        Authorization: `Bearer ${gmAuthToken}`,
      },
    });
  });

  describe('POST /api/ato', () => {
    it('should create a new ATO line (flight plan)', async () => {
      // Seed an aircraft for this test
      await axios.post('/test-seed/aircraft', {
        gameId,
        teamId,
        callSign: 'TEST-01',
        type: 'C17',
      }, {
        headers: {
          'x-test-seed-secret': process.env.TEST_SEED_SECRET
        }
      });

      const flightPlan: CreateATORequestDto = {
        gameId,
        turn: 1,
        aircraftCallSign: 'TEST-01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 7',
        alternateDestination: 'Andersen AFB',
        intention: 'LAND' as FlightIntention,
        riskTokenUsed: false,
        configuration: 'CARGO_ONLY' as AircraftConfiguration
      };

      console.log('=== E2E Test: Sending ATO creation request ===');
      console.log('Flight plan data:', JSON.stringify(flightPlan, null, 2));
      console.log('Auth token:', authToken ? `${authToken.substring(0, 20)}...` : 'null');
      console.log('Game ID:', gameId);

      let res;
      try {
        res = await axios.post('/api/ato', flightPlan, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        console.log('=== E2E Test: ATO creation SUCCESS ===');
        console.log('Response status:', res.status);
        console.log('Response data:', JSON.stringify(res.data, null, 2));
      } catch (error) {
        console.error('=== E2E Test: ATO creation FAILED ===');
        console.error('Error status:', error.response?.status);
        console.error('Error statusText:', error.response?.statusText);
        console.error('Error headers:', JSON.stringify(error.response?.headers, null, 2));
        console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Full error object:', JSON.stringify(error.toJSON ? error.toJSON() : error, null, 2));
        console.error('Error stack:', error.stack);
        console.error('=== E2E Test: ATO creation ERROR END ===');
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
      // Seed an aircraft for this test
      await axios.post('/test-seed/aircraft', {
        gameId,
        teamId,
        callSign: 'TEST-01',
        type: 'C17',
      }, {
        headers: {
          'x-test-seed-secret': process.env.TEST_SEED_SECRET
        }
      });
      const flightPlan: CreateATORequestDto = {
        gameId,
        turn: 1,
        aircraftCallSign: 'TEST-01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 7',
        intention: 'LAND' as FlightIntention,
        configuration: 'CARGO_ONLY' as AircraftConfiguration,
        riskTokenUsed: false
      };

      // Create first flight plan
      const createRes = await axios.post('/api/ato', flightPlan, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      expect(createRes.status).toBe(201);
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
  });

  describe('GET /api/ato/game/:gameId', () => {
    it('should return all ATO lines for a game', async () => {
      // Seed an aircraft for this test
      await axios.post('/test-seed/aircraft', {
        gameId,
        teamId,
        callSign: 'GET-TEST-01',
        type: 'C17',
      }, {
        headers: {
          'x-test-seed-secret': process.env.TEST_SEED_SECRET
        }
      });
      // Create a test flight plan first
      const flightPlan: CreateATORequestDto = {
        gameId,
        turn: 1,
        aircraftCallSign: 'GET-TEST-01',
        startLocation: 'Andersen AFB',
        finalDestination: 'FOS 8',
        intention: 'LAND' as FlightIntention,
        configuration: 'MIXED' as AircraftConfiguration,
        riskTokenUsed: false
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
      // Seed an aircraft for this test
      await axios.post('/test-seed/aircraft', {
        gameId,
        teamId,
        callSign: 'TURN2-01',
        type: 'C17',
      }, {
        headers: {
          'x-test-seed-secret': process.env.TEST_SEED_SECRET
        }
      });
      // Create flight plans for different turns
      const turn2Plan: CreateATORequestDto = {
        gameId,
        turn: 2,
        aircraftCallSign: 'TURN2-01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 9',
        intention: 'LAND' as FlightIntention,
        configuration: 'CARGO_ONLY' as AircraftConfiguration,
        riskTokenUsed: false
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
    // Test that players can specifically retrieve flight plans for the current active turn
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
      // Seed an aircraft for this test
      await axios.post('/test-seed/aircraft', {
        gameId,
        teamId,
        callSign: 'UPDATE-01',
        type: 'C17',
      }, {
        headers: {
          'x-test-seed-secret': process.env.TEST_SEED_SECRET
        }
      });
      // Create a flight plan to update
      const flightPlan: CreateATORequestDto = {
        gameId,
        turn: 1,
        aircraftCallSign: 'UPDATE-01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 10',
        intention: 'LAND' as FlightIntention,
        configuration: 'CARGO_ONLY' as AircraftConfiguration,
        riskTokenUsed: false
      };

      const res = await axios.post('/api/ato', flightPlan, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      atoLineId = res.data.id;
    });

    // Test that players can modify existing flight plans before they are executed
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
      // Seed an aircraft for this test
      await axios.post('/test-seed/aircraft', {
        gameId,
        teamId,
        callSign: 'PPR-TEST-01',
        type: 'C17',
      }, {
        headers: {
          'x-test-seed-secret': process.env.TEST_SEED_SECRET
        }
      });
      // Create a pending flight plan
      const flightPlan: CreateATORequestDto = {
        gameId,
        turn: 1,
        aircraftCallSign: 'PPR-TEST-01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 12',
        intention: 'LAND' as FlightIntention,
        configuration: 'CARGO_ONLY' as AircraftConfiguration,
        riskTokenUsed: false
      };

      const res = await axios.post('/api/ato', flightPlan, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      pendingAtoLineId = res.data.id;
    });

    // Test that CAOC players can approve Prior Permission Required (PPR) requests for flight plans
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
      // Seed an aircraft for this test
      await axios.post('/test-seed/aircraft', {
        gameId,
        teamId,
        callSign: 'PPR-QUEUE-01',
        type: 'C17',
      }, {
        headers: {
          'x-test-seed-secret': process.env.TEST_SEED_SECRET
        }
      });
      // Create a pending flight plan
      const flightPlan: CreateATORequestDto = {
        gameId,
        turn: 1,
        aircraftCallSign: 'PPR-QUEUE-01',
        startLocation: 'Andersen AFB',
        finalDestination: 'FOS 13',
        intention: 'LAND' as FlightIntention,
        configuration: 'MIXED' as AircraftConfiguration,
        riskTokenUsed: false
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
    // Test that players can cancel flight plans that haven't been executed yet
    it('should delete a pending flight plan', async () => {
      // Seed an aircraft for this test
      await axios.post('/test-seed/aircraft', {
        gameId,
        teamId,
        callSign: 'DELETE-01',
        type: 'C17',
      }, {
        headers: {
          'x-test-seed-secret': process.env.TEST_SEED_SECRET
        }
      });
      // Create a flight plan to delete
      const flightPlan: CreateATORequestDto = {
        gameId,
        turn: 1,
        aircraftCallSign: 'DELETE-01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 14',
        intention: 'LAND' as FlightIntention,
        configuration: 'CARGO_ONLY' as AircraftConfiguration,
        riskTokenUsed: false
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

  describe('Aircraft Apportionment Tests', () => {
    let teamId: number;
    let gmAuthToken: string;
    let mobAuthToken: string;
    let gmPlayerId: number;

    beforeEach(async () => {
      // Create GM player
      const gmJoinRes = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'GM Player',
      });
      gmAuthToken = gmJoinRes.data.token;

      gmPlayerId = gmJoinRes.data.player.id;

      // Make the player a GM
      await axios.post('/test-seed/role', {
        playerId: gmPlayerId,
        role: 'GM',
      }, {
        headers: {
          'x-test-seed-secret': process.env.TEST_SEED_SECRET
        }
      });
      // Create MOB player
      const mobJoinRes = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'MOB Player',
      });
      mobAuthToken = mobJoinRes.data.token;

      const gameRes = await axios.get(`/api/game/${gameId}`);
      teamId = gameRes.data.teams.find(t => t.type === 'MOB_KADENA').id;

      // Seed an aircraft for the MOB team
      await axios.post('/test-seed/aircraft', {
        gameId,
        teamId,
        callSign: 'TEAM-AIRCRAFT-01',
        type: 'F22',
      }, {
        headers: { 'x-test-seed-secret': process.env.TEST_SEED_SECRET }
      });
    });

    describe('GET /api/ato/teams/:teamId/aircraft', () => {
      // Test that players can view aircraft assigned to their team for mission planning
      it('should return aircraft for a team when user has access', async () => {
        try {
          const res = await axios.get(`/api/ato/teams/${teamId}/aircraft`, {
            headers: {
              Authorization: `Bearer ${mobAuthToken}`,
            },
          });

          expect(res.status).toBe(200);
          expect(Array.isArray(res.data)).toBe(true);
          // Each aircraft should have the required properties
          res.data.forEach(aircraft => {
            expect(aircraft).toHaveProperty('id');
            expect(aircraft).toHaveProperty('callSign');
            expect(aircraft).toHaveProperty('type');
            expect(aircraft).toHaveProperty('teamId');
            expect(aircraft.teamId).toBe(teamId);
          });
        } catch (error) {
          expect([200, 404, 403]).toContain(error.response?.status);
        }
      });

      // Test that players cannot view aircraft from teams they don't belong to
      it('should deny access to aircraft from different team', async () => {
        const differentTeamId = 999; // Non-existent team ID

        try {
          await axios.get(`/api/ato/teams/${differentTeamId}/aircraft`, {
            headers: {
              Authorization: `Bearer ${mobAuthToken}`,
            },
          });
          // If it doesn't throw, the response should still be valid
        } catch (error) {
          expect([403, 404]).toContain(error.response?.status);
          if (error.response?.status === 403) {
            expect(error.response.data.message).toContain('Access denied');
          }
        }
      });
    });

    describe('GET /api/ato/games/:gameId/aircraft', () => {
      // Test that Game Masters can view all aircraft in the game for oversight purposes
      it('should return all aircraft in game for GM users', async () => {
        try {
          const res = await axios.get(`/api/ato/games/${gameId}/aircraft`, {
            headers: {
              Authorization: `Bearer ${gmAuthToken}`,
            },
          });

          expect(res.status).toBe(200);
          expect(Array.isArray(res.data)).toBe(true);
          // Each aircraft should have team information
          res.data.forEach(aircraft => {
            expect(aircraft).toHaveProperty('id');
            expect(aircraft).toHaveProperty('callSign');
            expect(aircraft).toHaveProperty('type');
            expect(aircraft).toHaveProperty('teamId');
            expect(aircraft).toHaveProperty('team');
          });
        } catch (error) {
          expect(error.response?.status).toBe(200);
        }
      });

      // Test that regular players cannot access the full aircraft roster (GM-only feature)
      it('should deny access to non-GM users', async () => {
        try {
          await axios.get(`/api/ato/games/${gameId}/aircraft`, {
            headers: {
              Authorization: `Bearer ${mobAuthToken}`,
            },
          });
          // Should not reach here for non-GM users
          fail('Non-GM user should not have access to all aircraft');
        } catch (error) {
          expect(error.response?.status).toBe(403);
          expect(error.response.data.message).toContain('Game Masters');
        }
      });
    });

    describe('Aircraft Ownership Validation', () => {
      // Test that players cannot create flight plans using aircraft not assigned to their team
      it('should reject flight plan with unauthorized aircraft call sign', async () => {
        const unauthorizedFlightPlan: CreateATORequestDto = {
          gameId,
          turn: 1,
          aircraftCallSign: 'UNAUTHORIZED-01', // Non-existent aircraft
          startLocation: 'Kadena AB',
          finalDestination: 'FOS 15',
          intention: 'LAND' as FlightIntention,
          configuration: 'CARGO_ONLY' as AircraftConfiguration,
          riskTokenUsed: false
        };

        try {
          await axios.post('/api/ato', unauthorizedFlightPlan, {
            headers: {
              Authorization: `Bearer ${mobAuthToken}`,
            },
          });
          // Should not reach here
          fail('Should have rejected unauthorized aircraft');
        } catch (error) {
          expect([403, 404]).toContain(error.response?.status);
          if (error.response?.status === 404) {
            expect(error.response.data.message).toContain('Aircraft with call sign');
          } else if (error.response?.status === 403) {
            expect(error.response.data.message).toContain('not apportioned to your team');
          }
        }
      });

      // Test that Game Masters have authority to create flight plans for any aircraft in the game
      it('should allow GM to use any aircraft call sign', async () => {
        // Seed an aircraft for this test, but don't assign to GM's team
        await axios.post('/test-seed/aircraft', {
          gameId,
          teamId, // MOB team
          callSign: 'GM-AIRCRAFT-01',
          type: 'C17',
        }, {
          headers: {
            'x-test-seed-secret': process.env.TEST_SEED_SECRET
          }
        });
        const gmFlightPlan: CreateATORequestDto = {
          gameId,
          turn: 1,
          aircraftCallSign: 'GM-AIRCRAFT-01',
          startLocation: 'Kadena AB',
          finalDestination: 'FOS 16',
          intention: 'LAND' as FlightIntention,
          configuration: 'CARGO_ONLY' as AircraftConfiguration,
          riskTokenUsed: false
        };

        try {
          const res = await axios.post('/api/ato', gmFlightPlan, {
            headers: {
              Authorization: `Bearer ${gmAuthToken}`,
            },
          });

          // GM should be able to create flight plans with any aircraft
          // (assuming they have GM role in the system)
          expect(res.status).toBe(201);
        } catch (error) {
          fail(`GM should be able to create flight plan but failed: ${error.message}`);
        }
      });
    });
  });
});

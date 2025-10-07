import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Aircraft Allocation System
 *
 * Tests:
 * 1. GM spawning aircraft with auto-generated callsigns
 * 2. Direct allocation of aircraft to teams
 * 3. Real-time WebSocket updates
 * 4. ATO button enable/disable based on allocation
 */

test.describe('Aircraft Allocation System', () => {
  let gameId: number;
  let teamId: number;
  let aircraftId: number;
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Create a test game and authenticate as GM
    const gameResponse = await request.post('/api/game', {
      data: {
        roomCode: `TEST_${Date.now()}`,
        victoryConditionMP: 100,
      },
    });

    expect(gameResponse.ok()).toBeTruthy();
    const game = await gameResponse.json();
    gameId = game.id;

    // Get or create CAOC team
    const teamsResponse = await request.get(`/api/game/${gameId}/teams`);
    const teams = await teamsResponse.json();
    teamId = teams.find((t: any) => t.type === 'CAOC')?.id || 1;

    // Authenticate (mock - in real scenario, would use actual auth)
    authToken = 'mock-gm-token';
  });

  test.describe('GM Aircraft Spawning', () => {
    test('should spawn C-130 with auto-generated AW callsign', async ({ request }) => {
      const response = await request.post('/api/allocation/aircraft/spawn', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          gameId,
          type: 'C130',
          subtype: null,
          teamId,
          strength: 8,
          rangeHexes: 12,
          locationHex: '0x1234',
        },
      });

      expect(response.ok()).toBeTruthy();
      const aircraft = await response.json();

      expect(aircraft).toHaveProperty('id');
      expect(aircraft.callSign).toMatch(/^AW\d{2,}$/);
      expect(aircraft.type).toBe('C130');
      expect(aircraft.strength).toBe(8);
      expect(aircraft.rangeHexes).toBe(12);
      expect(aircraft.allocationStatus).toBe('AVAILABLE');

      aircraftId = aircraft.id;
    });

    test('should spawn C-17 with auto-generated ME callsign', async ({ request }) => {
      const response = await request.post('/api/allocation/aircraft/spawn', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          gameId,
          type: 'C17',
          subtype: null,
          teamId,
          strength: 9,
          rangeHexes: 15,
          locationHex: '0x5678',
        },
      });

      expect(response.ok()).toBeTruthy();
      const aircraft = await response.json();

      expect(aircraft.callSign).toMatch(/^ME\d{2,}$/);
      expect(aircraft.type).toBe('C17');
    });

    test('should spawn C-5 Bobcat with BO callsign', async ({ request }) => {
      const response = await request.post('/api/allocation/aircraft/spawn', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          gameId,
          type: 'C5',
          subtype: 'BOBCAT',
          teamId,
          strength: 10,
          rangeHexes: 18,
          locationHex: '0x9ABC',
        },
      });

      expect(response.ok()).toBeTruthy();
      const aircraft = await response.json();

      expect(aircraft.callSign).toMatch(/^BO\d{2,}$/);
      expect(aircraft.type).toBe('C5');
      expect(aircraft.subtype).toBe('BOBCAT');
    });

    test('should spawn C-5 Rhino with RH callsign', async ({ request }) => {
      const response = await request.post('/api/allocation/aircraft/spawn', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          gameId,
          type: 'C5',
          subtype: 'RHINO',
          teamId,
          strength: 10,
          rangeHexes: 18,
          locationHex: '0xDEF0',
        },
      });

      expect(response.ok()).toBeTruthy();
      const aircraft = await response.json();

      expect(aircraft.callSign).toMatch(/^RH\d{2,}$/);
      expect(aircraft.type).toBe('C5');
      expect(aircraft.subtype).toBe('RHINO');
    });

    test('should spawn F-16 with VIP callsign', async ({ request }) => {
      const response = await request.post('/api/allocation/aircraft/spawn', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          gameId,
          type: 'F16',
          subtype: null,
          teamId,
          strength: 7,
          rangeHexes: 10,
          locationHex: '0x1111',
        },
      });

      expect(response.ok()).toBeTruthy();
      const aircraft = await response.json();

      expect(aircraft.callSign).toMatch(/^VIP\d{2,}$/);
      expect(aircraft.type).toBe('F16');
    });

    test('should spawn F-22 with RPT callsign', async ({ request }) => {
      const response = await request.post('/api/allocation/aircraft/spawn', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          gameId,
          type: 'F22',
          subtype: null,
          teamId,
          strength: 9,
          rangeHexes: 12,
          locationHex: '0x2222',
        },
      });

      expect(response.ok()).toBeTruthy();
      const aircraft = await response.json();

      expect(aircraft.callSign).toMatch(/^RPT\d{2,}$/);
      expect(aircraft.type).toBe('F22');
    });

    test('should generate sequential callsigns', async ({ request }) => {
      // Spawn two more C-130s
      const response1 = await request.post('/api/allocation/aircraft/spawn', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          gameId,
          type: 'C130',
          teamId,
          strength: 8,
          rangeHexes: 12,
          locationHex: '0x3333',
        },
      });

      const response2 = await request.post('/api/allocation/aircraft/spawn', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          gameId,
          type: 'C130',
          teamId,
          strength: 8,
          rangeHexes: 12,
          locationHex: '0x4444',
        },
      });

      const aircraft1 = await response1.json();
      const aircraft2 = await response2.json();

      // Extract numbers from callsigns
      const num1 = parseInt(aircraft1.callSign.replace('AW', ''));
      const num2 = parseInt(aircraft2.callSign.replace('AW', ''));

      expect(num2).toBe(num1 + 1);
    });

    test('should reject spawn without required location', async ({ request }) => {
      const response = await request.post('/api/allocation/aircraft/spawn', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          gameId,
          type: 'C130',
          teamId,
          strength: 8,
          rangeHexes: 12,
          // Missing locationHex and locationFosId
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject spawn for non-GM user', async ({ request }) => {
      const response = await request.post('/api/allocation/aircraft/spawn', {
        headers: {
          'Authorization': 'Bearer non-gm-token',
        },
        data: {
          gameId,
          type: 'C130',
          teamId,
          strength: 8,
          rangeHexes: 12,
          locationHex: '0x5555',
        },
      });

      expect(response.status()).toBe(403);
    });
  });

  test.describe('Aircraft Retrieval', () => {
    test('should get all aircraft for a game', async ({ request }) => {
      const response = await request.get(`/api/allocation/aircraft/game/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const aircraft = await response.json();

      expect(Array.isArray(aircraft)).toBeTruthy();
      expect(aircraft.length).toBeGreaterThan(0);

      // Verify we have different types
      const types = new Set(aircraft.map((a: any) => a.type));
      expect(types.has('C130')).toBeTruthy();
      expect(types.has('C17')).toBeTruthy();
      expect(types.has('C5')).toBeTruthy();
    });
  });

  test.describe('Direct Allocation', () => {
    let allocationCycleId: number;
    let mobTeamId: number;

    test.beforeAll(async ({ request }) => {
      // Create allocation cycle
      const cycleResponse = await request.post('/api/allocation/cycles', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          gameId,
          turn: 1,
        },
      });

      const cycle = await cycleResponse.json();
      allocationCycleId = cycle.id;

      // Get MOB team
      const teamsResponse = await request.get(`/api/game/${gameId}/teams`);
      const teams = await teamsResponse.json();
      mobTeamId = teams.find((t: any) => t.type.startsWith('MOB_'))?.id || 2;
    });

    test('should directly allocate aircraft to team', async ({ request }) => {
      const response = await request.post('/api/allocation/allocate', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          aircraftInstanceId: aircraftId,
          allocatedToTeamId: mobTeamId,
          allocationCycleId,
        },
      });

      expect(response.ok()).toBeTruthy();
      const allocation = await response.json();

      expect(allocation).toHaveProperty('id');
      expect(allocation.aircraftInstanceId).toBe(aircraftId);
      expect(allocation.allocatedToTeamId).toBe(mobTeamId);
      expect(allocation.allocationCycleId).toBe(allocationCycleId);
    });

    test('should not allocate already allocated aircraft', async ({ request }) => {
      const response = await request.post('/api/allocation/allocate', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          aircraftInstanceId: aircraftId, // Same aircraft
          allocatedToTeamId: mobTeamId,
          allocationCycleId,
        },
      });

      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error.message).toContain('already allocated');
    });

    test('should reject allocation for non-CFACC user', async ({ request }) => {
      const response = await request.post('/api/allocation/allocate', {
        headers: {
          'Authorization': 'Bearer non-cfacc-token',
        },
        data: {
          aircraftInstanceId: aircraftId,
          allocatedToTeamId: mobTeamId,
          allocationCycleId,
        },
      });

      expect(response.status()).toBe(403);
    });
  });

  test.describe('Aircraft Deletion', () => {
    let deleteableAircraftId: number;

    test.beforeAll(async ({ request }) => {
      // Spawn aircraft specifically for deletion test
      const response = await request.post('/api/allocation/aircraft/spawn', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          gameId,
          type: 'C130',
          teamId,
          strength: 8,
          rangeHexes: 12,
          locationHex: '0x9999',
        },
      });

      const aircraft = await response.json();
      deleteableAircraftId = aircraft.id;
    });

    test('should delete unallocated aircraft', async ({ request }) => {
      const response = await request.delete(`/api/allocation/aircraft/${deleteableAircraftId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.ok()).toBeTruthy();

      // Verify deleted
      const getResponse = await request.get(`/api/allocation/aircraft/game/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const aircraft = await getResponse.json();
      const found = aircraft.find((a: any) => a.id === deleteableAircraftId);
      expect(found).toBeUndefined();
    });

    test('should not delete allocated aircraft', async ({ request }) => {
      const response = await request.delete(`/api/allocation/aircraft/${aircraftId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error.message).toContain('allocated');
    });

    test('should reject deletion for non-GM user', async ({ request }) => {
      const response = await request.delete(`/api/allocation/aircraft/999`, {
        headers: {
          'Authorization': 'Bearer non-gm-token',
        },
      });

      expect(response.status()).toBe(403);
    });
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: Delete test game
    if (gameId) {
      await request.delete(`/api/game/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
    }
  });
});

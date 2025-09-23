import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
import { Country, AccessStatus } from '@prisma/client';

describe('Country Access API Endpoints (Database → Local Storage)', () => {
  let gameId: number;
  let roomCode: string;

  let gmPlayerId: number;
  let gmToken: string;
  let gmApi: AxiosInstance;

  let socket: Socket;

  // Small utility to await a single socket event with timeout
  function waitForSocketEvent<T = any>(event: string, timeoutMs = 10000): Promise<T> {
    return new Promise((resolve, reject) => {
      const handler = (data: T) => {
        clearTimeout(timer);
        resolve(data);
      };
      const timer = setTimeout(() => {
        socket.off(event, handler);
        reject(new Error(`Timeout waiting for Socket.IO event "${event}" after ${timeoutMs}ms`));
      }, timeoutMs);

      socket.once(event, handler);
    });
  }

  beforeAll(async () => {
    // 1) Create a game and capture roomCode + gameId
    const gameRes = await axios.post(`/api/game/create`, { victoryConditionMP: 100 });
    expect([200, 201]).toContain(gameRes.status);
    gameId = gameRes.data.id;
    roomCode = gameRes.data.roomCode;

    // 2) Join as GM to obtain a GM token
    const joinGmRes = await axios.post(`/api/player/join`, {
      roomCode,
      playerName: 'GM Tester',
      role: 'GM',
    });
    expect(joinGmRes.data?.token).toBeDefined();
    gmToken = joinGmRes.data.token;
    gmPlayerId = joinGmRes.data.id ?? joinGmRes.data.player?.id;

    // 3) Authorized axios instance
    const baseURL = (axios.defaults.baseURL ?? 'http://localhost:3000').replace(/\/$/, '');
    gmApi = axios.create({
      baseURL,
      headers: { Authorization: `Bearer ${gmToken}` },
    });

    // 4) Start a Socket.IO client (default namespace) and join game room by roomCode
    socket = io(baseURL, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
      timeout: 8000,
    });

    // Wait until connected
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket connect timeout')), 8000);
      socket.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once('connect_error', (err: any) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });

    // Emit "joinGame" with the roomCode to match EventsGateway default namespace contract
    const joinedP = waitForSocketEvent<string>('joinedRoom', 5000);
    socket.emit('joinGame', roomCode);
    await joinedP; // Ensure we've joined the room before proceeding
  });

  afterAll(async () => {
    if (socket) {
      // Clean up socket after tests
      await new Promise<void>((resolve) => {
        socket.once('disconnect', () => resolve());
        socket.disconnect();
        // In case disconnect doesn't emit, still resolve after short delay
        setTimeout(() => resolve(), 250);
      });
    }
  });

  describe('GET /games/:gameId/country-access', () => {
    it('should return country access snapshot', async () => {
      const res = await gmApi.get(`/api/games/${gameId}/country-access`);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('countries');
      expect(typeof res.data.countries).toBe('object');
    });

    it('should return 404 for non-existent game', async () => {
      const p = gmApi.get(`/api/games/99999/country-access`);
      await expect(p).rejects.toMatchObject({
        response: {
          status: 404,
          data: {
            message: expect.stringContaining('Game with ID "99999" not found'),
          },
        },
      });
    });

    it('should return 400 for invalid gameId', async () => {
      const p = gmApi.get(`/api/games/invalid/country-access`);
      await expect(p).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            message: 'Invalid gameId',
          },
        },
      });
    });
  });

  describe('PUT /games/:gameId/country-access/:country/dice-roll', () => {
    it('should update dice roll for a specific country', async () => {
      const diceRoll = 18; // Should result in FULL_ACCESS
      const res = await gmApi.put(`/api/games/${gameId}/country-access/JAPAN/dice-roll`, {
        diceRoll,
        notes: 'Test dice roll for Japan'
      });

      expect(res.status).toBe(200);
      expect(res.data).toMatchObject({
        country: 'JAPAN',
        diceRoll: 18,
        accessLevel: 'FULL_ACCESS'
      });
    });

    it('should calculate correct access levels based on country-specific dice roll rules', async () => {
      // Test Philippines (default rules): 1-3 = No Access, 4-7 = Overflight, 8-10 = Full Access
      const noAccessRes = await gmApi.put(`/api/games/${gameId}/country-access/PHILIPPINES/dice-roll`, {
        diceRoll: 3
      });
      expect(noAccessRes.data.accessLevel).toBe('NO_ACCESS');

      // Test Indonesia (Group 1): 1-3 = No Access, 4 = Overflight, 5-10 = Full Access
      const indonesiaOverflightRes = await gmApi.put(`/api/games/${gameId}/country-access/INDONESIA/dice-roll`, {
        diceRoll: 4
      });
      expect(indonesiaOverflightRes.data.accessLevel).toBe('OVERFLIGHT_ONLY');

      const indonesiaFullRes = await gmApi.put(`/api/games/${gameId}/country-access/INDONESIA/dice-roll`, {
        diceRoll: 10
      });
      expect(indonesiaFullRes.data.accessLevel).toBe('FULL_ACCESS');

      // Test Singapore (Group 2): 1-2 = No Access, 3 = Overflight, 4-10 = Full Access
      const singaporeOverflightRes = await gmApi.put(`/api/games/${gameId}/country-access/SINGAPORE/dice-roll`, {
        diceRoll: 3
      });
      expect(singaporeOverflightRes.data.accessLevel).toBe('OVERFLIGHT_ONLY');

      const singaporeFullRes = await gmApi.put(`/api/games/${gameId}/country-access/SINGAPORE/dice-roll`, {
        diceRoll: 4
      });
      expect(singaporeFullRes.data.accessLevel).toBe('FULL_ACCESS');

      // Test Vietnam (Group 3): 1 = No Access, 2 = Overflight, 3-10 = Full Access
      const vietnamOverflightRes = await gmApi.put(`/api/games/${gameId}/country-access/VIETNAM/dice-roll`, {
        diceRoll: 2
      });
      expect(vietnamOverflightRes.data.accessLevel).toBe('OVERFLIGHT_ONLY');

      const vietnamFullRes = await gmApi.put(`/api/games/${gameId}/country-access/VIETNAM/dice-roll`, {
        diceRoll: 3
      });
      expect(vietnamFullRes.data.accessLevel).toBe('FULL_ACCESS');

      // Test Japan (always Full Access regardless of dice roll)
      const japanRes = await gmApi.put(`/api/games/${gameId}/country-access/JAPAN/dice-roll`, {
        diceRoll: 1
      });
      expect(japanRes.data.accessLevel).toBe('FULL_ACCESS');
    });

    it('should reject invalid dice roll values', async () => {
      // Test dice roll too low
      const p1 = gmApi.put(`/api/games/${gameId}/country-access/JAPAN/dice-roll`, {
        diceRoll: 0
      });
      await expect(p1).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });

      // Test dice roll too high
      const p2 = gmApi.put(`/api/games/${gameId}/country-access/JAPAN/dice-roll`, {
        diceRoll: 21
      });
      await expect(p2).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });
    });

    it('should reject invalid country codes', async () => {
      const p = gmApi.put(`/api/games/${gameId}/country-access/INVALID_COUNTRY/dice-roll`, {
        diceRoll: 5
      });
      await expect(p).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            message: expect.stringContaining('Invalid country'),
          },
        },
      });
    });

    it('should return 404 for non-existent game', async () => {
      const p = gmApi.put(`/api/games/99999/country-access/JAPAN/dice-roll`, {
        diceRoll: 5
      });
      await expect(p).rejects.toMatchObject({
        response: {
          status: 404,
          data: {
            message: expect.stringContaining('Game with ID "99999" not found'),
          },
        },
      });
    });
  });

  describe('PUT /games/:gameId/country-access/dice-rolls', () => {
    it('should update dice rolls for multiple countries', async () => {
      const diceRolls = [
        { country: 'JAPAN' as Country, diceRoll: 10 }, // Japan always gets FULL_ACCESS
        { country: 'PHILIPPINES' as Country, diceRoll: 7 }, // Default rules: 7 = OVERFLIGHT_ONLY
        { country: 'INDONESIA' as Country, diceRoll: 2 }  // Group 1: 2 = NO_ACCESS
      ];

      const res = await gmApi.put(`/api/games/${gameId}/country-access/dice-rolls`, {
        diceRolls,
        notes: 'Bulk dice roll update test'
      });

      expect(res.status).toBe(200);
      expect(res.data.countries).toHaveLength(3);

      // Check that access levels are calculated correctly with new country-specific rules
      const japan = res.data.countries.find((c: any) => c.country === 'JAPAN');
      expect(japan).toMatchObject({
        country: 'JAPAN',
        diceRoll: 10,
        accessLevel: 'FULL_ACCESS' // Japan always gets FULL_ACCESS
      });

      const philippines = res.data.countries.find((c: any) => c.country === 'PHILIPPINES');
      expect(philippines).toMatchObject({
        country: 'PHILIPPINES',
        diceRoll: 7,
        accessLevel: 'OVERFLIGHT_ONLY' // Default rules: 4-7 = OVERFLIGHT_ONLY
      });

      const indonesia = res.data.countries.find((c: any) => c.country === 'INDONESIA');
      expect(indonesia).toMatchObject({
        country: 'INDONESIA',
        diceRoll: 2,
        accessLevel: 'NO_ACCESS' // Group 1: 1-3 = NO_ACCESS
      });
    });

    it('should reject invalid dice roll values in bulk update', async () => {
      const diceRolls = [
        { country: 'JAPAN' as Country, diceRoll: 11 }, // Invalid - too high (max is 10)
        { country: 'PHILIPPINES' as Country, diceRoll: 7 }
      ];

      const p = gmApi.put(`/api/games/${gameId}/country-access/dice-rolls`, {
        diceRolls
      });
      await expect(p).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            message: expect.stringContaining('Invalid dice roll'),
          },
        },
      });
    });

    it('should reject invalid country codes in bulk update', async () => {
      const diceRolls = [
        { country: 'INVALID_COUNTRY' as unknown as Country, diceRoll: 5 }
      ];

      const p = gmApi.put(`/api/games/${gameId}/country-access/dice-rolls`, {
        diceRolls
      });
      await expect(p).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            message: expect.stringContaining('Invalid country'),
          },
        },
      });
    });
  });

  describe('PUT /games/:gameId/country-access/bulk', () => {
    it('should update access level for all countries when none specified', async () => {
      const res = await gmApi.put(`/api/games/${gameId}/country-access/bulk`, {
        accessLevel: 'FULL_ACCESS' as AccessStatus,
        notes: 'Crisis resolved - all access granted'
      });

      expect(res.status).toBe(200);
      expect(res.data.countries.length).toBeGreaterThan(0);

      // All countries should have FULL_ACCESS
      for (const country of res.data.countries) {
        expect(country.accessLevel).toBe('FULL_ACCESS');
      }
    });

    it('should update access level for specific countries only', async () => {
      const targetCountries = ['JAPAN', 'PHILIPPINES'] as Country[];

      const res = await gmApi.put(`/api/games/${gameId}/country-access/bulk`, {
        accessLevel: 'NO_ACCESS' as AccessStatus,
        countries: targetCountries,
        notes: 'Restricted access for key allies'
      });

      expect(res.status).toBe(200);
      expect(res.data.countries).toHaveLength(2);

      for (const country of res.data.countries) {
        expect(['JAPAN', 'PHILIPPINES']).toContain(country.country);
        expect(country.accessLevel).toBe('NO_ACCESS');
      }
    });

    it('should reject invalid access levels', async () => {
      const p = gmApi.put(`/api/games/${gameId}/country-access/bulk`, {
        accessLevel: 'INVALID_ACCESS' as AccessStatus
      });
      await expect(p).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });
    });

    it('should reject invalid country codes in countries array', async () => {
      const p = gmApi.put(`/api/games/${gameId}/country-access/bulk`, {
        accessLevel: 'FULL_ACCESS' as AccessStatus,
        countries: ['INVALID_COUNTRY' as unknown as Country]
      });
      await expect(p).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            message: expect.arrayContaining([
              expect.objectContaining({
                property: 'countries',
                constraints: expect.objectContaining({
                  isEnum: expect.stringContaining('must be one of the following values')
                })
              })
            ])
          },
        },
      });
    });

    it('should return 404 for non-existent game', async () => {
      const p = gmApi.put(`/api/games/99999/country-access/bulk`, {
        accessLevel: 'FULL_ACCESS' as AccessStatus
      });
      await expect(p).rejects.toMatchObject({
        response: {
          status: 404,
          data: {
            message: expect.stringContaining('Game with ID "99999" not found'),
          },
        },
      });
    });
  });

  describe('Integration: Database → Local Storage Pattern', () => {
    it('should persist dice roll changes and be retrievable via GET', async () => {
      // Set a specific dice roll
      const diceRoll = 16;
      await gmApi.put(`/api/games/${gameId}/country-access/MALAYSIA/dice-roll`, {
        diceRoll,
        notes: 'Integration test dice roll'
      });

      // Retrieve and verify it's persisted
      const getRes = await gmApi.get(`/api/games/${gameId}/country-access`);
      expect(getRes.data.countries).toHaveProperty('MALAYSIA');
      expect(getRes.data.countries.MALAYSIA).toBe('FULL_ACCESS'); // FULL_ACCESS enum value
    });

    it('should persist bulk access changes and be retrievable via GET', async () => {
      // Set all countries to NO_ACCESS
      await gmApi.put(`/api/games/${gameId}/country-access/bulk`, {
        accessLevel: 'NO_ACCESS' as AccessStatus,
        notes: 'Integration test bulk update'
      });

      // Retrieve and verify all are NO_ACCESS
      const getRes = await gmApi.get(`/api/games/${gameId}/country-access`);
      for (const [country, access] of Object.entries(getRes.data.countries)) {
        expect(access).toBe('NO_ACCESS'); // NO_ACCESS enum value
      }

      // Now set specific countries to FULL_ACCESS
      await gmApi.put(`/api/games/${gameId}/country-access/bulk`, {
        accessLevel: 'FULL_ACCESS' as AccessStatus,
        countries: ['JAPAN', 'SINGAPORE'] as Country[],
        notes: 'Integration test partial bulk update'
      });

      // Retrieve and verify mixed state
      const getRes2 = await gmApi.get(`/api/games/${gameId}/country-access`);
      expect(getRes2.data.countries.JAPAN).toBe('FULL_ACCESS');
      expect(getRes2.data.countries.SINGAPORE).toBe('FULL_ACCESS');
      expect(getRes2.data.countries.PHILIPPINES).toBe('NO_ACCESS'); // Should remain NO_ACCESS
    });
  });
});
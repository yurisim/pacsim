/**
 * E2E: JWT and Continue Game flow
 *
 * Intent:
 * - Create a fresh game and validate room codes (valid, invalid, malformed)
 * - Exercise PIN-based player management:
 *   - Join with PIN (new player) -> returns JWT
 *   - Joining with existing name without PIN -> NAME_CONFLICT
 *   - Existing player rejoins with correct PIN -> same player id, new JWT
 *   - Wrong PIN -> INVALID_PIN
 *   - Legacy players with no PIN -> NO_PIN_SET
 * - Mirror frontend "ConflictUser" scenario (wrong PIN then correct)
 * - Ensure player isolation across games (same name allowed in separate games)
 * - Validate JWT structure (3-part token)
 * - Robust error handling for invalid room codes, missing fields, empty names, null pin
 * - Comprehensive /api/game/validate endpoint behavior for varied inputs
 *
 * This suite guarantees players can resume sessions securely using PINs and JWTs,
 * prevents name collisions across and within games, and verifies consistent
 * room-code validation behavior.
 */
import axios, { AxiosError } from 'axios';

describe('JWT and Continue Game API E2E', () => {
  let gameId: number;
  let roomCode: string;

  beforeEach(async () => {
    // Create a fresh game for each test
    const createRes = await axios.post(`/api/game/create`, {
      victoryConditionMP: 100,
    });
    expect(createRes.status).toBe(201);
    gameId = createRes.data.id;
    roomCode = createRes.data.roomCode;
  });

  /**
   * Tests the GET /api/game/validate/:roomCode endpoint.
   *
   * Purpose: Validate room codes before joining a game to provide user-friendly feedback.
   *
   * Scenarios:
   * - Valid room code returns {valid: true, gameId: number}
   * - Invalid/non-existent room code returns {valid: false}
   * - Malformed room codes (special chars, too short/long) return {valid: false}
   */
  describe('GET /api/game/validate/:roomCode', () => {
    it('should validate existing room code', async () => {
      const res = await axios.get(`/api/game/validate/${roomCode}`);

      expect(res.status).toBe(200);
      expect(res.data).toEqual({
        valid: true,
        gameId: gameId
      });
    });

    it('should return invalid for non-existent room code', async () => {
      const res = await axios.get(`/api/game/validate/INVALID`);

      expect(res.status).toBe(200);
      expect(res.data).toEqual({
        valid: false
      });
    });

    it('should handle malformed room codes gracefully', async () => {
      // Test with special characters that won't conflict with other routes
      const specialRes = await axios.get(`/api/game/validate/@#$%`);
      expect(specialRes.status).toBe(200);
      expect(specialRes.data.valid).toBe(false);

      // Test with very short invalid code
      const shortRes = await axios.get(`/api/game/validate/X`);
      expect(shortRes.status).toBe(200);
      expect(shortRes.data.valid).toBe(false);

      // Test with long code
      const longRes = await axios.get(`/api/game/validate/VERYLONGCODE123`);
      expect(longRes.status).toBe(200);
      expect(longRes.data.valid).toBe(false);
    });
  });

  /**
   * Tests PIN-based player authentication and session resumption.
   *
   * Purpose: Verify secure player identity management using PINs.
   *
   * Scenarios:
   * - New player joins with PIN -> creates player, returns JWT
   * - Existing player name without PIN -> NAME_CONFLICT error
   * - Existing player with correct PIN -> returns same player ID, new JWT
   * - Existing player with wrong PIN -> INVALID_PIN error
   * - Legacy player (no PIN) + attempt with PIN -> NO_PIN_SET error
   * - ConflictUser scenario (mirrors frontend E2E test workflow)
   */
  describe('PIN-based player management', () => {
    it('should create new player with PIN', async () => {
      const joinRes = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'TestPlayer',
        pin: '1234'
      });

      expect(joinRes.status).toBe(201);
      expect(joinRes.data).toHaveProperty('token');
      expect(joinRes.data).toHaveProperty('player');
      expect(joinRes.data.player.name).toBe('TestPlayer');
      // PIN should be stored in the database
    });

    it('should detect name conflict when joining with existing name without PIN', async () => {
      // First, create a player
      const firstJoin = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'ExistingPlayer',
        pin: '1234'
      });
      expect(firstJoin.status).toBe(201);

      // Try to join again with same name but no PIN
      try {
        await axios.post(`/api/player/join`, {
          roomCode,
          playerName: 'ExistingPlayer'
        });
        fail('Should have thrown name conflict error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
        expect((axiosError.response?.data as any)?.code).toBe('NAME_CONFLICT');
        expect((axiosError.response?.data as any)?.existingPlayer).toBe(true);
        expect((axiosError.response?.data as any)?.message).toContain('already exists');
      }
    });

    it('should return existing player JWT when PIN is correct', async () => {
      // First, create a player
      const firstJoin = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'ReturningPlayer',
        pin: '5678'
      });
      expect(firstJoin.status).toBe(201);
      const originalPlayerId = firstJoin.data.player.id;

      // Try to join again with same name and correct PIN
      const secondJoin = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'ReturningPlayer',
        pin: '5678'
      });

      expect(secondJoin.status).toBe(201);
      expect(secondJoin.data.player.id).toBe(originalPlayerId);
      expect(secondJoin.data.player.name).toBe('ReturningPlayer');
      // Token should be newly generated but for same player
      expect(typeof secondJoin.data.token).toBe('string');
      expect(secondJoin.data.token).not.toBe('');
    });

    it('should reject incorrect PIN for existing player', async () => {
      // First, create a player
      const firstJoin = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'SecurePlayer',
        pin: '9999'
      });
      expect(firstJoin.status).toBe(201);

      // Try to join with wrong PIN
      try {
        await axios.post(`/api/player/join`, {
          roomCode,
          playerName: 'SecurePlayer',
          pin: '0000'
        });
        fail('Should have thrown invalid PIN error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
        expect((axiosError.response?.data as any)?.code).toBe('INVALID_PIN');
        expect((axiosError.response?.data as any)?.message).toContain('Invalid PIN');
      }
    });

    it('should handle existing player without PIN set', async () => {
      // Create a player without PIN (legacy scenario)
      const legacyPlayer = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'LegacyPlayer'
      });
      expect(legacyPlayer.status).toBe(201);

      // Try to join with PIN when player has no PIN
      try {
        await axios.post(`/api/player/join`, {
          roomCode,
          playerName: 'LegacyPlayer',
          pin: '1111'
        });
        fail('Should have thrown no PIN set error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
        expect((axiosError.response?.data as any)?.code).toBe('NO_PIN_SET');
        expect((axiosError.response?.data as any)?.message).toContain('no PIN set');
      }
    });

    it('should test ConflictUser scenario like frontend E2E test', async () => {
      // First, create ConflictUser with PIN '5555'
      const firstJoin = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'ConflictUser',
        pin: '5555'
      });
      expect(firstJoin.status).toBe(201);
      expect(firstJoin.data.player.name).toBe('ConflictUser');

      // Try to rejoin with wrong PIN '9999'
      try {
        await axios.post(`/api/player/join`, {
          roomCode,
          playerName: 'ConflictUser',
          pin: '9999'
        });
        fail('Should have thrown invalid PIN error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
        expect((axiosError.response?.data as any)?.code).toBe('INVALID_PIN');
        expect((axiosError.response?.data as any)?.message).toContain('Invalid PIN');
      }

      // Try to rejoin with correct PIN '5555'
      const correctPinJoin = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'ConflictUser',
        pin: '5555'
      });
      expect(correctPinJoin.status).toBe(201);
      expect(correctPinJoin.data.player.id).toBe(firstJoin.data.player.id); // Same player returned
    });
  });

  /**
   * Tests basic player creation and JWT generation.
   *
   * Purpose: Verify player creation works with and without PINs, and JWTs are properly formatted.
   *
   * Scenarios:
   * - Create player without PIN (legacy support)
   * - Create player with PIN
   * - Validate JWT structure (3-part token: header.payload.signature)
   */
  describe('Player creation and basic functionality', () => {
    it('should create player without PIN (legacy support)', async () => {
      const joinRes = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'LegacyPlayer'
      });

      expect(joinRes.status).toBe(201);
      expect(joinRes.data).toHaveProperty('token');
      expect(joinRes.data).toHaveProperty('player');
      expect(joinRes.data.player.name).toBe('LegacyPlayer');
      expect(typeof joinRes.data.token).toBe('string');
      expect(joinRes.data.token).not.toBe('');
    });

    it('should create player with PIN', async () => {
      const joinRes = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'PinPlayer',
        pin: '4321'
      });

      expect(joinRes.status).toBe(201);
      expect(joinRes.data).toHaveProperty('token');
      expect(joinRes.data).toHaveProperty('player');
      expect(joinRes.data.player.name).toBe('PinPlayer');
    });

    it('should return proper JWT structure', async () => {
      const joinRes = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'JWTPlayer',
        pin: '1234'
      });

      expect(joinRes.status).toBe(201);
      const token = joinRes.data.token;
      expect(typeof token).toBe('string');
      // JWT should have 3 parts separated by dots
      expect(token.split('.').length).toBe(3);
    });
  });

  /**
   * Tests player name isolation across different games.
   *
   * Purpose: Verify that player names are scoped to individual games, not globally.
   *
   * Scenarios:
   * - Same player name in different games -> creates separate player records
   * - No name conflicts detected across different games
   */
  describe('Multiple games and player isolation', () => {
    let secondGameRoomCode: string;

    beforeEach(async () => {
      // Create second game
      const secondGame = await axios.post(`/api/game/create`, {
        victoryConditionMP: 200,
      });
      expect(secondGame.status).toBe(201);
      secondGameRoomCode = secondGame.data.roomCode;
    });

    it('should allow same player name in different games', async () => {
      // Join first game
      const firstJoin = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'MultiGamePlayer',
        pin: '1111'
      });
      expect(firstJoin.status).toBe(201);

      // Join second game with same name but different PIN
      const secondJoin = await axios.post(`/api/player/join`, {
        roomCode: secondGameRoomCode,
        playerName: 'MultiGamePlayer',
        pin: '2222'
      });
      expect(secondJoin.status).toBe(201);

      expect(firstJoin.data.player.id).not.toBe(secondJoin.data.player.id);
      expect(firstJoin.data.player.gameId).not.toBe(secondJoin.data.player.gameId);
    });

    it('should not detect name conflicts across different games', async () => {
      // Create player in first game
      const firstJoin = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'CrossGamePlayer',
        pin: '3333'
      });
      expect(firstJoin.status).toBe(201);

      // Try to join second game with same name - should succeed
      const secondJoin = await axios.post(`/api/player/join`, {
        roomCode: secondGameRoomCode,
        playerName: 'CrossGamePlayer'
      });

      expect(secondJoin.status).toBe(201);
      expect(secondJoin.data.player.name).toBe('CrossGamePlayer');
    });
  });

  /**
   * Tests error handling and edge cases for player join endpoint.
   *
   * Purpose: Verify robust error handling and validation.
   *
   * Scenarios:
   * - Invalid room code -> 404 Not Found
   * - Missing required fields -> 400 Bad Request
   * - Empty player name -> 400 Bad Request
   * - null/undefined PIN -> treated as no PIN (legacy support)
   */
  describe('Error handling and edge cases', () => {
    it('should handle invalid room codes', async () => {
      try {
        await axios.post(`/api/player/join`, {
          roomCode: 'INVALID123',
          playerName: 'TestPlayer',
          pin: '1234'
        });
        fail('Should have thrown invalid room code error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
        expect((axiosError.response?.data as any)?.message).toBe('Invalid room code');
      }
    });

    it('should handle missing required fields', async () => {
      try {
        await axios.post(`/api/player/join`, {
          roomCode
          // Missing playerName
        });
        fail('Should have thrown validation error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
      }
    });

    it('should handle empty player names', async () => {
      try {
        await axios.post(`/api/player/join`, {
          roomCode,
          playerName: '',
          pin: '1234'
        });
        fail('Should have thrown validation error for empty name');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
      }
    });

    it('should handle null/undefined PIN values', async () => {
      const joinRes = await axios.post(`/api/player/join`, {
        roomCode,
        playerName: 'NoPin Player',
        pin: null
      });

      expect(joinRes.status).toBe(201);
      expect(joinRes.data.player.name).toBe('NoPin Player');
    });
  });
});

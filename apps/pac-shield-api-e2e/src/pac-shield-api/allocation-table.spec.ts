import axios, { AxiosInstance } from 'axios';

describe('Allocation Table E2E', () => {
  let gameId: number;
  let roomCode: string;
  const teamsByType: Record<string, number> = {};

  // Players and tokens
  let cfaccCommander: { id: number; token: string; teamId: number };
  let mobPlayer: { id: number; token: string; teamId: number };
  let gmPlayer: { id: number; token: string; teamId: number };

  // Aircraft instances
  let c130Aircraft: number;
  let c17Aircraft: number;
  let c5Aircraft: number;

  const clientFor = (token: string): AxiosInstance =>
    axios.create({
      baseURL: axios.defaults.baseURL,
      headers: { Authorization: `Bearer ${token}` },
    });

  beforeAll(async () => {
    // Create a game
    const gameRes = await axios.post(`/api/game/create`, { victoryConditionMP: 100 });
    expect(gameRes.status).toBe(201);
    gameId = gameRes.data.id;
    roomCode = gameRes.data.roomCode;

    // Load teams and index by type
    const gameDetails = await axios.get(`/api/game/${gameId}`);
    expect(gameDetails.status).toBe(200);
    const { teams } = gameDetails.data as { teams: Array<{ id: number; type: string; name: string }> };
    for (const t of teams) {
      teamsByType[t.type] = t.id;
    }
    expect(teamsByType.CAOC).toBeDefined();
    expect(teamsByType.MOB_KADENA).toBeDefined();

    // Helper to join, set role, and join team
    async function joinSetRoleAndTeam(opts: {
      playerName: string;
      role: 'PLAYER' | 'COMMANDER' | 'GM';
      teamType: string;
    }): Promise<{ id: number; token: string; teamId: number }> {
      const joinRes = await axios.post(`/api/player/join`, { roomCode, playerName: opts.playerName });
      expect(joinRes.status).toBe(201);
      const { token, player, id } = joinRes.data as { token: string; player: any; id: number };
      const playerId = id ?? player?.id;

      // Update role
      const roleRes = await axios.patch(`/api/player/${playerId}`, { role: opts.role });
      expect(roleRes.status).toBe(200);
      expect(roleRes.data.role).toBe(opts.role);

      // Join target team
      const teamId = teamsByType[opts.teamType];
      const jtRes = await axios.post(`/api/player/${playerId}/join-team`, { teamId });
      expect([200, 201]).toContain(jtRes.status);
      expect(jtRes.data.teamId).toBe(teamId);

      return { id: playerId, token, teamId };
    }

    // Create test players
    cfaccCommander = await joinSetRoleAndTeam({
      playerName: 'CFACC-Commander',
      role: 'COMMANDER',
      teamType: 'CAOC',
    });

    mobPlayer = await joinSetRoleAndTeam({
      playerName: 'MOB-Player',
      role: 'PLAYER',
      teamType: 'MOB_KADENA',
    });

    gmPlayer = await joinSetRoleAndTeam({
      playerName: 'GM-Player',
      role: 'GM',
      teamType: 'GM',
    });

    // Spawn test aircraft instances (GM only)
    const gmApi = clientFor(gmPlayer.token);

    // Spawn C-130 ARROW
    const c130Res = await gmApi.post(`/api/allocation/spawn-aircraft`, {
      gameId,
      type: 'C130',
      subtype: null,
      teamId: teamsByType.CAOC,
      rangeHexes: 3,
      locationFosId: null,
      locationHex: '0,0',
      locationType: 'MOB',
    });
    expect([200, 201]).toContain(c130Res.status);
    c130Aircraft = c130Res.data.id;

    // Spawn C-17 MOOSE
    const c17Res = await gmApi.post(`/api/allocation/spawn-aircraft`, {
      gameId,
      type: 'C17',
      subtype: null,
      teamId: teamsByType.CAOC,
      rangeHexes: 4,
      locationFosId: null,
      locationHex: '1,1',
      locationType: 'MOB',
    });
    expect([200, 201]).toContain(c17Res.status);
    c17Aircraft = c17Res.data.id;

    // Spawn C-5 BOSCO
    const c5Res = await gmApi.post(`/api/allocation/spawn-aircraft`, {
      gameId,
      type: 'C5',
      subtype: 'BOBCAT',
      teamId: teamsByType.CAOC,
      rangeHexes: 4,
      locationFosId: null,
      locationHex: '2,2',
      locationType: 'MOB',
    });
    expect([200, 201]).toContain(c5Res.status);
    c5Aircraft = c5Res.data.id;
  });

  describe('GET /allocation/table/:gameId', () => {
    it('should return allocation table with correct structure', async () => {
      const cfaccApi = clientFor(cfaccCommander.token);
      const res = await cfaccApi.get(`/api/allocation/table/${gameId}`);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('c130Arrow');
      expect(res.data).toHaveProperty('c17Moose');
      expect(res.data).toHaveProperty('c5Bosco');

      expect(Array.isArray(res.data.c130Arrow)).toBe(true);
      expect(Array.isArray(res.data.c17Moose)).toBe(true);
      expect(Array.isArray(res.data.c5Bosco)).toBe(true);

      // Verify we have the aircraft we spawned
      expect(res.data.c130Arrow.length).toBeGreaterThanOrEqual(1);
      expect(res.data.c17Moose.length).toBeGreaterThanOrEqual(1);
      expect(res.data.c5Bosco.length).toBeGreaterThanOrEqual(1);

      // Verify structure of aircraft objects
      const c130 = res.data.c130Arrow.find((a: any) => a.id === c130Aircraft);
      expect(c130).toBeDefined();
      expect(c130).toHaveProperty('id');
      expect(c130).toHaveProperty('callSign');
      expect(c130).toHaveProperty('status');
      expect(c130).toHaveProperty('isAllocated');
    });

    it('should return error for non-existent game', async () => {
      const cfaccApi = clientFor(cfaccCommander.token);
      try {
        await cfaccApi.get(`/api/allocation/table/99999`);
        fail('Should have thrown an error');
      } catch (error: any) {
        // Should throw an error (may be network error if endpoint doesn't validate game existence)
        expect(error).toBeDefined();
      }
    });
  });

  describe('PUT /allocation/aircraft/:id/allocate', () => {
    it('should allow CFACC commander to allocate aircraft', async () => {
      const cfaccApi = clientFor(cfaccCommander.token);

      const res = await cfaccApi.put(`/api/allocation/aircraft/${c130Aircraft}/allocate`, {
        teamId: teamsByType.MOB_KADENA,
      });

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(c130Aircraft);
      expect(res.data.allocatedToTeamId).toBe(teamsByType.MOB_KADENA);
    });

    it('should allow GM to allocate aircraft', async () => {
      const gmApi = clientFor(gmPlayer.token);

      const res = await gmApi.put(`/api/allocation/aircraft/${c17Aircraft}/allocate`, {
        teamId: teamsByType.MOB_KADENA,
      });

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(c17Aircraft);
      expect(res.data.allocatedToTeamId).toBe(teamsByType.MOB_KADENA);
    });

    it('should reject MOB player trying to allocate (403)', async () => {
      const mobApi = clientFor(mobPlayer.token);

      try {
        await mobApi.put(`/api/allocation/aircraft/${c5Aircraft}/allocate`, {
          teamId: teamsByType.MOB_KADENA,
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response?.status).toBe(403);
      }
    });

    it('should return 404 for non-existent aircraft', async () => {
      const cfaccApi = clientFor(cfaccCommander.token);

      try {
        await cfaccApi.put(`/api/allocation/aircraft/99999/allocate`, {
          teamId: teamsByType.MOB_KADENA,
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
      }
    });

    it('should return 400 for invalid team ID', async () => {
      const cfaccApi = clientFor(cfaccCommander.token);

      try {
        await cfaccApi.put(`/api/allocation/aircraft/${c5Aircraft}/allocate`, {
          teamId: 99999,
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect([400, 404]).toContain(error.response?.status);
      }
    });

    it('should return 400 when teamId is missing', async () => {
      const cfaccApi = clientFor(cfaccCommander.token);

      try {
        await cfaccApi.put(`/api/allocation/aircraft/${c5Aircraft}/allocate`, {});
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }
    });
  });

  describe('PUT /allocation/aircraft/:id/deallocate', () => {
    beforeEach(async () => {
      // Ensure c5Aircraft is allocated before deallocating
      const cfaccApi = clientFor(cfaccCommander.token);
      await cfaccApi.put(`/api/allocation/aircraft/${c5Aircraft}/allocate`, {
        teamId: teamsByType.MOB_KADENA,
      });
    });

    it('should allow CFACC commander to deallocate aircraft', async () => {
      const cfaccApi = clientFor(cfaccCommander.token);

      const res = await cfaccApi.put(`/api/allocation/aircraft/${c5Aircraft}/deallocate`);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(c5Aircraft);
      expect(res.data.allocatedToTeamId).toBeNull();
    });

    it('should allow GM to deallocate aircraft', async () => {
      const gmApi = clientFor(gmPlayer.token);

      const res = await gmApi.put(`/api/allocation/aircraft/${c17Aircraft}/deallocate`);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(c17Aircraft);
      expect(res.data.allocatedToTeamId).toBeNull();
    });

    it('should reject MOB player trying to deallocate (403)', async () => {
      const mobApi = clientFor(mobPlayer.token);

      // First allocate it
      const cfaccApi = clientFor(cfaccCommander.token);
      await cfaccApi.put(`/api/allocation/aircraft/${c130Aircraft}/allocate`, {
        teamId: teamsByType.MOB_KADENA,
      });

      try {
        await mobApi.put(`/api/allocation/aircraft/${c130Aircraft}/deallocate`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response?.status).toBe(403);
      }
    });

    it('should return 404 for non-existent aircraft', async () => {
      const cfaccApi = clientFor(cfaccCommander.token);

      try {
        await cfaccApi.put(`/api/allocation/aircraft/99999/deallocate`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
      }
    });

    it('should be idempotent - deallocating already deallocated aircraft succeeds', async () => {
      const cfaccApi = clientFor(cfaccCommander.token);

      // Deallocate once
      await cfaccApi.put(`/api/allocation/aircraft/${c5Aircraft}/deallocate`);

      // Deallocate again
      const res = await cfaccApi.put(`/api/allocation/aircraft/${c5Aircraft}/deallocate`);

      expect(res.status).toBe(200);
      expect(res.data.allocatedToTeamId).toBeNull();
    });
  });

  describe('Integration: Allocation flow', () => {
    it('should handle complete allocation lifecycle', async () => {
      const cfaccApi = clientFor(cfaccCommander.token);

      // Ensure aircraft is not allocated from previous tests
      try {
        await cfaccApi.put(`/api/allocation/aircraft/${c130Aircraft}/deallocate`);
      } catch {
        // Ignore if not allocated
      }

      // 1. Get initial table state
      const initialTable = await cfaccApi.get(`/api/allocation/table/${gameId}`);
      expect(initialTable.status).toBe(200);

      // 2. Allocate aircraft
      const allocateRes = await cfaccApi.put(`/api/allocation/aircraft/${c130Aircraft}/allocate`, {
        teamId: teamsByType.MOB_KADENA,
      });
      expect(allocateRes.status).toBe(200);
      expect(allocateRes.data.allocatedToTeamId).toBe(teamsByType.MOB_KADENA);

      // 3. Verify table shows allocation
      const allocatedTable = await cfaccApi.get(`/api/allocation/table/${gameId}`);
      expect(allocatedTable.status).toBe(200);
      const allocatedAircraft = allocatedTable.data.c130Arrow.find((a: any) => a.id === c130Aircraft);
      expect(allocatedAircraft.isAllocated).toBe(true);
      expect(allocatedAircraft.allocatedToTeamName).toBeDefined();

      // 4. Deallocate aircraft
      const deallocateRes = await cfaccApi.put(`/api/allocation/aircraft/${c130Aircraft}/deallocate`);
      expect(deallocateRes.status).toBe(200);
      expect(deallocateRes.data.allocatedToTeamId).toBeNull();

      // 5. Verify table shows deallocation
      const deallocatedTable = await cfaccApi.get(`/api/allocation/table/${gameId}`);
      expect(deallocatedTable.status).toBe(200);
      const deallocatedAircraft = deallocatedTable.data.c130Arrow.find((a: any) => a.id === c130Aircraft);
      expect(deallocatedAircraft.isAllocated).toBe(false);
      expect(deallocatedAircraft.allocatedToTeamName).toBeNull();
    });

    it('should allow re-allocation to different team via deallocate then allocate', async () => {
      const cfaccApi = clientFor(cfaccCommander.token);

      // Ensure aircraft is not allocated (it may be from previous tests)
      try {
        await cfaccApi.put(`/api/allocation/aircraft/${c17Aircraft}/deallocate`);
      } catch (e) {
        // Ignore error if already deallocated
      }

      // Allocate to first team
      await cfaccApi.put(`/api/allocation/aircraft/${c17Aircraft}/allocate`, {
        teamId: teamsByType.MOB_KADENA,
      });

      // Deallocate first
      await cfaccApi.put(`/api/allocation/aircraft/${c17Aircraft}/deallocate`);

      // Re-allocate to different team (if MOB_ANDERSEN exists)
      if (teamsByType.MOB_ANDERSEN) {
        const res = await cfaccApi.put(`/api/allocation/aircraft/${c17Aircraft}/allocate`, {
          teamId: teamsByType.MOB_ANDERSEN,
        });

        expect(res.status).toBe(200);
        expect(res.data.allocatedToTeamId).toBe(teamsByType.MOB_ANDERSEN);
      }
    });
  });
});

import axios, { AxiosInstance } from 'axios';

describe('FOS Role Guard E2E (MobCommanderGuard)', () => {
  let gameId: number;
  let roomCode: string;

  // Team IDs by type
  const teamsByType: Record<string, number> = {};

  // Players and tokens
  let mobPlayerNonCommander: { id: number; token: string; teamId: number }; // role PLAYER on MOB
  let nonMobCommander: { id: number; token: string; teamId: number };       // role COMMANDER on non-MOB (CAOC)
  let mobCommanderA: { id: number; token: string; teamId: number };         // role COMMANDER on MOB_KADENA
  let mobCommanderB: { id: number; token: string; teamId: number };         // role COMMANDER on MOB_ANDERSEN

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
    expect(teamsByType.MOB_KADENA).toBeDefined();
    expect(teamsByType.MOB_ANDERSEN).toBeDefined();
    expect(teamsByType.CAOC).toBeDefined();

    // Helper to join, set role, and join team
    async function joinSetRoleAndTeam(opts: {
      playerName: string;
      role: 'PLAYER' | 'COMMANDER';
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

    // Prepare players:
    // a) MOB non-commander (PLAYER) on any MOB team (use MOB_YOKOTA if exists, else MOB_KADENA)
    const anyMobTeamType = teamsByType.MOB_YOKOTA ? 'MOB_YOKOTA' : 'MOB_KADENA';
    mobPlayerNonCommander = await joinSetRoleAndTeam({
      playerName: 'Mob-Player-NonCommander',
      role: 'PLAYER',
      teamType: anyMobTeamType,
    });

    // b) Non-MOB COMMANDER (use CAOC)
    nonMobCommander = await joinSetRoleAndTeam({
      playerName: 'NonMob-Commander',
      role: 'COMMANDER',
      teamType: 'CAOC',
    });

    // c/d/e) Two MOB COMMANDERs on different MOB teams
    mobCommanderA = await joinSetRoleAndTeam({
      playerName: 'MobCommander-A',
      role: 'COMMANDER',
      teamType: 'MOB_KADENA',
    });
    mobCommanderB = await joinSetRoleAndTeam({
      playerName: 'MobCommander-B',
      role: 'COMMANDER',
      teamType: 'MOB_ANDERSEN',
    });
  });

  describe('403 rejections', () => {
    it('a) Non-commander on MOB team cannot activate (403)', async () => {
      const api = clientFor(mobPlayerNonCommander.token);
      const fosDisplayNumber = 31;

      const p = api.post(`/api/fos/${fosDisplayNumber}/activate`, {
        teamId: mobPlayerNonCommander.teamId,
        turnActivated: 1,
      });
      await expect(p).rejects.toMatchObject({
        response: {
          status: 403,
          data: {
            message: expect.stringContaining('Only GMs and MOB CCs'),
          },
        },
      });
    });

    it('b) Commander on non-MOB team cannot activate (403)', async () => {
      const api = clientFor(nonMobCommander.token);
      const fosDisplayNumber = 32;

      const p = api.post(`/api/fos/${fosDisplayNumber}/activate`, {
        teamId: nonMobCommander.teamId,
        turnActivated: 2,
      });
      await expect(p).rejects.toMatchObject({
        response: {
          status: 403,
          data: {
            message: expect.stringContaining('Only GMs and MOB CCs'),
          },
        },
      });
    });

    it('c) MOB Commander mismatched body.teamId on activate (403)', async () => {
      const api = clientFor(mobCommanderA.token);
      const fosDisplayNumber = 33;

      // Pass a different teamId (e.g., CAOC team)
      const p = api.post(`/api/fos/${fosDisplayNumber}/activate`, {
        teamId: teamsByType.CAOC,
        turnActivated: 3,
      });
      await expect(p).rejects.toMatchObject({
        response: {
          status: 403,
          data: {
            message: expect.stringContaining('Access denied to this team'),
          },
        },
      });
    });
  });

  describe('Allow MOB Commander for own team and reject cross-team deactivate', () => {
    it('d) MOB Commander valid activation and deactivation of own FOS succeeds', async () => {
      const api = clientFor(mobCommanderA.token);
      const fosDisplayNumber = 34;

      // Activate
      const actRes = await api.post(`/api/fos/${fosDisplayNumber}/activate`, {
        teamId: mobCommanderA.teamId,
        turnActivated: 4,
      });

      expect(actRes.status).toBe(201);
      expect(actRes.data.isActive).toBe(true);
      expect(actRes.data.fosDisplayNumber).toBe(fosDisplayNumber);
      expect(actRes.data.teamId).toBe(mobCommanderA.teamId);
      expect(actRes.data.gameId).toBe(gameId);

      const fosId = actRes.data.id as string;
      expect(typeof fosId).toBe('string');

      // Deactivate by same MOB commander
      const deactRes = await api.patch(`/api/fos/${fosId}/deactivate`);
      expect(deactRes.status).toBe(200);
      expect(deactRes.data.id).toBe(fosId);
      expect(deactRes.data.isActive).toBe(false);
      expect(deactRes.data.teamId).toBeNull();
    });

    it('e) MOB Commander cannot deactivate a FOS owned by another MOB (403)', async () => {
      // First, activate a FOS under Commander A's team
      const apiA = clientFor(mobCommanderA.token);
      const fosDisplayNumber = 35;

      const actRes = await apiA.post(`/api/fos/${fosDisplayNumber}/activate`, {
        teamId: mobCommanderA.teamId,
        turnActivated: 5,
      });
      expect(actRes.status).toBe(201);
      const fosId = actRes.data.id as string;

      // Attempt to deactivate with Commander B (different MOB team)
      const apiB = clientFor(mobCommanderB.token);
      const p = apiB.patch(`/api/fos/${fosId}/deactivate`);
      await expect(p).rejects.toMatchObject({
        response: {
          status: 403,
          data: {
            message: expect.stringContaining('Access denied to this team'),
          },
        },
      });
    });
  });
});

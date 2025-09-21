import axios, { AxiosInstance } from 'axios';

describe('FOS Tasks Endpoints E2E', () => {
  let gameId: number;
  let roomCode: string;

  let token: string;
  let playerId: number;
  let teamId: number;

  let api: AxiosInstance;
  let fosId: string;

  beforeAll(async () => {
    // Create game
    const gameRes = await axios.post(`/api/game/create`, { victoryConditionMP: 100 });
    expect(gameRes.status).toBe(201);
    gameId = gameRes.data.id;
    roomCode = gameRes.data.roomCode;

    // Join as player
    const joinRes = await axios.post(`/api/player/join`, { roomCode, playerName: 'Tasks Commander' });
    expect(joinRes.status).toBe(201);
    token = joinRes.data.token;
    playerId = joinRes.data.id ?? joinRes.data.player?.id;
    expect(token).toBeDefined();
    expect(playerId).toBeDefined();

    // Pick a MOB team (or first team fallback)
    const gameDetails = await axios.get(`/api/game/${gameId}`);
    const teams: Array<{ id: number; type: string }> = gameDetails.data?.teams ?? [];
    const mobTeam = teams.find(t => String(t.type).startsWith('MOB_')) ?? teams[0];
    teamId = mobTeam.id;

    // Elevate to COMMANDER and join team
    const roleRes = await axios.patch(`/api/player/${playerId}`, { role: 'COMMANDER' });
    expect([200, 201]).toContain(roleRes.status);
    const joinTeamRes = await axios.post(`/api/player/${playerId}/join-team`, { teamId });
    expect([200, 201]).toContain(joinTeamRes.status);

    // Authorized client
    api = axios.create({
      baseURL: axios.defaults.baseURL,
      headers: { Authorization: `Bearer ${token}` },
    });

    // Activate a FOS to obtain its UUID
    const fosDisplayNumber = 8;
    const act = await api.post(`/api/fos/${fosDisplayNumber}/activate`, { teamId, turnActivated: 1 });
    expect([200, 201]).toContain(act.status);
    fosId = act.data.id as string;
    expect(typeof fosId).toBe('string');
  });

  it('GET /fos/:id/tasks returns empty array initially', async () => {
    const res = await api.get(`/api/fos/${fosId}/tasks`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBe(0);
  });

  it('PATCH /fos/:id/tasks completes POWER then GET returns ["POWER"]', async () => {
    const patch = await api.patch(`/api/fos/${fosId}/tasks`, {
      task: 'POWER',
      completed: true,
    });
    expect([200, 201]).toContain(patch.status);
    expect(Array.isArray(patch.data)).toBe(true);
    expect(patch.data).toContain('POWER');

    const res = await api.get(`/api/fos/${fosId}/tasks`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data).toContain('POWER');
  });

  it('PATCH /fos/:id/tasks toggles POWER off and GET returns []', async () => {
    const toggle = await api.patch(`/api/fos/${fosId}/tasks`, {
      task: 'POWER',
      completed: false,
    });
    expect([200, 201]).toContain(toggle.status);
    expect(Array.isArray(toggle.data)).toBe(true);
    expect(toggle.data).not.toContain('POWER');

    const res = await api.get(`/api/fos/${fosId}/tasks`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data).not.toContain('POWER');
  });
});

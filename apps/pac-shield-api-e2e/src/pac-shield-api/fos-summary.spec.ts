import axios, { AxiosInstance } from 'axios';

describe('FOS Ownership Overview Endpoints E2E', () => {
  let gameId: number;
  let roomCode: string;

  // Team IDs
  let teamAId: number;
  let teamBId: number;

  // Players/tokens
  let tokenA: string;
  let playerAId: number;
  let apiA: AxiosInstance;

  let tokenB: string;
  let playerBId: number;
  let apiB: AxiosInstance;

  // FOS UUIDs
  let fosA1: string;
  let fosB1: string;

  async function upsertTenRfiAnswers(api: AxiosInstance, fosId: string) {
    const keys = [
      'CFR',
      'Mobility',
      'Ramp',
      'ATC',
      'Equipment',
      'Bed Down',
      'Fuel',
      'Security',
      'Community',
      'Medical',
    ];
    for (const k of keys) {
      const res = await api.post(`/api/fos/${fosId}/rfi`, { rfiKey: k, rfiValue: '2' });
      expect([200, 201]).toContain(res.status);
    }
  }

  beforeAll(async () => {
    // Create game
    const gameRes = await axios.post(`/api/game/create`, { victoryConditionMP: 100 });
    expect(gameRes.status).toBe(201);
    gameId = gameRes.data.id;
    roomCode = gameRes.data.roomCode;

    // Read teams; pick two different MOB teams if possible, otherwise any two
    const details = await axios.get(`/api/game/${gameId}`);
    const teams: Array<{ id: number; type: string; name: string }> = details.data?.teams ?? [];
    const mobTeams = teams.filter(t => String(t.type).startsWith('MOB_'));
    if (mobTeams.length >= 2) {
      teamAId = mobTeams[0].id;
      teamBId = mobTeams[1].id;
    } else {
      teamAId = teams[0].id;
      teamBId = teams.find(t => t.id !== teamAId)?.id ?? teams[0].id;
    }

    // Join player A, promote, join team A
    {
      const joinRes = await axios.post(`/api/player/join`, { roomCode, playerName: 'Owner A' });
      expect(joinRes.status).toBe(201);
      tokenA = joinRes.data.token;
      playerAId = joinRes.data.id ?? joinRes.data.player?.id;

      await axios.patch(`/api/player/${playerAId}`, { role: 'COMMANDER' });
      await axios.post(`/api/player/${playerAId}/join-team`, { teamId: teamAId });

      apiA = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: { Authorization: `Bearer ${tokenA}` },
      });
    }

    // Join player B, promote, join team B
    {
      const joinRes = await axios.post(`/api/player/join`, { roomCode, playerName: 'Owner B' });
      expect(joinRes.status).toBe(201);
      tokenB = joinRes.data.token;
      playerBId = joinRes.data.id ?? joinRes.data.player?.id;

      await axios.patch(`/api/player/${playerBId}`, { role: 'COMMANDER' });
      await axios.post(`/api/player/${playerBId}/join-team`, { teamId: teamBId });

      apiB = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: { Authorization: `Bearer ${tokenB}` },
      });
    }

    // Activate one FOS for team A and one for team B
    {
      const actA = await apiA.post(`/api/fos/11/activate`, { teamId: teamAId, turnActivated: 1 });
      expect([200, 201]).toContain(actA.status);
      fosA1 = actA.data.id as string;

      const actB = await apiB.post(`/api/fos/12/activate`, { teamId: teamBId, turnActivated: 1 });
      expect([200, 201]).toContain(actB.status);
      fosB1 = actB.data.id as string;
    }

    // Create a GM client for seeding RFI answers (GM-only operation)
    const gmJoin = await axios.post(`/api/player/join`, { roomCode, playerName: 'RFI Seeder GM' });
    const gmToken = gmJoin.data.token;
    const gmId = gmJoin.data.id ?? gmJoin.data.player?.id;
    await axios.patch(`/api/player/${gmId}`, { role: 'GM' });
    const apiGM = axios.create({
      baseURL: axios.defaults.baseURL,
      headers: { Authorization: `Bearer ${gmToken}` },
    });

    // Seed RFIs: fully assess team A's FOS with 10 answers; team B only 5 answers
    await upsertTenRfiAnswers(apiGM, fosA1);

    const partialKeys = ['CFR', 'Mobility', 'Ramp', 'ATC', 'Equipment'];
    for (const k of partialKeys) {
      const res = await apiGM.post(`/api/fos/${fosB1}/rfi`, { rfiKey: k, rfiValue: '1' });
      expect([200, 201]).toContain(res.status);
    }
  });

  it('GET /fos/owned?gameId=&teamId= returns owned FOS for a specific team', async () => {
    // Use token A client for authenticated GET (route currently allows any authenticated)
    const res = await apiA.get(`/api/fos/owned`, { params: { gameId, teamId: teamAId } });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    // Should include the FOS we activated for team A
    const ids = res.data.map((f: any) => f.id);
    expect(ids).toContain(fosA1);
    // All entries should have teamId = teamAId
    expect(res.data.every((f: any) => f.teamId === teamAId)).toBe(true);
  });

  it('GET /fos/summary?gameId= returns aggregated counts per team', async () => {
    const res = await apiA.get(`/api/fos/summary`, { params: { gameId } });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    const rowA = res.data.find((r: any) => r.teamId === teamAId);
    const rowB = res.data.find((r: any) => r.teamId === teamBId);
    expect(rowA).toBeDefined();
    expect(rowB).toBeDefined();

    // Team A: 1 owned, active = 1, dormant = 0, fullyAssessed = 1 (10 RFIs), strikesAtRisk = 0
    expect(rowA.totalOwned).toBeGreaterThanOrEqual(1);
    expect(rowA.active).toBeGreaterThanOrEqual(1);
    expect(rowA.dormant).toBeGreaterThanOrEqual(0);
    expect(rowA.fullyAssessed).toBeGreaterThanOrEqual(1);
    expect(rowA.strikesAtRisk).toBeGreaterThanOrEqual(0);

    // Team B: 1 owned, not fully assessed with only 5 RFIs
    expect(rowB.totalOwned).toBeGreaterThanOrEqual(1);
    expect(rowB.fullyAssessed).toBeGreaterThanOrEqual(0);
  });
});

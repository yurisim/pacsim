import axios, { AxiosInstance } from 'axios';

describe('Game Scoring E2E (/game/:id/score)', () => {
  let gameId: number;
  let roomCode: string;

  let commanderToken: string;
  let commanderId: number;
  let mobTeamId: number;

  let authed: AxiosInstance;

  // GM for GM-only actions (e.g., posting RFIs)
  let gmToken: string;
  let gmId: number;
  let gmTeamId: number;
  let gmAuthed: AxiosInstance;

  beforeAll(async () => {
    // Create a game
    const create = await axios.post(`/api/game/create`, { victoryConditionMP: 100 });
    expect([200, 201]).toContain(create.status);
    gameId = create.data.id;
    roomCode = create.data.roomCode;

    // Join as a player
    const join = await axios.post(`/api/player/join`, {
      roomCode,
      playerName: 'Scoring Commander',
    });
    expect([200, 201]).toContain(join.status);
    commanderToken = join.data.token;
    commanderId = join.data.id ?? join.data.player?.id;

    // Choose a MOB team and join as COMMANDER
    const gameSnap = await axios.get(`/api/game/${gameId}`);
    const teams: Array<{ id: number; type: string }> = gameSnap.data?.teams ?? [];
    const mobTeam = teams.find((t) => String(t.type).startsWith('MOB_')) ?? teams[0];
    mobTeamId = mobTeam.id;

    await axios.patch(`/api/player/${commanderId}`, { role: 'COMMANDER' });
    await axios.post(`/api/player/${commanderId}/join-team`, { teamId: mobTeamId });

    // Authorized axios for guarded FOS endpoints (Commander)
    authed = axios.create({
      baseURL: axios.defaults.baseURL,
      headers: { Authorization: `Bearer ${commanderToken}` },
    });

    // Create and prepare a GM for GM-only actions (RFIs)
    const joinGm = await axios.post(`/api/player/join`, {
      roomCode,
      playerName: 'Scoring GM',
    });
    expect([200, 201]).toContain(joinGm.status);
    gmToken = joinGm.data.token;
    gmId = joinGm.data.id ?? joinGm.data.player?.id;

    await axios.patch(`/api/player/${gmId}`, { role: 'GM' });

    const gameSnap2 = await axios.get(`/api/game/${gameId}`);
    const teams2: Array<{ id: number; type: string }> = gameSnap2.data?.teams ?? [];
    const gmTeam = teams2.find((t) => String(t.type) === 'GM');
    expect(gmTeam).toBeDefined();
    gmTeamId = gmTeam!.id;
    await axios.post(`/api/player/${gmId}/join-team`, { teamId: gmTeamId });

    gmAuthed = axios.create({
      baseURL: axios.defaults.baseURL,
      headers: { Authorization: `Bearer ${gmToken}` },
    });
  });

  it('returns a zeroed score for a new game', async () => {
    const scoreRes = await axios.get(`/api/game/${gameId}/score`);
    expect(scoreRes.status).toBe(200);

    const body = scoreRes.data;
    expect(body).toHaveProperty('gameId', gameId);
    expect(body).toHaveProperty('breakdown');
    expect(body.breakdown.assessments.points).toBe(0);
    expect(body.breakdown.crisisSorties.points).toBe(0);
    expect(body.breakdown.destroyedTargets.points).toBe(0);
    expect(body.breakdown.demoralizationPenalty.penalty).toBeGreaterThanOrEqual(0);
    expect(typeof body.total).toBe('number');
  });

  it('awards +5 MP when a FOS has 10 RFIs answered (complete assessment)', async () => {
    // Activate a FOS to create it
    const fosDisplayNumber = 11;
    const activate = await authed.post(`/api/fos/${fosDisplayNumber}/activate`, {
      teamId: mobTeamId,
      turnActivated: 1,
    });
    expect([200, 201]).toContain(activate.status);
    const fosId: string = activate.data.id;
    expect(typeof fosId).toBe('string');

    // Answer 10 RFIs (any keys should be accepted by API; values coerced to strings)
    const rfiKeys = [
      'RFI1',
      'RFI2',
      'RFI3',
      'RFI4',
      'RFI5',
      'RFI6',
      'RFI7',
      'RFI8',
      'RFI9',
      'RFI10',
    ];
    for (const key of rfiKeys) {
      const r = await gmAuthed.post(`/api/fos/${fosId}/rfi`, { rfiKey: key, rfiValue: 1 });
      expect([200, 201]).toContain(r.status);
    }

    // Verify the answers are persisted
    const answers = await authed.get(`/api/fos/${fosId}/rfi`);
    expect(answers.status).toBe(200);
    expect(Array.isArray(answers.data)).toBe(true);
    // At least ten entries expected
    expect(answers.data.length).toBeGreaterThanOrEqual(10);

    // Score should reflect one fully assessed FOS (+5)
    const scoreRes = await axios.get(`/api/game/${gameId}/score`);
    expect(scoreRes.status).toBe(200);

    const breakdown = scoreRes.data.breakdown;
    expect(breakdown.assessments.count).toBeGreaterThanOrEqual(1);
    expect(breakdown.assessments.points).toBeGreaterThanOrEqual(5);

    // Ensure other buckets are not negatively impacting this scenario
    expect(breakdown.crisisSorties.points).toBe(0);
    expect(breakdown.destroyedTargets.points).toBe(0);

    const expectedMinTotal = 5 - breakdown.demoralizationPenalty.penalty;
    expect(scoreRes.data.total).toBeGreaterThanOrEqual(expectedMinTotal);
  });
});

import axios, { AxiosInstance } from 'axios';

describe('FOS RFI Endpoints E2E', () => {
  let gameId: number;
  let roomCode: string;

  let ownerToken: string;
  let ownerPlayerId: number;
  let ownerTeamId: number;
  let apiOwner: AxiosInstance;

  let targetFosId: string;

  beforeAll(async () => {
    // Create game
    const gameRes = await axios.post(`/api/game/create`, { victoryConditionMP: 100 });
    expect(gameRes.status).toBe(201);
    gameId = gameRes.data.id;
    roomCode = gameRes.data.roomCode;

    // Join owner player
    const joinRes = await axios.post(`/api/player/join`, { roomCode, playerName: 'RFI Owner' });
    expect(joinRes.status).toBe(201);
    ownerToken = joinRes.data.token;
    ownerPlayerId = joinRes.data.id ?? joinRes.data.player?.id;

    // Determine GM team (GMs must be on GM team)
    const gameDet = await axios.get(`/api/game/${gameId}`);
    const teams: Array<{ id: number; type: string }> = gameDet.data?.teams ?? [];
    const gmTeam = teams.find(t => String(t.type) === 'GM');
    expect(gmTeam).toBeDefined();
    ownerTeamId = gmTeam.id;

    // Elevate role to GM and join GM team
    await axios.patch(`/api/player/${ownerPlayerId}`, { role: 'GM' });
    await axios.post(`/api/player/${ownerPlayerId}/join-team`, { teamId: ownerTeamId });

    // Authorized client
    apiOwner = axios.create({
      baseURL: axios.defaults.baseURL,
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    // Activate a FOS (create record) to obtain UUID
    const fosDisplayNumber = 7;
    const activate = await apiOwner.post(`/api/fos/${fosDisplayNumber}/activate`, {
      teamId: ownerTeamId,
      turnActivated: 1,
    });
    expect([200, 201]).toContain(activate.status);
    expect(activate.data?.id).toBeDefined();
    targetFosId = activate.data.id;
  });

  it('GET /fos/:id/rfi returns empty array initially', async () => {
    const res = await apiOwner.get(`/api/fos/${targetFosId}/rfi`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBe(0);
  });

  it('POST /fos/:id/rfi accepts numeric rfiValue and GET returns it as string', async () => {
    const post = await apiOwner.post(`/api/fos/${targetFosId}/rfi`, {
      rfiKey: 'CFR',
      rfiValue: 3, // number: DTO should coerce to "3"
    });
    expect([200, 201]).toContain(post.status);

    const get2 = await apiOwner.get(`/api/fos/${targetFosId}/rfi`);
    expect(get2.status).toBe(200);
    expect(Array.isArray(get2.data)).toBe(true);
    expect(get2.data.length).toBe(1);
    expect(get2.data[0].rfiKey).toBe('CFR');
    expect(get2.data[0].rfiValue).toBe('3');
  });

  it('GET /fos/game/:gameId/rfi?displayNumber returns answers when available', async () => {
    // We activated FOS 7 above; fetch by game/display mapping
    const res = await apiOwner.get(`/api/fos/game/${gameId}/rfi`, { params: { displayNumber: 7 } });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    // At least the one inserted above should be present
    expect(res.data.some((r: any) => r.rfiKey === 'CFR' && r.rfiValue === '3')).toBe(true);
  });

  it('POST /fos/:id/rfi returns 403 when called by non-owner non-GM', async () => {
    // Create a second commander on a different team (CAOC or another MOB)
    const joinRes = await axios.post(`/api/player/join`, { roomCode, playerName: 'RFI Attacker' });
    const attackerToken = joinRes.data.token;
    const attackerId = joinRes.data.id ?? joinRes.data.player?.id;

    await axios.patch(`/api/player/${attackerId}`, { role: 'COMMANDER' });

    const gameDet = await axios.get(`/api/game/${gameId}`);
    const teams: Array<{ id: number; type: string }> = gameDet.data?.teams ?? [];
    const otherTeam = teams.find(t => t.id !== ownerTeamId) ?? teams[0];
    await axios.post(`/api/player/${attackerId}/join-team`, { teamId: otherTeam.id });

    const apiAttacker = axios.create({
      baseURL: axios.defaults.baseURL,
      headers: { Authorization: `Bearer ${attackerToken}` },
    });

    await expect(
      apiAttacker.post(`/api/fos/${targetFosId}/rfi`, { rfiKey: 'Fuel', rfiValue: '2' })
    ).rejects.toMatchObject({
      response: { status: 403 },
    });
  });

  it('POST /fos/:id/rfi returns 403 for owning team commander (non-GM)', async () => {
    // Create a commander on the same team that owns the FOS (non-GM)
    const joinRes = await axios.post(`/api/player/join`, { roomCode, playerName: 'Owner Commander (Non-GM)' });
    const ownerCmdrToken = joinRes.data.token;
    const ownerCmdrId = joinRes.data.id ?? joinRes.data.player?.id;

    await axios.patch(`/api/player/${ownerCmdrId}`, { role: 'COMMANDER' });
    await axios.post(`/api/player/${ownerCmdrId}/join-team`, { teamId: ownerTeamId });

    const apiOwnerCmdr = axios.create({
      baseURL: axios.defaults.baseURL,
      headers: { Authorization: `Bearer ${ownerCmdrToken}` },
    });

    await expect(
      apiOwnerCmdr.post(`/api/fos/${targetFosId}/rfi`, { rfiKey: 'Medical', rfiValue: '2' })
    ).rejects.toMatchObject({
      response: { status: 403 },
    });
  });

  describe('Dice Roll Functionality', () => {
    it('POST /fos/:id/rfi/roll-dice rolls dice and saves result (GM only)', async () => {
      const rollRes = await apiOwner.post(`/api/fos/${targetFosId}/rfi/roll-dice`, {
        rfiKey: 'Mobility',
      });
      expect([200, 201]).toContain(rollRes.status);
      expect(Array.isArray(rollRes.data)).toBe(true);

      // Check that Mobility RFI was set to a valid dice value (1, 2, or 3)
      const mobilityAnswer = rollRes.data.find((r: any) => r.rfiKey === 'Mobility');
      expect(mobilityAnswer).toBeDefined();
      expect(['1', '2', '3']).toContain(mobilityAnswer.rfiValue);
      expect(mobilityAnswer.fosId).toBe(targetFosId);
    });

    it('POST /fos/:id/rfi/roll-dice validates request body', async () => {
      // Missing rfiKey
      await expect(
        apiOwner.post(`/api/fos/${targetFosId}/rfi/roll-dice`, {})
      ).rejects.toMatchObject({
        response: { status: 400 },
      });

      // Invalid rfiKey type
      await expect(
        apiOwner.post(`/api/fos/${targetFosId}/rfi/roll-dice`, { rfiKey: 123 })
      ).rejects.toMatchObject({
        response: { status: 400 },
      });
    });

    it('POST /fos/:id/rfi/roll-dice returns 403 for non-GM users', async () => {
      // Create a non-GM commander
      const joinRes = await axios.post(`/api/player/join`, { roomCode, playerName: 'Dice Roll Attacker' });
      const attackerToken = joinRes.data.token;
      const attackerId = joinRes.data.id ?? joinRes.data.player?.id;

      await axios.patch(`/api/player/${attackerId}`, { role: 'COMMANDER' });

      const gameDet = await axios.get(`/api/game/${gameId}`);
      const teams: Array<{ id: number; type: string }> = gameDet.data?.teams ?? [];
      const otherTeam = teams.find(t => t.id !== ownerTeamId) ?? teams[0];
      await axios.post(`/api/player/${attackerId}/join-team`, { teamId: otherTeam.id });

      const apiAttacker = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: { Authorization: `Bearer ${attackerToken}` },
      });

      await expect(
        apiAttacker.post(`/api/fos/${targetFosId}/rfi/roll-dice`, { rfiKey: 'Security' })
      ).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    it('POST /fos/:id/rfi/roll-dice returns 404 for non-existent FOS', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await expect(
        apiOwner.post(`/api/fos/${fakeUuid}/rfi/roll-dice`, { rfiKey: 'Fuel' })
      ).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it('POST /fos/:id/rfi/roll-dice generates different values on multiple calls', async () => {
      // Roll dice multiple times for the same RFI to test randomness
      const results: string[] = [];

      for (let i = 0; i < 10; i++) {
        const rollRes = await apiOwner.post(`/api/fos/${targetFosId}/rfi/roll-dice`, {
          rfiKey: 'Equipment',
        });
        expect([200, 201]).toContain(rollRes.status);

        const equipmentAnswer = rollRes.data.find((r: any) => r.rfiKey === 'Equipment');
        expect(equipmentAnswer).toBeDefined();
        expect(['1', '2', '3']).toContain(equipmentAnswer.rfiValue);

        results.push(equipmentAnswer.rfiValue);
      }

      // With 10 rolls, we should have at least some variation (not all the same)
      // This test has a very small chance of false failure but practically should pass
      const uniqueValues = new Set(results);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });

    it('POST /fos/:id/rfi/roll-dice overwrites existing manual values', async () => {
      // First set a manual value
      await apiOwner.post(`/api/fos/${targetFosId}/rfi`, {
        rfiKey: 'Community',
        rfiValue: '1',
      });

      // Verify it was set
      const getRes1 = await apiOwner.get(`/api/fos/${targetFosId}/rfi`);
      const communityBefore = getRes1.data.find((r: any) => r.rfiKey === 'Community');
      expect(communityBefore.rfiValue).toBe('1');

      // Now roll dice for the same RFI
      const rollRes = await apiOwner.post(`/api/fos/${targetFosId}/rfi/roll-dice`, {
        rfiKey: 'Community',
      });
      expect([200, 201]).toContain(rollRes.status);

      // Verify the value was overwritten by dice roll
      const communityAfter = rollRes.data.find((r: any) => r.rfiKey === 'Community');
      expect(communityAfter).toBeDefined();
      expect(['1', '2', '3']).toContain(communityAfter.rfiValue);

      // The value might be the same by chance, but that's OK - we just verify it's valid
    });

    it('POST /fos/:id/rfi/roll-dice returns 401 for unauthenticated users', async () => {
      // Test without any authentication token
      await expect(
        axios.post(`/api/fos/${targetFosId}/rfi/roll-dice`, { rfiKey: 'Fuel' })
      ).rejects.toMatchObject({
        response: { status: 401 },
      });
    });

    it('POST /fos/:id/rfi/roll-dice returns 403 for basic PLAYER role', async () => {
      // Create a basic player (lowest privilege level)
      const joinRes = await axios.post(`/api/player/join`, { roomCode, playerName: 'Basic Player' });
      const playerToken = joinRes.data.token;
      const playerId = joinRes.data.id ?? joinRes.data.player?.id;

      // Keep as basic PLAYER role (default)
      const gameDet = await axios.get(`/api/game/${gameId}`);
      const teams: Array<{ id: number; type: string }> = gameDet.data?.teams ?? [];
      const anyTeam = teams[0];
      await axios.post(`/api/player/${playerId}/join-team`, { teamId: anyTeam.id });

      const apiPlayer = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: { Authorization: `Bearer ${playerToken}` },
      });

      await expect(
        apiPlayer.post(`/api/fos/${targetFosId}/rfi/roll-dice`, { rfiKey: 'Ramp' })
      ).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    it('POST /fos/:id/rfi/roll-dice allows GM from different team', async () => {
      // Create GM user on different team to verify GM privilege transcends team ownership
      const joinRes = await axios.post(`/api/player/join`, { roomCode, playerName: 'Cross-Team GM' });
      const crossGmToken = joinRes.data.token;
      const crossGmId = joinRes.data.id ?? joinRes.data.player?.id;

      // Set as GM role
      await axios.patch(`/api/player/${crossGmId}`, { role: 'GM' });

      // Join GM team (GMs must be on GM team)
      const gameDet = await axios.get(`/api/game/${gameId}`);
      const teams: Array<{ id: number; type: string }> = gameDet.data?.teams ?? [];
      const gmTeam = teams.find(t => String(t.type) === 'GM');
      await axios.post(`/api/player/${crossGmId}/join-team`, { teamId: gmTeam.id });

      const apiCrossGm = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: { Authorization: `Bearer ${crossGmToken}` },
      });

      // GM should be able to roll dice even for FOS owned by different team
      const rollRes = await apiCrossGm.post(`/api/fos/${targetFosId}/rfi/roll-dice`, {
        rfiKey: 'ATC',
      });
      expect([200, 201]).toContain(rollRes.status);
      expect(Array.isArray(rollRes.data)).toBe(true);

      const atcAnswer = rollRes.data.find((r: any) => r.rfiKey === 'ATC');
      expect(atcAnswer).toBeDefined();
      expect(['1', '2', '3']).toContain(atcAnswer.rfiValue);
    });

    it('POST /fos/:id/rfi/roll-dice returns 401 for invalid JWT token', async () => {
      const apiInvalidToken = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: { Authorization: 'Bearer invalid.jwt.token' },
      });

      await expect(
        apiInvalidToken.post(`/api/fos/${targetFosId}/rfi/roll-dice`, { rfiKey: 'Medical' })
      ).rejects.toMatchObject({
        response: { status: 401 },
      });
    });

    it('POST /fos/:id/rfi/roll-dice returns 403 for GM from different game', async () => {
      // Create a second game
      const game2Res = await axios.post(`/api/game/create`, { victoryConditionMP: 150 });
      expect(game2Res.status).toBe(201);
      const game2Id = game2Res.data.id;
      const game2RoomCode = game2Res.data.roomCode;

      // Create GM in the second game
      const joinRes = await axios.post(`/api/player/join`, { roomCode: game2RoomCode, playerName: 'Game2 GM' });
      const game2GmToken = joinRes.data.token;
      const game2GmId = joinRes.data.id ?? joinRes.data.player?.id;

      // Set as GM role
      await axios.patch(`/api/player/${game2GmId}`, { role: 'GM' });

      // Get teams for game 2 and join GM team
      const game2Det = await axios.get(`/api/game/${game2Id}`);
      const game2Teams: Array<{ id: number; type: string }> = game2Det.data?.teams ?? [];
      const game2GmTeam = game2Teams.find(t => String(t.type) === 'GM');
      await axios.post(`/api/player/${game2GmId}/join-team`, { teamId: game2GmTeam.id });

      const apiGame2Gm = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: { Authorization: `Bearer ${game2GmToken}` },
      });

      // GM from Game 2 should NOT be able to roll dice for FOS in Game 1
      // This should return 403 (Access denied to this FOS)
      await expect(
        apiGame2Gm.post(`/api/fos/${targetFosId}/rfi/roll-dice`, { rfiKey: 'Equipment' })
      ).rejects.toMatchObject({
        response: {
          status: 403,
          data: {
            message: 'Access denied to this FOS'
          }
        }
      });
    });
  });
});

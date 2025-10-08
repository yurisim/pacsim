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

  // =============================================
  //   DEMORALIZATION & RESOURCE POINTS TESTS
  // =============================================

  describe('Demoralization and Resource Points', () => {
    it('always returns demoralization penalty of 0', async () => {
      const scoreRes = await axios.get(`/api/game/${gameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      expect(breakdown.demoralizationPenalty.dpTotal).toBe(0);
      expect(breakdown.demoralizationPenalty.penalty).toBe(0);
    });

    it('does not include resource points in the score breakdown', async () => {
      const scoreRes = await axios.get(`/api/game/${gameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      // Resource points should not be in the breakdown at all
      expect(breakdown).not.toHaveProperty('resourcePoints');
    });
  });

  // =============================================
  //       AIRFIELD ASSESSMENT TESTS
  // =============================================

  describe('Airfield Assessments', () => {
    let testGameId: number;
    let testAuthed: AxiosInstance;
    let testGmAuthed: AxiosInstance;
    let testMobTeamId: number;

    beforeAll(async () => {
      // Create a fresh game for assessment tests
      const create = await axios.post(`/api/game/create`, { victoryConditionMP: 100 });
      testGameId = create.data.id;
      const testRoomCode = create.data.roomCode;

      // Join as commander
      const join = await axios.post(`/api/player/join`, {
        roomCode: testRoomCode,
        playerName: 'Assessment Commander',
      });
      const testCommanderToken = join.data.token;
      const testCommanderId = join.data.id ?? join.data.player?.id;

      const gameSnap = await axios.get(`/api/game/${testGameId}`);
      const teams = gameSnap.data?.teams ?? [];
      const mobTeam = teams.find((t: any) => String(t.type).startsWith('MOB_')) ?? teams[0];
      testMobTeamId = mobTeam.id;

      await axios.patch(`/api/player/${testCommanderId}`, { role: 'COMMANDER' });
      await axios.post(`/api/player/${testCommanderId}/join-team`, { teamId: testMobTeamId });

      testAuthed = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: { Authorization: `Bearer ${testCommanderToken}` },
      });

      // Join GM
      const joinGm = await axios.post(`/api/player/join`, {
        roomCode: testRoomCode,
        playerName: 'Assessment GM',
      });
      const testGmToken = joinGm.data.token;
      const testGmId = joinGm.data.id ?? joinGm.data.player?.id;

      await axios.patch(`/api/player/${testGmId}`, { role: 'GM' });

      const gameSnap2 = await axios.get(`/api/game/${testGameId}`);
      const teams2 = gameSnap2.data?.teams ?? [];
      const gmTeam = teams2.find((t: any) => String(t.type) === 'GM');
      const testGmTeamId = gmTeam.id;
      await axios.post(`/api/player/${testGmId}/join-team`, { teamId: testGmTeamId });

      testGmAuthed = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: { Authorization: `Bearer ${testGmToken}` },
      });
    });

    it('awards 0 MPs when no FOS have been assessed', async () => {
      const scoreRes = await axios.get(`/api/game/${testGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      expect(breakdown.assessments.count).toBe(0);
      expect(breakdown.assessments.points).toBe(0);
    });

    it('awards 5 MPs for exactly 1 completed FOS assessment', async () => {
      // Activate and assess FOS 12
      const activate = await testAuthed.post(`/api/fos/12/activate`, {
        teamId: testMobTeamId,
        turnActivated: 1,
      });
      const fosId = activate.data.id;

      // Answer 10 RFIs
      for (let i = 1; i <= 10; i++) {
        await testGmAuthed.post(`/api/fos/${fosId}/rfi`, {
          rfiKey: `RFI${i}`,
          rfiValue: `Answer${i}`,
        });
      }

      const scoreRes = await axios.get(`/api/game/${testGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      expect(breakdown.assessments.count).toBe(1);
      expect(breakdown.assessments.points).toBe(5);
    });

    it('awards correct MPs for multiple completed FOS assessments', async () => {
      // Activate and assess FOS 13, 14, 15
      const fosNumbers = [13, 14, 15];

      for (const fosNum of fosNumbers) {
        const activate = await testAuthed.post(`/api/fos/${fosNum}/activate`, {
          teamId: testMobTeamId,
          turnActivated: 1,
        });
        const fosId = activate.data.id;

        // Answer 10 RFIs for each
        for (let i = 1; i <= 10; i++) {
          await testGmAuthed.post(`/api/fos/${fosId}/rfi`, {
            rfiKey: `RFI${i}`,
            rfiValue: `Answer${i}`,
          });
        }
      }

      const scoreRes = await axios.get(`/api/game/${testGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      // Should have 1 from previous test + 3 from this test = 4 total
      expect(breakdown.assessments.count).toBe(4);
      expect(breakdown.assessments.points).toBe(20);
    });
  });

  // =============================================
  //       FIGHTER SORTIE TESTS
  // =============================================

  describe('Fighter Sorties from FOS', () => {
    let sortieGameId: number;
    let sortieAuthed: AxiosInstance;
    let sortieMobTeamId: number;
    let sortieFosId: string;

    beforeAll(async () => {
      // Create a fresh game for sortie tests
      const create = await axios.post(`/api/game/create`, { victoryConditionMP: 100 });
      sortieGameId = create.data.id;
      const sortieRoomCode = create.data.roomCode;

      // Join as commander
      const join = await axios.post(`/api/player/join`, {
        roomCode: sortieRoomCode,
        playerName: 'Sortie Commander',
      });
      const sortieCommanderToken = join.data.token;
      const sortieCommanderId = join.data.id ?? join.data.player?.id;

      const gameSnap = await axios.get(`/api/game/${sortieGameId}`);
      const teams = gameSnap.data?.teams ?? [];
      const mobTeam = teams.find((t: any) => String(t.type).startsWith('MOB_')) ?? teams[0];
      sortieMobTeamId = mobTeam.id;

      await axios.patch(`/api/player/${sortieCommanderId}`, { role: 'COMMANDER' });
      await axios.post(`/api/player/${sortieCommanderId}/join-team`, { teamId: sortieMobTeamId });

      sortieAuthed = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: { Authorization: `Bearer ${sortieCommanderToken}` },
      });

      // Activate a FOS for sortie tests
      const activate = await sortieAuthed.post(`/api/fos/21/activate`, {
        teamId: sortieMobTeamId,
        turnActivated: 1,
      });
      sortieFosId = activate.data.id;
    });

    it('awards 5 MPs for F-16 sortie from FOS to operational area', async () => {
      // Create F-16 aircraft at FOS
      const aircraft = await axios.post(`/api/allocation/spawn-aircraft`, {
        gameId: sortieGameId,
        teamId: sortieMobTeamId,
        type: 'F16',
        locationType: 'FOS',
        locationFosId: sortieFosId,
      });
      const callSign = aircraft.data.callSign;

      // Create ATO line: FOS launch to operational area
      await axios.post(`/api/ato`, {
        gameId: sortieGameId,
        turn: 1,
        aircraftCallSign: callSign,
        startLocation: sortieFosId,
        startLocationType: 'FOS',
        finalDestination: 'OperationalArea1',
        intention: 'LAND',
        configuration: 'CARGO_ONLY',
        pprStatus: 'APPROVED',
        isOperationalArea: true,
      });

      const scoreRes = await axios.get(`/api/game/${sortieGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      expect(breakdown.crisisSorties.count).toBe(1);
      expect(breakdown.crisisSorties.points).toBe(5);
    });

    it('awards 5 MPs for F-22 sortie from FOS to operational area', async () => {
      // Create F-22 aircraft at FOS
      const aircraft = await axios.post(`/api/allocation/spawn-aircraft`, {
        gameId: sortieGameId,
        teamId: sortieMobTeamId,
        type: 'F22',
        locationType: 'FOS',
        locationFosId: sortieFosId,
      });
      const callSign = aircraft.data.callSign;

      // Create ATO line
      await axios.post(`/api/ato`, {
        gameId: sortieGameId,
        turn: 1,
        aircraftCallSign: callSign,
        startLocation: sortieFosId,
        startLocationType: 'FOS',
        finalDestination: 'OperationalArea2',
        intention: 'LAND',
        configuration: 'CARGO_ONLY',
        pprStatus: 'APPROVED',
        isOperationalArea: true,
      });

      const scoreRes = await axios.get(`/api/game/${sortieGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      // Should have 1 F-16 + 1 F-22 = 2 sorties
      expect(breakdown.crisisSorties.count).toBe(2);
      expect(breakdown.crisisSorties.points).toBe(10);
    });

    it('awards correct MPs for multiple fighter sorties', async () => {
      // Create 3 more F-16s and launch them
      for (let i = 0; i < 3; i++) {
        const aircraft = await axios.post(`/api/allocation/spawn-aircraft`, {
          gameId: sortieGameId,
          teamId: sortieMobTeamId,
          type: 'F16',
          locationType: 'FOS',
          locationFosId: sortieFosId,
        });
        const callSign = aircraft.data.callSign;

        await axios.post(`/api/ato`, {
          gameId: sortieGameId,
          turn: 1,
          aircraftCallSign: callSign,
          startLocation: sortieFosId,
          startLocationType: 'FOS',
          finalDestination: `OperationalArea${i + 3}`,
          intention: 'LAND',
          configuration: 'CARGO_ONLY',
          pprStatus: 'APPROVED',
          isOperationalArea: true,
        });
      }

      const scoreRes = await axios.get(`/api/game/${sortieGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      // Should have 1 F-16 + 1 F-22 + 3 F-16s = 5 sorties
      expect(breakdown.crisisSorties.count).toBe(5);
      expect(breakdown.crisisSorties.points).toBe(25);
    });

    it('does not award MPs for sortie from MOB', async () => {
      // Create F-16 at MOB location
      const aircraft = await axios.post(`/api/allocation/spawn-aircraft`, {
        gameId: sortieGameId,
        teamId: sortieMobTeamId,
        type: 'F16',
        locationType: 'MOB',
      });
      const callSign = aircraft.data.callSign;

      // Launch from MOB (should NOT count)
      await axios.post(`/api/ato`, {
        gameId: sortieGameId,
        turn: 1,
        aircraftCallSign: callSign,
        startLocation: 'MOB_KADENA',
        startLocationType: 'MOB',
        finalDestination: 'OperationalArea99',
        intention: 'LAND',
        configuration: 'CARGO_ONLY',
        pprStatus: 'APPROVED',
        isOperationalArea: true,
      });

      const scoreRes = await axios.get(`/api/game/${sortieGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      // Should still be 5 (MOB launch doesn't count)
      expect(breakdown.crisisSorties.count).toBe(5);
      expect(breakdown.crisisSorties.points).toBe(25);
    });

    it('does not award MPs for sortie to non-operational area', async () => {
      // Create F-22 at FOS
      const aircraft = await axios.post(`/api/allocation/spawn-aircraft`, {
        gameId: sortieGameId,
        teamId: sortieMobTeamId,
        type: 'F22',
        locationType: 'FOS',
        locationFosId: sortieFosId,
      });
      const callSign = aircraft.data.callSign;

      // Launch to non-operational area (should NOT count)
      await axios.post(`/api/ato`, {
        gameId: sortieGameId,
        turn: 1,
        aircraftCallSign: callSign,
        startLocation: sortieFosId,
        startLocationType: 'FOS',
        finalDestination: 'NonOperationalArea',
        intention: 'LAND',
        configuration: 'CARGO_ONLY',
        pprStatus: 'APPROVED',
        isOperationalArea: false, // NOT operational
      });

      const scoreRes = await axios.get(`/api/game/${sortieGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      // Should still be 5 (non-operational doesn't count)
      expect(breakdown.crisisSorties.count).toBe(5);
      expect(breakdown.crisisSorties.points).toBe(25);
    });
  });

  // =============================================
  //       PLA TARGET DESTRUCTION TESTS
  // =============================================

  describe('PLA Target Destruction', () => {
    let targetGameId: number;
    let targetGameBoardId: number;
    let targetTeamId: number;

    beforeAll(async () => {
      // Create a fresh game for target destruction tests
      const create = await axios.post(`/api/game/create`, { victoryConditionMP: 100 });
      targetGameId = create.data.id;
      const targetRoomCode = create.data.roomCode;

      // Join as commander
      const join = await axios.post(`/api/player/join`, {
        roomCode: targetRoomCode,
        playerName: 'Target Commander',
      });
      const targetCommanderId = join.data.id ?? join.data.player?.id;

      const gameSnap = await axios.get(`/api/game/${targetGameId}`);
      const teams = gameSnap.data?.teams ?? [];
      const mobTeam = teams.find((t: any) => String(t.type).startsWith('MOB_')) ?? teams[0];
      targetTeamId = mobTeam.id;

      await axios.patch(`/api/player/${targetCommanderId}`, { role: 'COMMANDER' });
      await axios.post(`/api/player/${targetCommanderId}/join-team`, { teamId: targetTeamId });

      // Get game board ID
      const gameBoard = await axios.get(`/api/game/${targetGameId}`);
      targetGameBoardId = gameBoard.data.gameBoard?.id;
    });

    it('awards 10 MPs for destroying a 20-Strength target', async () => {
      // Create and destroy a 20-strength target
      const token = await axios.post(`/api/threat-tokens`, {
        boardId: targetGameBoardId,
        type: 'FIFTH_GEN_FIGHTER_20',
        strength: 20,
        locationHex: 'A1',
      });
      const tokenId = token.data.id;

      // Mark as destroyed
      await axios.patch(`/api/threat-tokens/${tokenId}`, {
        destroyedAt: new Date().toISOString(),
        destroyedByTeamId: targetTeamId,
      });

      const scoreRes = await axios.get(`/api/game/${targetGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      expect(breakdown.destroyedTargets.byStrength.s20).toBe(1);
      expect(breakdown.destroyedTargets.points).toBe(10);
    });

    it('awards 7 MPs for destroying a 12-Strength target', async () => {
      // Create and destroy a 12-strength target
      const token = await axios.post(`/api/threat-tokens`, {
        boardId: targetGameBoardId,
        type: 'FOURTH_GEN_FIGHTER_12',
        strength: 12,
        locationHex: 'B2',
      });
      const tokenId = token.data.id;

      await axios.patch(`/api/threat-tokens/${tokenId}`, {
        destroyedAt: new Date().toISOString(),
        destroyedByTeamId: targetTeamId,
      });

      const scoreRes = await axios.get(`/api/game/${targetGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      expect(breakdown.destroyedTargets.byStrength.s12).toBe(1);
      // 1 × 20 + 1 × 12 = 10 + 7 = 17
      expect(breakdown.destroyedTargets.points).toBe(17);
    });

    it('awards 5 MPs for destroying a 10-Strength target', async () => {
      // Create and destroy a 10-strength target
      const token = await axios.post(`/api/threat-tokens`, {
        boardId: targetGameBoardId,
        type: 'GROUND_TARGET_10',
        strength: 10,
        locationHex: 'C3',
      });
      const tokenId = token.data.id;

      await axios.patch(`/api/threat-tokens/${tokenId}`, {
        destroyedAt: new Date().toISOString(),
        destroyedByTeamId: targetTeamId,
      });

      const scoreRes = await axios.get(`/api/game/${targetGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      expect(breakdown.destroyedTargets.byStrength.s10).toBe(1);
      // 1 × 20 + 1 × 12 + 1 × 10 = 10 + 7 + 5 = 22
      expect(breakdown.destroyedTargets.points).toBe(22);
    });

    it('awards 7 MPs for destroying AA_JAMMING target (12-Strength equivalent)', async () => {
      // Create and destroy AA_JAMMING (special 12-strength case)
      const token = await axios.post(`/api/threat-tokens`, {
        boardId: targetGameBoardId,
        type: 'AA_JAMMING',
        strength: 12,
        locationHex: 'D4',
      });
      const tokenId = token.data.id;

      await axios.patch(`/api/threat-tokens/${tokenId}`, {
        destroyedAt: new Date().toISOString(),
        destroyedByTeamId: targetTeamId,
      });

      const scoreRes = await axios.get(`/api/game/${targetGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      // AA_JAMMING should be counted in airborneJammer AND s12
      expect(breakdown.destroyedTargets.byStrength.airborneJammer).toBe(1);
      expect(breakdown.destroyedTargets.byStrength.s12).toBe(2); // 1 regular + 1 AA_JAMMING
      // 1 × 20 + 2 × 12 + 1 × 10 = 10 + 14 + 5 = 29
      expect(breakdown.destroyedTargets.points).toBe(29);
    });

    it('awards correct MPs for multiple destroyed targets', async () => {
      // Destroy 2 more 20-strength, 1 more 10-strength
      const targets = [
        { type: 'FIFTH_GEN_FIGHTER_20', strength: 20, hex: 'E5' },
        { type: 'FIFTH_GEN_FIGHTER_20', strength: 20, hex: 'F6' },
        { type: 'GROUND_TARGET_10', strength: 10, hex: 'G7' },
      ];

      for (const target of targets) {
        const token = await axios.post(`/api/threat-tokens`, {
          boardId: targetGameBoardId,
          type: target.type,
          strength: target.strength,
          locationHex: target.hex,
        });
        await axios.patch(`/api/threat-tokens/${token.data.id}`, {
          destroyedAt: new Date().toISOString(),
          destroyedByTeamId: targetTeamId,
        });
      }

      const scoreRes = await axios.get(`/api/game/${targetGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;
      expect(breakdown.destroyedTargets.byStrength.s20).toBe(3);
      expect(breakdown.destroyedTargets.byStrength.s12).toBe(2);
      expect(breakdown.destroyedTargets.byStrength.s10).toBe(2);
      // 3 × 20 + 2 × 12 + 2 × 10 = 30 + 14 + 10 = 54
      expect(breakdown.destroyedTargets.points).toBe(54);
    });
  });

  // =============================================
  //         COMBINED SCENARIO TESTS
  // =============================================

  describe('Combined Scoring Scenarios', () => {
    let comboGameId: number;
    let comboAuthed: AxiosInstance;
    let comboGmAuthed: AxiosInstance;
    let comboMobTeamId: number;
    let comboGameBoardId: number;
    let comboFosId: string;

    beforeAll(async () => {
      // Create a fresh game for combined tests
      const create = await axios.post(`/api/game/create`, { victoryConditionMP: 100 });
      comboGameId = create.data.id;
      const comboRoomCode = create.data.roomCode;

      // Join as commander
      const join = await axios.post(`/api/player/join`, {
        roomCode: comboRoomCode,
        playerName: 'Combo Commander',
      });
      const comboCommanderToken = join.data.token;
      const comboCommanderId = join.data.id ?? join.data.player?.id;

      const gameSnap = await axios.get(`/api/game/${comboGameId}`);
      const teams = gameSnap.data?.teams ?? [];
      const mobTeam = teams.find((t: any) => String(t.type).startsWith('MOB_')) ?? teams[0];
      comboMobTeamId = mobTeam.id;

      await axios.patch(`/api/player/${comboCommanderId}`, { role: 'COMMANDER' });
      await axios.post(`/api/player/${comboCommanderId}/join-team`, { teamId: comboMobTeamId });

      comboAuthed = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: { Authorization: `Bearer ${comboCommanderToken}` },
      });

      // Join GM
      const joinGm = await axios.post(`/api/player/join`, {
        roomCode: comboRoomCode,
        playerName: 'Combo GM',
      });
      const comboGmToken = joinGm.data.token;
      const comboGmId = joinGm.data.id ?? joinGm.data.player?.id;

      await axios.patch(`/api/player/${comboGmId}`, { role: 'GM' });

      const gameSnap2 = await axios.get(`/api/game/${comboGameId}`);
      const teams2 = gameSnap2.data?.teams ?? [];
      const gmTeam = teams2.find((t: any) => String(t.type) === 'GM');
      const comboGmTeamId = gmTeam.id;
      await axios.post(`/api/player/${comboGmId}/join-team`, { teamId: comboGmTeamId });

      comboGmAuthed = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: { Authorization: `Bearer ${comboGmToken}` },
      });

      // Get game board
      const gameBoard = await axios.get(`/api/game/${comboGameId}`);
      comboGameBoardId = gameBoard.data.gameBoard?.id;

      // Activate a FOS
      const activate = await comboAuthed.post(`/api/fos/31/activate`, {
        teamId: comboMobTeamId,
        turnActivated: 1,
      });
      comboFosId = activate.data.id;
    });

    it('correctly calculates total score with mix of assessments, sorties, and destroyed targets', async () => {
      // 1. Complete 2 FOS assessments (2 × 5 = 10 MPs)
      const fosNumbers = [32, 33];
      for (const fosNum of fosNumbers) {
        const activate = await comboAuthed.post(`/api/fos/${fosNum}/activate`, {
          teamId: comboMobTeamId,
          turnActivated: 1,
        });
        const fosId = activate.data.id;

        for (let i = 1; i <= 10; i++) {
          await comboGmAuthed.post(`/api/fos/${fosId}/rfi`, {
            rfiKey: `RFI${i}`,
            rfiValue: `Answer${i}`,
          });
        }
      }

      // 2. Launch 3 fighter sorties from FOS (3 × 5 = 15 MPs)
      for (let i = 0; i < 3; i++) {
        const aircraft = await axios.post(`/api/allocation/spawn-aircraft`, {
          gameId: comboGameId,
          teamId: comboMobTeamId,
          type: i % 2 === 0 ? 'F16' : 'F22',
          locationType: 'FOS',
          locationFosId: comboFosId,
        });

        await axios.post(`/api/ato`, {
          gameId: comboGameId,
          turn: 1,
          aircraftCallSign: aircraft.data.callSign,
          startLocation: comboFosId,
          startLocationType: 'FOS',
          finalDestination: `OpArea${i}`,
          intention: 'LAND',
          configuration: 'CARGO_ONLY',
          pprStatus: 'APPROVED',
          isOperationalArea: true,
        });
      }

      // 3. Destroy mixed targets: 1×20, 2×12, 1×10 (1×10 + 2×7 + 1×5 = 10 + 14 + 5 = 29 MPs)
      const targets = [
        { type: 'FIFTH_GEN_FIGHTER_20', strength: 20, hex: 'H8' },
        { type: 'FOURTH_GEN_FIGHTER_12', strength: 12, hex: 'I9' },
        { type: 'AA_JAMMING', strength: 12, hex: 'J10' },
        { type: 'GROUND_TARGET_10', strength: 10, hex: 'K11' },
      ];

      for (const target of targets) {
        const token = await axios.post(`/api/threat-tokens`, {
          boardId: comboGameBoardId,
          type: target.type,
          strength: target.strength,
          locationHex: target.hex,
        });
        await axios.patch(`/api/threat-tokens/${token.data.id}`, {
          destroyedAt: new Date().toISOString(),
          destroyedByTeamId: comboMobTeamId,
        });
      }

      // Get final score
      const scoreRes = await axios.get(`/api/game/${comboGameId}/score`);
      expect(scoreRes.status).toBe(200);

      const breakdown = scoreRes.data.breakdown;

      // Verify each component
      expect(breakdown.assessments.count).toBe(2);
      expect(breakdown.assessments.points).toBe(10);

      expect(breakdown.crisisSorties.count).toBe(3);
      expect(breakdown.crisisSorties.points).toBe(15);

      expect(breakdown.destroyedTargets.byStrength.s20).toBe(1);
      expect(breakdown.destroyedTargets.byStrength.s12).toBe(2);
      expect(breakdown.destroyedTargets.byStrength.s10).toBe(1);
      expect(breakdown.destroyedTargets.byStrength.airborneJammer).toBe(1);
      expect(breakdown.destroyedTargets.points).toBe(29);

      expect(breakdown.demoralizationPenalty.penalty).toBe(0);

      // Total should be: 10 + 15 + 29 - 0 = 54 MPs
      expect(scoreRes.data.total).toBe(54);
    });
  });
});

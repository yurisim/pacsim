import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';

describe('FOS WebSocket Broadcasts E2E', () => {
  let gameId: number;
  let roomCode: string;
  let teamId: number;
  let socket: Socket;
  let playerId: number;
  let token: string;
  let api: AxiosInstance;

  // Use retries if Jest has retryTimes configured in this environment (do not modify global config)
  if (typeof (global as any).jest?.retryTimes === 'function') {
    (global as any).jest.retryTimes(2);
  }

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
    // 1) Create a game and obtain roomCode and gameId (reuse patterns from fos.spec.ts)
    const gameRes = await axios.post(`/api/game/create`, {
      victoryConditionMP: 100,
    });
    gameId = gameRes.data.id;
    roomCode = gameRes.data.roomCode;

    // 2) Join the game as a player to ensure a team exists and capture a teamId
    const joinRes = await axios.post(`/api/player/join`, {
      roomCode,
      playerName: 'WS Broadcast Tester',
    });
    expect(joinRes.data?.token).toBeDefined();
    token = joinRes.data.token;
    playerId = joinRes.data.id ?? joinRes.data.player?.id;

    // Reuse "get game" pattern from fos.spec.ts to obtain a MOB teamId
    try {
      const gameDetails = await axios.get(`/api/game/${gameId}`);
      const teams: Array<{ id: number; type: string }> = gameDetails.data?.teams ?? [];
      const mobTeam = teams.find(t => String(t.type).startsWith('MOB_'));
      teamId = mobTeam ? mobTeam.id : (teams[0]?.id ?? 1);
    } catch {
      teamId = 1;
    }

    // Elevate to COMMANDER and join MOB team for authorization
    const roleRes = await axios.patch(`/api/player/${playerId}`, { role: 'COMMANDER' });
    expect([200, 201]).toContain(roleRes.status);
    const joinTeamRes = await axios.post(`/api/player/${playerId}/join-team`, { teamId });
    expect([200, 201]).toContain(joinTeamRes.status);

    // Authorized axios instance
    const baseURL = (axios.defaults.baseURL ?? 'http://localhost:3000').replace(/\/$/, '');
    api = axios.create({
      baseURL,
      headers: { Authorization: `Bearer ${token}` },
    });

    // 3) Start a Socket.IO client that connects to the default namespace and joins the room

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

  it('activating a FOS via REST broadcasts room-scoped "fosListUpdate" reflecting the activation', async () => {
    // 4) Listen for "fosListUpdate" BEFORE triggering activation to avoid race conditions
    const updatePromise = waitForSocketEvent<any[]>('fosListUpdate', 10000);

    // Activate a specific FOS by its display number (reuse endpoint/DTO from fos.spec.ts/fos.controller.ts)
    const fosDisplayNumber = 7;
    const turnActivated = 1;

    const activateRes = await api.post(`/api/fos/${fosDisplayNumber}/activate`, {
      teamId,
      turnActivated,
    });

    expect(activateRes.status).toBe(201);
    expect(activateRes.data.fosDisplayNumber).toBe(fosDisplayNumber);
    expect(activateRes.data.isActive).toBe(true);
    expect(activateRes.data.teamId).toBe(teamId);
    expect(activateRes.data.gameId).toBe(gameId);

    // Await broadcast and assert payload shape/content
    const payload = await updatePromise;
    expect(Array.isArray(payload)).toBe(true);

    const target = payload.find((f: any) => f.fosDisplayNumber === fosDisplayNumber);
    expect(target).toBeDefined();
    expect(target.gameId).toBe(gameId);
    expect(target.isActive).toBe(true);
    expect(target.teamId).toBe(teamId);
  });

  it('deactivating the FOS broadcasts a subsequent "fosListUpdate" with isActive === false', async () => {
    // Ensure the target FOS exists and is active; activate if necessary and capture its id
    const fosDisplayNumber = 7;

    // Try to find existing FOS
    const existing = await axios.get(`/api/fos/game/${gameId}`);
    let fos = existing.data.find((f: any) => f.fosDisplayNumber === fosDisplayNumber);

    if (!fos || !fos.isActive) {
      const activateRes = await axios.post(`/api/fos/${fosDisplayNumber}/activate`, {
        teamId,
        turnActivated: 2,
      });
      fos = activateRes.data;
    }

    const fosId: string = fos.id;
    expect(typeof fosId).toBe('string');

    // Subscribe to the next update BEFORE invoking deactivation
    const updatePromise = waitForSocketEvent<any[]>('fosListUpdate', 10000);

    // Deactivate (PATCH uses database UUID id per fos.controller.ts)
    const deactivateRes = await api.patch(`/api/fos/${fosId}/deactivate`);
    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.data.id).toBe(fosId);
    expect(deactivateRes.data.isActive).toBe(false);

    const payload = await updatePromise;
    expect(Array.isArray(payload)).toBe(true);

    const target = payload.find((f: any) => f.fosDisplayNumber === fosDisplayNumber);
    expect(target).toBeDefined();
    expect(target.gameId).toBe(gameId);
    expect(target.isActive).toBe(false);
    expect(target.teamId).toBeNull();
  });
});

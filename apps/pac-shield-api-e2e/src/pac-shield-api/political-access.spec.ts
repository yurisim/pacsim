import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';

describe('Political Access API + WebSocket Broadcast (GM-only)', () => {
  let gameId: number;
  let roomCode: string;

  let gmPlayerId: number;
  let gmToken: string;
  let gmApi: AxiosInstance;

  let nonGmPlayerId: number;
  let nonGmToken: string;
  let nonGmApi: AxiosInstance;

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

    // 3) Join as non-GM (PLAYER) to validate guard returns 403
    const joinNonGmRes = await axios.post(`/api/player/join`, {
      roomCode,
      playerName: 'NonGM Tester',
      role: 'PLAYER',
    });
    expect(joinNonGmRes.data?.token).toBeDefined();
    nonGmToken = joinNonGmRes.data.token;
    nonGmPlayerId = joinNonGmRes.data.id ?? joinNonGmRes.data.player?.id;

    // 4) Authorized axios instances
    const baseURL = (axios.defaults.baseURL ?? 'http://localhost:3000').replace(/\/$/, '');
    gmApi = axios.create({
      baseURL,
      headers: { Authorization: `Bearer ${gmToken}` },
    });
    nonGmApi = axios.create({
      baseURL,
      headers: { Authorization: `Bearer ${nonGmToken}` },
    });

    // 5) Start a Socket.IO client (default namespace) and join game room by roomCode
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

  it('GM-authenticated request broadcasts "countryAccessChanged" with expected payload', async () => {
    // Listen BEFORE triggering the change
    const wsPromise = waitForSocketEvent<any>('countryAccessChanged', 10000);

    const dto = {
      country: 'Japan',
      accessType: 'access', // 'access' | 'overflight'
      accessLevel: 'FULL_ACCESS', // 'FULL_ACCESS' | 'OVERFLIGHT_ONLY' | 'NO_ACCESS'
      source: 'panel',
    };

    const res = await gmApi.post(`/api/game/${gameId}/political-access`, dto);
    expect(res.status).toBe(200);
    expect(res.data?.success).toBe(true);
    expect(res.data?.state).toBeDefined();
    expect(typeof res.data?.updatedAt).toBe('string');

    const event = await wsPromise;
    // Event should be: { type: 'countryAccessChanged', payload: { ... } }
    expect(event).toBeDefined();
    expect(event.type).toBe('countryAccessChanged');
    expect(event.payload).toBeDefined();

    const p = event.payload;
    expect(p.gameId).toBe(gameId);
    expect(p.country).toBe('Japan');
    expect(p.accessType).toBe('access');
    expect(p.accessLevel).toBe('FULL_ACCESS');
    expect(p.updatedBy).toBeDefined();
    expect(p.updatedBy.role).toBe('GM');
    expect(typeof p.updatedBy.playerId).toBe('number');
    expect(typeof p.updatedAt).toBe('string');
    // version is optional but if present should be a number
    if (p.version !== undefined) {
      expect(typeof p.version).toBe('number');
    }
  });

  it('Non-GM request receives 403 Forbidden', async () => {
    const dto = {
      country: 'Philippines',
      accessType: 'overflight',
      accessLevel: 'NO_ACCESS',
      source: 'map',
    };

    const p = nonGmApi.post(`/api/game/${gameId}/political-access`, dto);
    await expect(p).rejects.toMatchObject({
      response: {
        status: 403,
        data: {
          message: expect.stringContaining('Only GMs can perform this action'),
        },
      },
    });
  });
});

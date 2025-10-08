import { waitForPortOpen } from '@nx/node/utils';
import { Socket } from 'net';

// Extend globalThis to include our custom properties
declare global {
  var __TEARDOWN_MESSAGE__: string;
}

async function isPortInUse(port: number, host: string, timeoutMs = 1000): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = new Socket();
    let settled = false;

    const cleanup = () => {
      socket.removeAllListeners();
      try {
        socket.destroy();
      } catch {
        // noop
      }
    };

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(false);
      }
    }, timeoutMs);

    socket.once('connect', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(true);
      }
    });

    // Any connection error implies port is not accepting connections
    socket.once('error', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

module.exports = async function () {
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  // If port is already in use, assume API is running and skip any startup.
  const inUse = await isPortInUse(port, host, 1000);
  if (inUse) {
    console.log(`[api-e2e] skipping ${port} server startup, alrready up.`);
    // Teardown remains safe: we did not start anything, so nothing to kill.
    globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
    return;
  }

  // Port is free: retain existing behavior (wait for readiness as currently implemented).
  console.log('\nSetting up...\n');
  await waitForPortOpen(port, { host });

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};

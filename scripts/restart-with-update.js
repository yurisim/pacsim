#!/usr/bin/env node

/**
 * Cross-platform service restart script with dependency update
 *
 * This script:
 * 1. Detects if pac-shield-api (port 3000) and pac-shield (port 4200) are running
 * 2. Gracefully terminates running services
 * 3. Runs yarn install to update dependencies
 * 4. Runs postinstall tasks if configured
 * 5. Restarts only the services that were previously running
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

// ANSI color codes for pretty console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}`),
};

const isWindows = process.platform === 'win32';

// Service configuration
const services = {
  api: {
    name: 'pac-shield-api',
    port: 3000,
    command: 'npx nx serve pac-shield-api',
    running: false,
    pid: null,
  },
  frontend: {
    name: 'pac-shield',
    port: 4200,
    command: 'npx nx serve pac-shield',
    running: false,
    pid: null,
  },
};

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a port is in use and get the PID
 */
async function checkPort(port) {
  try {
    const command = isWindows
      ? `netstat -ano | findstr ":${port} "`
      : `lsof -ti:${port}`;

    const { stdout } = await execAsync(command);

    if (!stdout.trim()) {
      return null;
    }

    if (isWindows) {
      // Parse Windows netstat output
      // Format: TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.includes('LISTENING')) {
          const pid = parts[parts.length - 1];
          return parseInt(pid, 10);
        }
      }
      return null;
    } else {
      // Unix/Mac: lsof returns PID directly
      return parseInt(stdout.trim().split('\n')[0], 10);
    }
  } catch (error) {
    return null;
  }
}

/**
 * Kill a process by PID
 */
async function killProcess(pid, graceful = true) {
  try {
    if (isWindows) {
      const flag = graceful ? '' : '/F';
      await execAsync(`taskkill ${flag} /PID ${pid} /T`);
    } else {
      const signal = graceful ? 'TERM' : 'KILL';
      await execAsync(`kill -${signal} ${pid}`);
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for a port to become free
 */
async function waitForPortFree(port, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const pid = await checkPort(port);
    if (!pid) {
      return true;
    }
    await sleep(500);
  }
  return false;
}

/**
 * Detect running services
 */
async function detectServices() {
  log.step('🔍 Checking running services...');

  for (const [key, service] of Object.entries(services)) {
    const pid = await checkPort(service.port);
    if (pid) {
      service.running = true;
      service.pid = pid;
      log.success(`${service.name} is running on port ${service.port} (PID: ${pid})`);
    } else {
      log.info(`${service.name} is not running`);
    }
  }
}

/**
 * Stop running services
 */
async function stopServices() {
  const runningServices = Object.values(services).filter(s => s.running);

  if (runningServices.length === 0) {
    log.info('No services to stop');
    return;
  }

  log.step('🛑 Stopping services...');

  for (const service of runningServices) {
    log.info(`Stopping ${service.name}...`);

    // Try graceful shutdown first
    let stopped = await killProcess(service.pid, true);

    if (stopped) {
      await sleep(3000); // Wait for graceful shutdown

      // Check if process still exists
      const stillRunning = await checkPort(service.port);
      if (stillRunning) {
        log.warn(`${service.name} did not stop gracefully, force killing...`);
        stopped = await killProcess(service.pid, false);
      }
    }

    // Wait for port to be free
    const portFree = await waitForPortFree(service.port);

    if (portFree) {
      log.success(`${service.name} stopped`);
    } else {
      log.error(`Failed to free port ${service.port} for ${service.name}`);
      throw new Error(`Port ${service.port} is still in use`);
    }
  }
}

/**
 * Run yarn install
 */
async function updateDependencies() {
  log.step('📦 Running yarn install...');

  try {
    const { stdout, stderr } = await execAsync('yarn install');
    if (stderr && !stderr.includes('warning')) {
      log.warn(stderr);
    }
    log.success('Dependencies updated');
  } catch (error) {
    log.error('Failed to update dependencies');
    throw error;
  }
}

/**
 * Run postinstall if it exists
 */
async function runPostinstall() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (packageJson.scripts && packageJson.scripts.postinstall) {
    log.step('🔄 Running postinstall tasks...');

    try {
      const { stdout, stderr } = await execAsync('yarn postinstall');
      if (stderr && !stderr.includes('warning')) {
        log.warn(stderr);
      }
      log.success('Postinstall complete');
    } catch (error) {
      log.error('Postinstall failed');
      throw error;
    }
  } else {
    log.info('No postinstall script configured');
  }
}

/**
 * Start a service in the background
 */
function startService(service) {
  log.info(`Starting ${service.name}...`);

  const [command, ...args] = service.command.split(' ');

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    shell: true,
  });

  child.unref();

  log.success(`${service.name} started (PID: ${child.pid})`);
  return child.pid;
}

/**
 * Restart previously running services
 */
async function restartServices() {
  const servicesToRestart = Object.values(services).filter(s => s.running);

  if (servicesToRestart.length === 0) {
    log.info('No services to restart');
    return;
  }

  log.step('🚀 Restarting services...');

  // Wait a moment before starting services
  await sleep(2000);

  for (const service of servicesToRestart) {
    startService(service);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════╗
║  Pacific Shield Service Restart Tool  ║
╚═══════════════════════════════════════╝
${colors.reset}`);

  try {
    // 1. Detect running services
    await detectServices();

    // 2. Stop running services
    await stopServices();

    // 3. Update dependencies
    await updateDependencies();

    // 4. Run postinstall
    await runPostinstall();

    // 5. Restart services
    await restartServices();

    log.step('✨ Done! Services restored to previous state.');
    process.exit(0);
  } catch (error) {
    log.error(`Script failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();

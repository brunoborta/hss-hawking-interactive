/**
 * Starts a preview of the build, waits for it, runs the spec, then stops it.
 *
 * This exists so `npm run test:e2e` behaves the same on a laptop and in CI,
 * without anyone having to remember to leave a server running in another
 * terminal. With E2E_BASE_URL set, it assumes the server already exists and
 * only runs the spec.
 */
import { spawn } from 'node:child_process';

const PORT = Number(process.env.E2E_PORT ?? 4173);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}/hss-hawking-interactive/`;
const READY_TIMEOUT_MS = 60_000;

async function waitForServer(url) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server is still coming up
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not answer at ${url} within ${READY_TIMEOUT_MS}ms`);
}

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });

let server;
try {
  if (!process.env.E2E_BASE_URL) {
    server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      stdio: 'ignore',
    });
    await waitForServer(BASE_URL);
  }
  await run('node', ['e2e/legend.spec.mjs'], { env: { ...process.env, E2E_BASE_URL: BASE_URL } });
} finally {
  server?.kill();
}

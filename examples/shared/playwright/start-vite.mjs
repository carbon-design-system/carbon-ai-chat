/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Start the current Vite example for its Playwright suite. */
import { createServer as createHttpServer } from 'node:http';
import { createServer as createViteServer } from 'vite';

// Node binds port 0 atomically. Vite's own port-0 path probes and releases a
// socket before binding, which lets another suite claim that port first.
const httpServer = createHttpServer();
const vite = await createViteServer({
  root: process.cwd(),
  server: {
    middlewareMode: true,
    ws: { server: httpServer },
    open: false,
  },
});
httpServer.on('request', vite.middlewares);

try {
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', () => {
      httpServer.off('error', reject);
      resolve();
    });
  });
} catch (error) {
  await vite.close();
  throw error;
}

const address = httpServer.address();
if (!address || typeof address === 'string') {
  httpServer.close();
  await vite.close();
  throw new Error('The example server did not expose a listening port.');
}

console.log(`CAIC_E2E_URL=http://127.0.0.1:${address.port}`);

let closing = false;
async function closeServer() {
  if (closing) {
    return;
  }
  closing = true;
  await Promise.allSettled([
    vite.close(),
    new Promise((resolve) => httpServer.close(resolve)),
  ]);
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, closeServer);
}

// An interrupted Playwright process can exit before signaling its web server.
const parentCheck = setInterval(() => {
  if (process.ppid === 1) {
    void closeServer();
  }
}, 1000);
parentCheck.unref();

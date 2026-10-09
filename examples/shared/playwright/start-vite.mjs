/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Build the Vite example in the current directory and serve the result for the
 * golden suite. Reports the URL as `<variable>=<url>`, the variable named by
 * the first argument.
 *
 * A built page matches what ships and never reloads mid-test. The dev server
 * re-optimizes dependencies as the chat's lazy chunks load, which reloads a
 * cold page during the first test.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const urlVariable = process.argv[2];
if (!urlVariable) {
  throw new Error('Pass the name of the URL variable to report.');
}

// Each example brings its own Vite, matching its `vite.config.ts` plugins.
const vitePath = createRequire(`${process.cwd()}/`).resolve('vite');
const { build, resolveConfig } = await import(pathToFileURL(vitePath).href);

await build({ root: process.cwd(), logLevel: 'warn' });
const { build: buildConfig, root } = await resolveConfig({}, 'build');
const outDir = path.resolve(root, buildConfig.outDir);

const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.mjs': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const httpServer = createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://127.0.0.1');
  let file;
  try {
    file = path.join(outDir, decodeURIComponent(pathname));
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (file !== outDir && !file.startsWith(outDir + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  if ((await stat(file).catch(() => null))?.isDirectory()) {
    file = path.join(file, 'index.html');
  }
  if (!(await stat(file).catch(() => null))?.isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'content-type':
      contentTypes[path.extname(file)] ?? 'application/octet-stream',
  });
  createReadStream(file).pipe(response);
});

// Node binds port 0 atomically. A server that probes for a free port and
// releases it before binding lets another suite claim that port first.
await new Promise((resolve, reject) => {
  httpServer.once('error', reject);
  httpServer.listen(0, '127.0.0.1', () => {
    httpServer.off('error', reject);
    resolve();
  });
});

const address = httpServer.address();
if (!address || typeof address === 'string') {
  httpServer.close();
  throw new Error('The example server did not expose a listening port.');
}

console.log(`${urlVariable}=http://127.0.0.1:${address.port}`);

let closing = false;
async function closeServer() {
  if (closing) {
    return;
  }
  closing = true;
  httpServer.closeAllConnections();
  await new Promise((resolve) => httpServer.close(resolve));
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, closeServer);
}

// Best effort: an interrupted Playwright process can exit before signaling its
// web server, which reparents this one to init where that is the parent.
const parentCheck = setInterval(() => {
  if (process.ppid === 1) {
    void closeServer();
  }
}, 1000);
parentCheck.unref();

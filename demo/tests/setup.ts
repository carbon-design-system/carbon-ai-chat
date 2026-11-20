/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FullConfig } from '@playwright/test';

/**
 * Polyfill DOM types that Carbon web components might reference in source maps.
 * This is needed because of an issue with @carbon/web-components source maps
 * pointing to TypeScript files that reference DOM types like Node.
 *
 * This must run at module load time (not just in globalSetup function)
 * to be available before test files are imported.
 */
if (typeof globalThis.Node === 'undefined') {
  // @ts-ignore - adding minimal polyfill for DOM Node type
  globalThis.Node = class Node {};
}

const builtIndex = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../dist/index.html'
);

/**
 * Global setup for Playwright tests. Runs after the web server is up, and
 * fails the run when the server isn't serving this checkout's production
 * build, such as a dev server or another worktree's preview.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) {
    return;
  }
  const [expected, served] = await Promise.all([
    readFile(builtIndex, 'utf8').catch(() => undefined),
    fetch(baseURL).then((response) => response.text()),
  ]);
  if (served !== expected) {
    throw new Error(
      `${baseURL} is not serving this checkout's demo/dist. ` +
        'Another worktree or a dev server is probably on that port. Stop it, ' +
        'or set PORT to a free port, then run the suite again.'
    );
  }
}

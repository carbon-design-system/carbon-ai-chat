/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Playwright setup for the golden examples. One project per target in
 * `targets.ts`; each project runs its own spec against its own Vite server.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

import { targets, urlVariable, type TargetId } from './targets';

const here = path.dirname(fileURLToPath(import.meta.url));
const ids = Object.keys(targets) as TargetId[];

export default defineConfig<{ target: TargetId }>({
  testDir: './tests',
  outputDir: './test-results',
  timeout: 60 * 1000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  webServer: ids.map((id) => {
    const variable = urlVariable(id);
    return {
      command: `node ../../shared/playwright/start-vite.mjs ${variable}`,
      cwd: path.resolve(here, '..', '..', targets[id].example),
      wait: {
        stdout: new RegExp(
          `${variable}=(?<${variable}>http://127\\.0\\.0\\.1:\\d+)`
        ),
      },
      stdout: 'pipe',
      timeout: 3 * 60 * 1000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 1000 },
    };
  }),
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Chromium only: webkit has shadow-DOM problems, documented in
  // `demo/playwright.config.ts`.
  projects: ids.map((id) => ({
    name: id,
    testMatch: `**/tests/${targets[id].spec}`,
    use: { ...devices['Desktop Chrome'], target: id },
  })),
});

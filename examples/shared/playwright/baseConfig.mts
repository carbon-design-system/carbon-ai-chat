/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */
import { defineConfig, devices, PlaywrightTestConfig } from 'playwright/test';
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { mergeWith } from 'lodash';

/** Ask the OS for an unused port by binding port 0 and reading it back. */
async function probeFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}

// Playwright evaluates this config once in the runner and again in every
// worker process. Probing per evaluation would hand each process a different
// port, so the first probe is published to the environment the workers
// inherit and every later evaluation reuses it.
const PORT = Number(process.env.CAIC_EXAMPLE_PORT) || (await probeFreePort());
process.env.CAIC_EXAMPLE_PORT = String(PORT);

function defineBaseConfig(
  options?: PlaywrightTestConfig
): PlaywrightTestConfig {
  const defaults: PlaywrightTestConfig = {
    testDir: './tests',
    timeout: 60 * 1000,
    // One or two specs per example, so a worker pool buys nothing here and would
    // multiply against whatever concurrency runs the examples themselves.
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    webServer: {
      // --strictPort so a port taken between the probe and the bind fails
      // immediately, instead of Vite sliding to PORT+1 and Playwright waiting
      // out its timeout against a port nothing is serving.
      command: `PORT=${PORT} npm run start -- --strictPort`,
      port: PORT,
      // Generous: CI starts cold, so the dev server pre-bundles on first boot.
      timeout: 3 * 60 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    use: {
      baseURL: `http://localhost:${PORT}`,
      headless: true,
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
    // Chromium only: webkit has shadow-DOM problems, documented in
    // `demo/playwright.config.ts`.
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  };

  const finalConfig = mergeWith(
    {},
    defaults,
    options,
    (objValue, srcValue) => {
      if (Array.isArray(objValue)) {
        return srcValue;
      }
    }
  );

  return defineConfig(finalConfig);
}

export default defineBaseConfig;

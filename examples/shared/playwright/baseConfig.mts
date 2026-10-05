/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Shared Chromium config for Vite example suites. */
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

function defineBaseConfig(): PlaywrightTestConfig {
  return defineConfig({
    testDir: './tests',
    timeout: 60 * 1000,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    webServer: {
      command: 'node ../../shared/playwright/start-vite.mjs',
      wait: { stdout: /CAIC_E2E_URL=(?<CAIC_E2E_URL>http:\/\/127\.0\.0\.1:\d+)/ },
      stdout: 'pipe',
      timeout: 3 * 60 * 1000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 1000 },
    },
    use: {
      headless: true,
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
    // Chromium only: webkit has shadow-DOM problems, documented in
    // `demo/playwright.config.ts`.
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  });
}

export default defineBaseConfig;

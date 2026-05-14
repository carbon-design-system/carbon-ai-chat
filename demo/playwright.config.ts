/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  testDir: "./tests",
  // Set timeout for each test (including beforeEach/afterEach hooks)
  timeout: 60 * 1000, // 60 seconds per test
  // Most "flakes" we see in CI are timing-sensitive races under parallel CPU
  // contention (chromium + firefox sharing the dev server). One automatic
  // retry lets them self-heal while still surfacing genuine failures —
  // anything that fails twice in a row is a real bug, not a race. Local
  // runs get 0 retries so devs see flakes immediately.
  retries: process.env.CI ? 1 : 0,
  // automatically start your dev server before running tests:
  webServer: {
    command: "PORT=3001 npm run start", // or whatever starts localhost
    port: 3001,
    timeout: 120 * 1000, // wait up to 2m for the server
    reuseExistingServer: !process.env.CI,
  },
  globalSetup: resolve(__dirname, "./tests/setup.ts"),
  use: {
    baseURL: "http://localhost:3001",
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // Disabling webkit for now. See https://github.com/microsoft/playwright/issues/33547 and https://webscraping.ai/faq/playwright/what-are-the-ways-to-handle-shadow-dom-elements-using-playwright
    // Just need to implement that.
    // { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});

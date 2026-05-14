/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { defineConfig, devices } from "@playwright/test";

const PORT = 3017;

export default defineConfig({
  testDir: "./tests",
  timeout: 60 * 1000,
  retries: process.env.CI ? 1 : 0,
  webServer: {
    command: `PORT=${PORT} npm run start`,
    port: PORT,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

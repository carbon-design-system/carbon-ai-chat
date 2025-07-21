/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // automatically start your dev server before running tests:
  webServer: {
    command: "npm run start", // or whatever starts localhost
    url: "http://localhost:3001",
    timeout: 120 * 1000, // wait up to 2m for the server
    reuseExistingServer: !process.env.CI,
  },
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

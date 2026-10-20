/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { test as base, expect } from '@playwright/test';

import { FAST_TIMERS_FLAG } from '../src/customSendMessage/timing';

/**
 * The demo's `test`. It opts every page into the mock backend's short delays
 * before any demo script runs.
 */
export const test = base.extend({
  // Named `provide`, not Playwright's usual `use`, so the React hooks lint rule
  // doesn't read it as a hook call.
  page: async ({ page }, provide) => {
    // Opt the mock backend into short delays; the demo never infers this from
    // `navigator.webdriver`.
    await page.addInitScript((flag) => {
      (window as unknown as Record<string, unknown>)[flag] = true;
    }, FAST_TIMERS_FLAG);
    await provide(page);
  },
});

export { expect };

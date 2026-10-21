/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Browser fixtures and setup helpers shared by Vite example suites. */
import { expect, test as base, type Page } from '@playwright/test';

import { urlVariable } from '../targets';

export const test = base.extend<{ target: string }>({
  // Set by each suite or project config; never meant to be read unset.
  target: [undefined as unknown as string, { option: true }],
  baseURL: [
    async ({ target }, playWrightUse) => {
      const url = process.env[urlVariable(target)];
      if (!url) {
        throw new Error(`The ${target} example server did not report its URL.`);
      }
      await playWrightUse(url);
    },
    { option: true },
  ],
  page: async ({ page, target }, playWrightUse) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      // Vite may reload a cold page after its dependency optimizer changes.
      if (
        message.type() === 'error' &&
        !message.text().includes('504 (Outdated Optimize Dep)')
      ) {
        errors.push(message.text());
      }
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    const coverage = process.env.CAIC_E2E_COVERAGE
      ? await import('../coverage')
      : undefined;
    await coverage?.startCoverage(page);
    await playWrightUse(page);
    await coverage?.stopCoverage(page, target);
    expect(errors).toEqual([]);
  },
});

export { expect };

export async function openExample(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
}

export async function waitForChatReady(page: Page, inputTestId: string) {
  await expect(page.getByTestId(inputTestId)).toBeVisible();
}

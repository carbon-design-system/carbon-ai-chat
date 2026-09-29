/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Browser fixtures and setup helpers shared by Vite example suites. */
import { expect, test as base, type Page } from '@playwright/test';

export const test = base.extend({
  baseURL: async (_fixtures, use) => {
    const url = process.env.CAIC_E2E_URL;
    if (!url) {
      throw new Error('The example server did not report its URL.');
    }
    await use(url);
  },
  page: async ({ page }, use) => {
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
    await use(page);
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

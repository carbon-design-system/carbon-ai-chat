/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { type Page } from '@playwright/test';

/** Collects console errors so a test can assert the page stayed clean. */
export function watchForConsoleErrors(page: Page, errors: string[]) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  page.on('pageerror', (error) => errors.push(String(error)));
}

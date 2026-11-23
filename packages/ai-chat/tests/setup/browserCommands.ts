/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Server-side browser commands for the ai-chat browser project. They reach
// Playwright's page, which a test file's iframe can't, so a test can emulate
// what the user's system reports in every browser.

import type {} from '@vitest/browser-playwright';
import type { BrowserCommand } from 'vitest/node';

export interface EmulateMediaPayload {
  reducedMotion?: 'reduce' | 'no-preference' | null;
}

/** Emulates media features, such as reduced motion, for the whole page. */
const caicEmulateMedia: BrowserCommand<
  [payload: EmulateMediaPayload],
  void
> = async ({ page }, payload) => {
  await page.emulateMedia(payload);
};

export const browserCommands = { caicEmulateMedia };

declare module 'vitest/browser' {
  interface BrowserCommands {
    caicEmulateMedia(payload: EmulateMediaPayload): Promise<void>;
  }
}

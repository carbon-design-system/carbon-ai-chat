/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Media emulation for browser tests. Playwright emulates the media feature
 * for the whole page, so CSS `@media` rules and every `matchMedia` reader,
 * the components package's included, see it.
 */

import { commands } from 'vitest/browser';

const REDUCE = '(prefers-reduced-motion: reduce)';

/**
 * Makes the page report `prefers-reduced-motion: reduce`, or no preference.
 * `null` puts back the browser's own setting.
 */
export async function emulateReducedMotion(
  value: 'reduce' | 'no-preference' | null
): Promise<void> {
  await commands.caicEmulateMedia({ reducedMotion: value });
  if (value !== null) {
    expect(window.matchMedia(REDUCE).matches).toBe(value === 'reduce');
  }
}

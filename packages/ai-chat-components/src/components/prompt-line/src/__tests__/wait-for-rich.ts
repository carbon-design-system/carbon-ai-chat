/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type PromptLineElement from '../prompt-line.js';

/**
 * Poll until the rich editor has finished loading + mounting. Tiptap is loaded
 * via a lazy `import()` (see #1578), so the first upgrade in a test file pays a
 * cold-load cost that can approach a couple seconds on Chromium — poll long
 * enough to cover it (the runner's Mocha timeout is raised to match in
 * web-test-runner.config.js).
 *
 * Pass an optional `context` callback to augment the timeout error message with
 * file-local diagnostics (see `describeUpgrade` in prompt-line.test.ts).
 */
export async function waitForRich(
  el: PromptLineElement,
  context?: (el: PromptLineElement) => Promise<string>
): Promise<void> {
  for (let i = 0; i < 500; i += 1) {
    if (el.getEditor()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const detail = context ? ` - ${await context(el)}` : '';
  throw new Error(`rich editor did not load${detail}`);
}

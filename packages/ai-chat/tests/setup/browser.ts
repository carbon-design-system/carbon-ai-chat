/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Setup for the ai-chat browser project. A real browser has the layout,
// focus, slotting, observers and media queries that `index.ts` stubs for
// happy-dom, so none of those shims run here.

import '@testing-library/jest-dom/vitest';

// Set to true to enable console output during tests for debugging
const ENABLE_CONSOLE_LOGGING = false;

// Testing Library's waitFor advances fake timers while it polls only when it
// finds a `jest` global. Give it that one method, as `index.ts` does.
(globalThis as any).jest = {
  advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
};

// Mute the console as `index.ts` does, so a spec reads the same mocks in
// every project.
if (!ENABLE_CONSOLE_LOGGING) {
  const consoleMethods = ['log', 'warn', 'error', 'info', 'debug'] as const;
  consoleMethods.forEach((method) => {
    console[method] = vi.fn();
  });
}

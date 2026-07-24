/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Jest setup wired into `setupFilesAfterEach` for the jsdom test environment.
 *
 * Demonstrates: registering `@testing-library/jest-dom` matchers, eagerly
 * resolving the chat's lazy chunks via `loadAllLazyDeps`, and stubbing
 * `ResizeObserver` so Carbon components can mount under jsdom. jsdom does NOT
 * implement shadow DOM, so the test surface here is intentionally limited to
 * the light-DOM custom-element host and slotted children.
 *
 * APIs exercised: `loadAllLazyDeps` (`@carbon/ai-chat/server`), Jest globals
 * (`beforeAll`, `beforeEach`, `jest.fn`).
 *
 * Start reading at: the `beforeAll` block.
 */

import "@testing-library/jest-dom";
import { loadAllLazyDeps } from "@carbon/ai-chat/server";

// jsdom cannot evaluate dynamic `import()` reliably during a test tick;
// preloading the shared lazy bundle here keeps every spec deterministic and
// avoids unhandled-rejection noise from late-resolving chunks.
beforeAll(async () => {
  await loadAllLazyDeps();
});

beforeEach(() => {
  // jsdom omits ResizeObserver entirely. Carbon components instantiate one
  // on mount, so without a stub the very first render throws before any
  // assertion can run. The mock satisfies the constructor + observer surface.
  (window as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
});

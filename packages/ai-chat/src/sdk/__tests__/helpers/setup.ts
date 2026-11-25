/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Standard beforeEach setup for tests.
 * Clears all Jest mocks to ensure clean state between tests.
 */
export const setupBeforeEach = () => {
  vi.clearAllMocks();
};

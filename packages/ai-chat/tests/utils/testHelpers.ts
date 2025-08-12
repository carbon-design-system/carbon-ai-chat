/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { PublicConfig } from "../../src/types/config/PublicConfig";

/**
 * Mock function for customSendMessage that can be used in tests
 */
export const mockCustomSendMessage = jest.fn();

/**
 * Creates a base configuration object suitable for testing with required properties.
 * Includes exposeServiceManagerForTesting flag to enable access to internal state.
 */
export function createBaseTestConfig(): PublicConfig {
  return {
    messaging: {
      customSendMessage: mockCustomSendMessage,
    },
    exposeServiceManagerForTesting: true,
  };
}

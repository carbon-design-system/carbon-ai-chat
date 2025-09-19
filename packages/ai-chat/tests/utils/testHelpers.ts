/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatContainerProps } from "../../src/types/component/ChatContainer";

/**
 * Mock function for customSendMessage that can be used in tests
 */
export const mockCustomSendMessage = jest.fn();

/**
 * Creates base test props suitable for testing ChatContainer with required properties.
 * Includes exposeServiceManagerForTesting flag to enable access to internal state.
 */
export function createBaseTestProps(): Partial<ChatContainerProps> {
  return {
    messaging: {
      customSendMessage: mockCustomSendMessage,
    },
    exposeServiceManagerForTesting: true,
  };
}

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { PublicConfig } from '../../../types/config/PublicConfig';
import type { ChatContainerProps } from '../../../types/component/ChatContainer';
import { mockCustomSendMessage } from '../../../sdk/__tests__/helpers/config';

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

/**
 * Creates a base PublicConfig object for tests with required properties.
 */
export const createBaseConfig = (): PublicConfig => ({
  ...createBaseTestProps(),
});

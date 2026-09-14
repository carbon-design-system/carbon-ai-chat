/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the custom-header React example.
 *
 * Demonstrates: a minimal `customSendMessage` implementation that returns a
 * plain text reply. Swap this for your real service handler in production.
 *
 * APIs exercised:
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from '@carbon/ai-chat';

// Replace with a real production implementation — this routes every message to
// a single canned text response to keep the example self-contained.
async function customSendMessage(
  _request: MessageRequest,
  _options: CustomSendMessageOptions,
  instance: ChatInstance
) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: 'This is a response from the mock backend. Replace `customSendMessage` with your real service handler.',
        },
      ],
    },
  });
}

export { customSendMessage };

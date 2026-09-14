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

// shown when the chat first opens (empty input from the welcome event).
const WELCOME_TEXT = `Welcome to the custom header Web components example. Send any message to receive a response from the mock backend.`;

// Replace with a real production implementation — this returns a single canned
// text response to keep the example self-contained.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance
) {
  if (request.input.text === '') {
    // Empty input is dispatched on first open as the welcome handshake
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: WELCOME_TEXT,
          },
        ],
      },
    });
    return;
  }

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

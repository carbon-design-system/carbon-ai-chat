/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock `customSendMessage` handler for the typeahead-custom example.
 *
 * Demonstrates: a minimal offline message handler that lets the example
 * focus on the typeahead dropdown UI instead of backend wiring.
 *
 * APIs exercised:
 *   - `PublicConfig.messaging.customSendMessage`
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: the `customSendMessage` function below.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const WELCOME_TEXT =
  'Welcome! Start typing to see typeahead suggestions. Try typing "carbon", "design", or "how" to see matching suggestions appear above the input.';

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const text = request.input.text?.trim();

  if (!text) {
    // Empty submissions act as the "hello" trigger that surfaces the welcome instructions.
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

  // Echo the submitted text so the demo confirms the typeahead-driven send path round-trips end to end.
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: `Received your message: "${text}"`,
        },
      ],
    },
  });
}

export { customSendMessage };

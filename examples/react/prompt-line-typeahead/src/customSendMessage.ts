/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Title: Mock customSendMessage backend for the typeahead example.
 *
 * Demonstrates: implementing the `messaging.customSendMessage` contract by
 * echoing user input through `instance.messaging.addMessage` so the typeahead
 * surface has a reachable round-trip without any real network call.
 *
 * APIs exercised:
 *   - `MessageRequest` / `CustomSendMessageOptions` / `ChatInstance`
 *   - `instance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: `customSendMessage`.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const WELCOME_TEXT =
  'Welcome! Start typing to see typeahead suggestions. Try typing "carbon", "design", or "how" to see matching suggestions appear above the input.';

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const text = request.input.text?.trim();

  // an empty submission (e.g. a suggestion accepted with no text) routes to a guided welcome instead of an echo.
  if (!text) {
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

  // Replace with a real production implementation. This mock echoes the input so the typeahead flow is observable end-to-end.
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

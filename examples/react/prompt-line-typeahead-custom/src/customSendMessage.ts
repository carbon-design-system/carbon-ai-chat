/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Local backend stub for the typeahead custom-list example.
 *
 * Demonstrates: a no-network `customSendMessage` that emits a welcome
 * message on empty input and echoes anything else, so the example focuses
 * on the suggestion UI rather than transport.
 *
 * APIs exercised:
 *   - `customSendMessage` signature from `@carbon/ai-chat`
 *   - `instance.messaging.addMessage` with `MessageResponseTypes.TEXT`
 *
 * Start reading at: `customSendMessage()`.
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

  // the chat fires an empty-text request on first open (welcome turn) —
  // intercept it to greet the user and short-circuit before the echo branch.
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

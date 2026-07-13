/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock `customSendMessage` transport for the typeahead example.
 *
 * Demonstrates: a minimal `messaging.customSendMessage` handler that echoes
 * user input back as a text response so the typeahead dropdown can be
 * exercised end-to-end without a backend.
 *
 * APIs exercised:
 *   - `MessageRequest` / `CustomSendMessageOptions` / `ChatInstance`
 *   - `instance.messaging.addMessage` with `MessageResponseTypes.TEXT`
 *
 * Start reading at: the `customSendMessage` function below.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

// Greeting shown when the user submits an empty message; nudges them toward
// queries that will surface CANNED_SUGGESTIONS matches.
const WELCOME_TEXT =
  'Welcome! Start typing to see typeahead suggestions. Try typing "carbon", "design", or "how" to see matching suggestions appear above the input.';

// Replace with a real production implementation that posts to your assistant
// backend and streams or returns the response.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const text = request.input.text?.trim();

  // Empty submissions surface the welcome copy instead of echoing a blank
  // string back, which would look like a broken response.
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

  // Echo the trimmed input so testers can confirm the typeahead selection
  // actually reached the send handler.
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

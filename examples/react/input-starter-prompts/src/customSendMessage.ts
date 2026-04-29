/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock customSendMessage handler for the input-field-starter-prompts example.
 *
 * Demonstrates: a minimal `messaging.customSendMessage` implementation that
 * echoes the user's text back as a `MessageResponseTypes.TEXT` reply, with
 * a special welcome greeting when an empty submission slips through.
 *
 * APIs exercised:
 *   - `MessageRequest` (input contract)
 *   - `CustomSendMessageOptions`
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: `customSendMessage`. Replace with a real production
 * implementation that dispatches to your backend.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const WELCOME_TEXT =
  "Welcome! Click into the input below to see suggested starter prompts. Pick one to populate the input, edit it as you like, then send.";

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const text = request.input.text?.trim();

  if (!text) {
    // Empty submissions still reach the handler (e.g. user hits Enter on a
    // blank input); reply with onboarding copy instead of echoing nothing.
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

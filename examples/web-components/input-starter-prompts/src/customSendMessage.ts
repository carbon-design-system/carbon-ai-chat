/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock `customSendMessage` handler for the starter-prompts example.
 *
 * Demonstrates: a minimal stand-in backend that proves starter prompts seed
 * the input field and that the chat round-trips text. The empty-input path
 * surfaces a one-time onboarding tip that explains the suggestion UX.
 *
 * APIs exercised:
 *   - `PublicConfig.messaging.customSendMessage`
 *   - `ChatInstance.messaging.addMessage` + `MessageResponseTypes.TEXT`
 *
 * Start reading at: the `customSendMessage` function below.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

// Onboarding copy shown when the user submits an empty input so the demo
// teaches the starter-prompt UX without needing a real assistant reply.
const WELCOME_TEXT =
  "Welcome! Click into the input below to see suggested starter prompts. Pick one to populate the input, edit it as you like, then send.";

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const text = request.input.text?.trim();

  // Empty submissions still hit `customSendMessage`; emit the onboarding tip
  // instead of echoing a blank message back to the user.
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

  // Echo the user's input as a `MessageResponseTypes.TEXT` reply so the demo
  // visibly confirms the starter-prompt value made it through the pipeline.
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

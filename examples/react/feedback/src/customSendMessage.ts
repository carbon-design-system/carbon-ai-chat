/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the feedback example.
 *
 * Demonstrates: returning a text response decorated with
 * `message_item_options.feedback` so the chat renders the thumbs up/down
 * widget that drives `BusEventType.FEEDBACK`.
 *
 * APIs exercised:
 *   - `customSendMessage` (PublicConfig.messaging hook)
 *   - `instance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *   - `message_item_options.feedback`
 *
 * Start reading at: the `customSendMessage` function below.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const WELCOME_TEXT = `Welcome to the feedback example.

Type \`text\` to receive a response that includes the configuration to display the feedback widget (thumbs up/down). Submitted feedback is forwarded to the parent app via the \`BusEventType.FEEDBACK\` bus event.
`;

const TEXT = `Lorem ipsum odor amet, consectetuer adipiscing elit. Aliquet non platea elementum morbi porta accumsan. Tortor libero consectetur dapibus volutpat porta vestibulum.

Use the thumbs up / thumbs down buttons below to submit feedback for this message.`;

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // Empty input fires on chat open; respond with the welcome copy.
  if (request.input.text === "") {
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

  if (request.input.text === "text") {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: TEXT,
            // Attaching message_item_options.feedback is what makes the thumbs up/down widget render on this message.
            message_item_options: {
              feedback: {
                is_on: true,
                id: "1",
                show_positive_details: false,
                show_negative_details: true,
                show_prompt: true,
              },
            },
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
          text: WELCOME_TEXT,
        },
      ],
    },
  });
}

export { customSendMessage };

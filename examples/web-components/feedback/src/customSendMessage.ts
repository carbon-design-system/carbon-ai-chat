/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock messaging backend for the Feedback example.
 *
 * Demonstrates: returning a `MessageResponseTypes.TEXT` payload tagged with
 * `message_item_options.feedback` so the chat renders the thumbs up/down
 * affordance. Real apps would call their LLM/service here.
 *
 * APIs exercised:
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *   - `message_item_options.feedback`
 *
 * Start reading at: `customSendMessage`.
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
  // The chat fires an empty-string send on first open to fetch a greeting.
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
            // Attaching `feedback` to the message item is what causes the
            // thumbs up/down controls to render under this response.
            message_item_options: {
              feedback: {
                // Master switch that turns the feedback widget on for this item.
                is_on: true,
                // Stable identifier so the host app can correlate submissions back to this message.
                id: "1",
                // Skip the follow-up details prompt for positive feedback to keep the happy path frictionless.
                show_positive_details: false,
                // Collect structured details on negative feedback so issues can be triaged.
                show_negative_details: true,
                // Surface the prompt text inside the details panel for additional user context.
                show_prompt: true,
              },
            },
          },
        ],
      },
    });
    return;
  }

  // Any unrecognized input falls back to the welcome text so the demo stays self-explanatory.
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

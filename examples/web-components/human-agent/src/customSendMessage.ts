/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock back-end for the human-agent example.
 *
 * Demonstrates: implementing `customSendMessage` to fully mock chat replies
 * on the client, including emitting a `CONNECT_TO_HUMAN_AGENT` response that
 * triggers the `serviceDeskFactory` hand-off path.
 *
 * APIs exercised:
 *   - `PublicConfig.messaging.customSendMessage`
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT` / `MessageResponseTypes.CONNECT_TO_HUMAN_AGENT`
 *
 * Start reading at: `customSendMessage`.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const WELCOME_TEXT = `Welcome to this example of a custom back-end. This back-end is mocked entirely on the client side. It does not show all potential functionality.

You can try the following responses:

- text
- human
`;

const TEXT = `Lorem ipsum odor amet, consectetuer adipiscing elit. \`Inline Code Venenatis\` aliquet non platea elementum morbi porta accumsan. Tortor libero consectetur dapibus volutpat porta vestibulum.

Quam scelerisque platea ridiculus sem placerat pharetra sed. Porttitor per massa venenatis fusce fusce ad cras. Vel congue semper, rhoncus tempus nisl nam. Purus molestie tristique diam himenaeos sapien lacus.`;

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // Empty input is sent on session start to fetch a welcome message.
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
  } else {
    switch (request.input.text) {
      case "text":
        instance.messaging.addMessage({
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: TEXT,
              },
            ],
          },
        });
        break;
      case "human":
        // CONNECT_TO_HUMAN_AGENT is the trigger response that hands the conversation to the configured serviceDeskFactory.
        instance.messaging.addMessage({
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
              },
            ],
          },
        });
        break;
      default:
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
  }
}

export { customSendMessage };

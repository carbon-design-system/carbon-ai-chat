/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the user-defined-responses example.
 *
 * Demonstrates: how a `customSendMessage` handler can emit a
 * `MessageResponseTypes.USER_DEFINED` payload that the host app then renders
 * with its own React component.
 *
 * APIs exercised:
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *   - `MessageResponseTypes.USER_DEFINED`
 *   - `CustomSendMessageOptions`, `MessageRequest`
 *
 * Start reading at: `customSendMessage`.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const WELCOME_TEXT = `Welcome to the user-defined responses example.

Type \`user_defined\` to receive a custom response that is rendered by your own React component via the \`renderUserDefinedResponse\` prop. The example also tracks the most recent response via the \`activeResponseId\` state, demonstrated by the "Is this the most recent message?" line in the rendered card.
`;

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // Empty input fires once on chat open as a hello-from-the-bot trigger.
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

  if (request.input.text === "user_defined") {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            // USER_DEFINED tells the chat to delegate rendering to renderUserDefinedResponse.
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: {
              // user_defined_type is the discriminator the renderer switches on.
              user_defined_type: "my_unique_identifier",
              text: "Some text from your back-end.",
            },
          },
        ],
      },
    });
    return;
  }

  // Fallback: re-show the welcome text for any other input.
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

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the user-defined responses example.
 *
 * Demonstrates: how a `customSendMessage` handler emits a
 * `MessageResponseTypes.USER_DEFINED` message that the host page can
 * intercept via `renderUserDefinedResponse` to render its own DOM.
 *
 * APIs exercised:
 *   - `customSendMessage` (PublicConfig.messaging)
 *   - `instance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT` / `MessageResponseTypes.USER_DEFINED`
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

Type \`user_defined\` to receive a custom response that is rendered by your own DOM via the \`renderUserDefinedResponse\` callback. The example also tracks the most recent response via the \`activeResponseId\` state, demonstrated by the "Is this the most recent message?" line in the rendered card.
`;

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // The chat fires an empty-text request on first open so the example can seed a welcome message before any user input.
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

  // The literal "user_defined" keyword is the trigger this example uses to exercise the USER_DEFINED render path.
  if (request.input.text === "user_defined") {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: {
              // Matches the discriminator checked inside `renderUserDefinedCallback` so only this example's items are claimed.
              user_defined_type: "my_unique_identifier",
              text: "This is text from the server placed into a user_defined response.",
            },
          },
        ],
      },
    });
    return;
  }

  // Fallback so any unrecognized input still produces a visible response and re-surfaces the usage hint.
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

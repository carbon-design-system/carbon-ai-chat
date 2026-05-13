/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the history-user-defined-responses example.
 *
 * Demonstrates: emitting a new `MessageResponseTypes.USER_DEFINED` message
 * on demand so users can watch the active highlight move from the
 * pre-loaded third history card to the freshly-sent card.
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

const HINT_TEXT = `Three \`user_defined\` cards were pre-loaded from \`customLoadHistory\`. Only the last card reads "Is this the most recent message? Yes".

Type \`user_defined\` to send a new card and watch the active highlight move to it.`;

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // Empty text fires once on first open; the rehydrated history is the welcome here, so no extra message is added.
  if (request.input.text === "") {
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
          text: HINT_TEXT,
        },
      ],
    },
  });
}

export { customSendMessage };

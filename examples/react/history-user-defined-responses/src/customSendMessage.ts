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
              text: "A live user_defined card sent via customSendMessage.",
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

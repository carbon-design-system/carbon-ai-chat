/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock `customSendMessage` for the Watch state example.
 *
 * Demonstrates: a minimal `messaging.customSendMessage` that lets the host
 * drive `homeScreenState.isHomeScreenOpen` transitions (sending a message
 * leaves the homescreen, returning home re-opens it) so the parent demo can
 * observe `BusEventType.STATE_CHANGE` traffic.
 *
 * APIs exercised:
 *   - `MessageRequest`, `CustomSendMessageOptions`, `ChatInstance`
 *   - `instance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: `customSendMessage`.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

// Replace with a real production implementation.
const WELCOME_TEXT = `Welcome! This example demonstrates watching ChatInstance state changes.

Try sending a message to see the chat view, or click the home icon to see the homescreen view.`;

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // An empty input string is the synthetic "welcome" send the chat issues on
  // first open; emit the orientation copy instead of routing to a backend.
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

  // Stand-in reply for any user turn so the host can observe the homescreen
  // -> chat-view state transition without a live backend.
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "That is super great!",
        },
      ],
    },
  });
}

export { customSendMessage };

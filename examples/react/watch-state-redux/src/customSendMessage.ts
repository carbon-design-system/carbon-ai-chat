/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock `customSendMessage` for the Watch state (Redux Toolkit) example.
 *
 * Demonstrates: a minimal `messaging.customSendMessage` whose only job is to
 * trigger `homeScreenState.isHomeScreenOpen` transitions (sending a message
 * leaves the homescreen, returning home re-opens it). Each transition emits a
 * `BusEventType.STATE_CHANGE` event that the Redux bridge mirrors into the
 * store, so the host UI flips between "Homescreen" and "Chat View".
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
const WELCOME_TEXT = `Welcome! This example mirrors ChatInstance state into a Redux Toolkit store.

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
  // -> chat-view STATE_CHANGE transition flowing into Redux.
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

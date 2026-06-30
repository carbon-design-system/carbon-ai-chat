/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the watch-state example.
 *
 * Demonstrates: serving a static welcome response and a canned reply so the
 * host UI has chat traffic to drive view transitions between the homescreen
 * and the chat view, which the `BusEventType.STATE_CHANGE` listener mirrors.
 *
 * APIs exercised:
 *   - `customSendMessage` (PublicConfig.messaging hook)
 *   - `instance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: the `customSendMessage` function below.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const WELCOME_TEXT = `Welcome! This example demonstrates watching ChatInstance state changes.

Try sending a message to see the chat view, or click the home icon to see the homescreen view.`;

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const inputText = (request.input.text || "").trim().toLowerCase();

  // Empty input fires on chat open; respond with the welcome copy.
  if (!inputText) {
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

  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "That is super great.",
        },
      ],
    },
  });
}

export { customSendMessage };

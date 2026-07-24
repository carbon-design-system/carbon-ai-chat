/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock `customSendMessage` for the chain-of-thought example.
 *
 * Demonstrates: replying to every user turn with a chain-of-thought tool
 * trace attached to the final response.
 *
 * APIs exercised:
 *   - `customSendMessage`
 *   - `instance.messaging.addMessage`
 *   - `CustomSendMessageOptions.signal`
 *
 * Start reading at: `customSendMessage` at the bottom of this file.
 */

import {
  MessageResponseTypes,
  type ChatInstance,
  type CustomSendMessageOptions,
  type MessageRequest,
} from "@carbon/ai-chat";

import { runChainOfThoughtScenario } from "./scenarios";

const WELCOME_TEXT = `This example shows chain-of-thought tool traces in Carbon AI Chat.

Send any message to see the assistant reply with a \`chain_of_thought\` array on the final response. Open the chain-of-thought drawer to inspect each tool call's request, response, and status.`;

async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // Empty input is dispatched on first open as the welcome handshake — reply
  // with help text instead of running the chain-of-thought scenario.
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

  await runChainOfThoughtScenario(instance, requestOptions.signal);
}

export { customSendMessage };

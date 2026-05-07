/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the reasoning-steps-controlled example.
 *
 * Demonstrates: replying to every user turn with the controlled reasoning
 * scenario, where the host owns the in-progress affordance via
 * `instance.updateIsMessageLoadingCounter` and the parent reasoning panel
 * stays collapsed until the user opens it.
 *
 * APIs exercised:
 *   - `customSendMessage`
 *   - `instance.messaging.addMessage`
 *   - `CustomSendMessageOptions.signal`
 *
 * Start reading at: `customSendMessage()`.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

import { runControlledReasoningScenario } from "./scenarios";

const WELCOME_TEXT = `This example shows controlled reasoning-step open state in Carbon AI Chat.

Send any message to see a custom "Thinking..." indicator (driven by \`updateIsMessageLoadingCounter\`) replace the default reasoning UI. The reasoning panel stays collapsed until the user opens it, and every step inside is pre-expanded.`;

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // Empty input is dispatched on first open as the welcome handshake — reply
  // with help text instead of running the reasoning scenario.
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

  await runControlledReasoningScenario(instance, requestOptions.signal);
}

export { customSendMessage };

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the upsert-message-reasoning-steps-controlled example.
 *
 * Demonstrates: replying to every user turn with the controlled reasoning
 * scenario, where the host owns the in-progress affordance via
 * `instance.updateIsMessageLoadingCounter` and the parent reasoning panel
 * stays collapsed until the user opens it. The static welcome is delivered
 * through `upsertMessage` — a brand-new COMPLETE insert under a fresh
 * `messageID` fires `receive` once, exactly like the `addMessage` it replaces.
 *
 * APIs exercised:
 *   - `customSendMessage`
 *   - `instance.messaging.upsertMessage`
 *   - `MessageState.COMPLETE`
 *   - `CustomSendMessageOptions.signal`
 *
 * Start reading at: `customSendMessage()`.
 */

import {
  ButtonItemType,
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
  MessageState,
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

import { runControlledReasoningScenario } from "./scenarios";

const WELCOME_TEXT = `This example shows controlled reasoning-step open state in Carbon AI Chat.

Send any message to see a custom "Thinking..." indicator (driven by \`updateIsMessageLoadingCounter\`) replace the default reasoning UI. The reasoning panel stays collapsed until the user opens it, and every step inside is pre-expanded.`;

// The welcome button posts back this string; `customSendMessage` runs the
// scenario for any non-empty input. `silent` keeps the trigger message out of
// the visible transcript.
const START_TRIGGER = "Show me the reasoning demo";

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // Empty input is dispatched on first open as the welcome handshake — reply
  // with help text plus a post-back button instead of running the reasoning
  // scenario. A fresh `messageID` per call keeps repeated welcomes from
  // colliding; COMPLETE makes it a one-shot insert.
  if (request.input.text === "") {
    await instance.messaging.upsertMessage(
      uuid(),
      MessageState.COMPLETE,
      () => ({
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: WELCOME_TEXT,
            },
            {
              response_type: MessageResponseTypes.BUTTON,
              button_type: ButtonItemType.POST_BACK,
              label: "Send a message to see example",
              value: { input: { text: START_TRIGGER } },
              silent: true,
            },
          ],
        },
      }),
    );
    return;
  }

  await runControlledReasoningScenario(instance, requestOptions.signal);
}

export { customSendMessage };

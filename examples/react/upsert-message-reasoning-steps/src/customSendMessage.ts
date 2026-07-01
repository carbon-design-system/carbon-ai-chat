/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the upsert-message-reasoning-steps example.
 *
 * Demonstrates: routing the dropdown selection from the welcome message to
 * either the default reasoning-steps runner or the long-form reasoning-content
 * runner. The static welcome itself is delivered through `upsertMessage` — a
 * brand-new COMPLETE insert under a fresh `messageID` fires `receive` once,
 * exactly like the `addMessage` it replaces.
 *
 * APIs exercised:
 *   - `customSendMessage`
 *   - `instance.messaging.upsertMessage`
 *   - `MessageState.COMPLETE`
 *   - `MessageResponseTypes.OPTION`
 *   - `OptionItemPreference.DROPDOWN`
 *
 * Start reading at: `customSendMessage()`.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
  MessageState,
  OptionItemPreference,
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

import {
  ScenarioKey,
  runReasoningContentScenario,
  runReasoningStepsScenario,
  scenarioOptions,
  scenarios,
} from "./scenarios";

const WELCOME_TEXT = `This example shows reasoning-step streaming patterns in Carbon AI Chat.

Choose a scenario from the dropdown below: discrete reasoning steps, or a single long-form reasoning trace.`;

function isScenarioKey(value: string): value is ScenarioKey {
  return Object.prototype.hasOwnProperty.call(scenarios, value);
}

function sendWelcome(instance: ChatInstance) {
  // A fresh `messageID` per call means repeated welcomes never collide; COMPLETE
  // makes this a one-shot insert (the chat assigns the id to the returned
  // message since it has none of its own).
  return instance.messaging.upsertMessage(
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
            response_type: MessageResponseTypes.OPTION,
            title: "Pick a reasoning demo",
            description:
              "Each option streams reasoning differently. You can edit the text for each scenario in src/scenarios.ts.",
            preference: OptionItemPreference.DROPDOWN,
            options: scenarioOptions.map((option) => ({
              label: option.label,
              value: { input: { text: option.value } },
            })),
          },
        ],
      },
    }),
  );
}

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const trimmedText = request.input.text?.trim() ?? "";

  // Treat the dropdown's selected value as a scenario key rather than free-form chat input.
  if (isScenarioKey(trimmedText)) {
    switch (trimmedText) {
      case "Reasoning steps":
        await runReasoningStepsScenario(instance, requestOptions.signal);
        return;
      case "Reasoning content":
        await runReasoningContentScenario(instance, requestOptions.signal);
        return;
      default:
        break;
    }
  }

  await sendWelcome(instance);
}

export { customSendMessage };

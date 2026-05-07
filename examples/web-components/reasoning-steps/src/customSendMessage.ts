/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock `customSendMessage` router for the reasoning-steps example.
 *
 * Demonstrates: dispatching user input to either the discrete reasoning-steps
 * runner or the long-form reasoning-content runner, and surfacing a dropdown
 * of those scenarios on first load.
 *
 * APIs exercised:
 *   - `instance.messaging.addMessage` (welcome + dropdown options)
 *   - `MessageResponseTypes.OPTION` with `OptionItemPreference.DROPDOWN`
 *   - The two scenario runners exported from `./scenarios.ts`.
 *
 * Start reading at: `customSendMessage` at the bottom of this file.
 */

import {
  MessageResponseTypes,
  OptionItemPreference,
  type ChatInstance,
  type CustomSendMessageOptions,
  type MessageRequest,
} from "@carbon/ai-chat";
import {
  scenarios,
  scenarioOptions,
  runReasoningContentScenario,
  runReasoningStepsScenario,
  ScenarioKey,
} from "./scenarios";

const WELCOME_TEXT = `This example shows reasoning-step streaming patterns in Carbon AI Chat.

Choose a scenario from the dropdown to see discrete reasoning steps or a single long-form reasoning trace.`;

// The dropdown sends the literal scenario key as the next user message, so we
// narrow the raw string back into a `ScenarioKey` before dispatching.
function isScenarioKey(value: string): value is ScenarioKey {
  return Object.prototype.hasOwnProperty.call(scenarios, value);
}

function sendWelcome(instance: ChatInstance) {
  // Replace with a real production implementation. This seeds the conversation
  // with a static welcome plus a dropdown listing every demo scenario.
  instance.messaging.addMessage({
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
          // Each option submits its key as `input.text`, which the dispatcher
          // below matches against `scenarios` to pick a runner.
          options: scenarioOptions.map((option) => ({
            label: option.label,
            value: { input: { text: option.value } },
          })),
        },
      ],
    },
  });
}

async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const trimmedText = request.input.text?.trim() ?? "";

  // Only dispatch into a scenario when the input exactly matches a known key;
  // every other input falls through to the welcome dropdown.
  if (isScenarioKey(trimmedText)) {
    switch (trimmedText) {
      case "Reasoning steps":
        // Forward the host abort signal so the runner can cancel mid-stream
        // when the user stops the response.
        await runReasoningStepsScenario(instance, requestOptions.signal);
        return;
      case "Reasoning content":
        await runReasoningContentScenario(instance, requestOptions.signal);
        return;
      default:
        break;
    }
  }

  sendWelcome(instance);
}

export { customSendMessage };

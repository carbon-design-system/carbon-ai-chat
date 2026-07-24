/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Controlled reasoning-steps scenario for the reasoning-steps-controlled example.
 *
 * Demonstrates: keeping the parent reasoning panel collapsed via
 * `reasoning.open_state: CLOSE` while marking each individual step `OPEN`, and
 * surfacing a custom "Thinking..." indicator through
 * `instance.updateIsMessageLoadingCounter` instead of the default reasoning UI.
 *
 * APIs exercised:
 *   - `instance.messaging.addMessageChunk`
 *   - `instance.updateIsMessageLoadingCounter`
 *   - `ReasoningStep`, `ReasoningStepOpenState`
 *   - `MessageResponseOptions.reasoning`
 *
 * Start reading at: `runControlledReasoningScenario()`.
 */

import type { ChatInstance } from "@carbon/ai-chat";
import {
  MessageResponseTypes,
  ReasoningStepOpenState,
  type MessageResponseOptions,
  type ReasoningStep,
  type StreamChunk,
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

const FINAL_TEXT =
  "This *controlled* reasoning example is set to keep all reasoning steps closed by default with a loading indicator visible instead.";

// Replace with a real production implementation. These steps stand in for what
// a model server would emit as it streams its reasoning trace.
const REASONING_STEPS = [
  {
    title: "Read the user request",
    content:
      "Scanning the prompt and preparing to choose a relevant example response.",
  },
  {
    title: "Pick a scenario",
    content:
      "Selecting the reasoning flow that matches the provided dropdown choice.",
  },
  {
    title: "Considering options",
  },
  {
    title: "Fetching data",
    content: `Calling the retrieval service for supporting facts:
\`\`\`json
{
  "endpoint": "/mock/retrieve",
  "results": [
    { "id": "doc-123", "score": 0.91 },
    { "id": "doc-456", "score": 0.88 }
  ]
}
\`\`\``,
  },
  {
    title: "Prepare the response",
  },
];

const TEXT_STREAM_ID = "text-1";
const WORD_DELAY = 40;
const REASONING_STEP_DELAY = 3000;

async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function createShellMessage(
  instance: ChatInstance,
  responseID: string,
  messageOptions?: MessageResponseOptions,
) {
  // Seed the message with an empty streaming text item so the shell exists before reasoning steps stream in.
  instance.messaging.addMessageChunk({
    partial_item: {
      response_type: MessageResponseTypes.TEXT,
      text: "",
      streaming_metadata: { id: TEXT_STREAM_ID },
    },
    partial_response: {
      message_options: messageOptions,
    },
    streaming_metadata: { response_id: responseID },
  });
}

function pushMessageOptions(
  instance: ChatInstance,
  responseID: string,
  messageOptions: MessageResponseOptions,
) {
  instance.messaging.addMessageChunk({
    partial_item: {
      response_type: MessageResponseTypes.TEXT,
      text: "",
      streaming_metadata: { id: TEXT_STREAM_ID, cancellable: true },
    },
    partial_response: { message_options: messageOptions },
    streaming_metadata: { response_id: responseID },
  } as StreamChunk);
}

async function streamText(
  instance: ChatInstance,
  responseID: string,
  text: string,
  signal?: AbortSignal,
  finalMessageOptions?: MessageResponseOptions,
) {
  const words = text.split(" ");
  let isCanceled = false;
  const timeouts: number[] = [];

  // The abort handler must clear every queued setTimeout because each word is
  // scheduled up front rather than chained sequentially; otherwise stopping the
  // response would leave residual chunks streaming in after cancellation.
  const abortHandler = () => {
    isCanceled = true;
    timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  };
  signal?.addEventListener("abort", abortHandler);

  try {
    words.forEach((word, index) => {
      const timeoutId = setTimeout(() => {
        if (!isCanceled) {
          instance.messaging.addMessageChunk({
            partial_item: {
              response_type: MessageResponseTypes.TEXT,
              text: `${word} `,
              streaming_metadata: { id: TEXT_STREAM_ID, cancellable: true },
            },
            streaming_metadata: { response_id: responseID },
          });
        }
      }, index * WORD_DELAY);
      timeouts.push(timeoutId as unknown as number);
    });

    await sleep(words.length * WORD_DELAY);

    if (!isCanceled) {
      const completeItem = {
        response_type: MessageResponseTypes.TEXT,
        text,
        streaming_metadata: { id: TEXT_STREAM_ID },
      };
      instance.messaging.addMessageChunk({
        complete_item: completeItem,
        streaming_metadata: { response_id: responseID },
      });

      const finalResponse: StreamChunk = {
        final_response: {
          id: responseID,
          output: { generic: [completeItem] },
        },
      };

      if (finalMessageOptions) {
        finalResponse.final_response.message_options = finalMessageOptions;
      }

      instance.messaging.addMessageChunk(finalResponse);
    }
  } finally {
    signal?.removeEventListener("abort", abortHandler);
  }
}

export async function runControlledReasoningScenario(
  instance: ChatInstance,
  signal?: AbortSignal,
) {
  const responseID = uuid();

  const collectedSteps: ReasoningStep[] = [];

  createShellMessage(instance, responseID, { reasoning: { steps: [] } });

  // Show a custom loading label instead of the default reasoning-step UI so
  // the host owns the in-progress affordance for this controlled scenario.
  instance.updateIsMessageLoadingCounter("increase", "Thinking...");

  for (const step of REASONING_STEPS) {
    // Per-step `open_state: OPEN` marks each individual step as expanded, but
    // the parent `open_state: CLOSE` below keeps the entire reasoning panel
    // collapsed. Together they mean "if the user opens the panel, every step
    // inside is already expanded" — the controlled flow this scenario showcases.
    collectedSteps.push({
      ...step,
      open_state: ReasoningStepOpenState.OPEN,
    });
    pushMessageOptions(instance, responseID, {
      reasoning: {
        open_state: ReasoningStepOpenState.CLOSE,
        steps: collectedSteps,
      },
    });
    // Update the loading label in place to reflect the current step title
    // without nudging the counter (passing `undefined` leaves the count alone).
    instance.updateIsMessageLoadingCounter(undefined, `${step.title}...`);
    await sleep(REASONING_STEP_DELAY);
  }

  // Drop the loading indicator before streaming the final user-facing text so
  // the assistant message replaces the "Thinking..." affordance cleanly.
  instance.updateIsMessageLoadingCounter("decrease");

  // Keep asserting the parent `open_state: CLOSE` on the final snapshot too, so
  // the message stays in controlled mode at completion. Dropping it would flip
  // the panel to auto mode and desync its open/closed state after the user has
  // toggled it mid-stream.
  await streamText(instance, responseID, FINAL_TEXT, signal, {
    reasoning: {
      open_state: ReasoningStepOpenState.CLOSE,
      steps: collectedSteps,
    },
  });
}

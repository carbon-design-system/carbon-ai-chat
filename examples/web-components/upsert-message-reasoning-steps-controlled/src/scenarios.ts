/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Controlled reasoning-steps scenario for the
 * upsert-message-reasoning-steps-controlled example.
 *
 * Demonstrates: keeping the parent reasoning panel collapsed via
 * `reasoning.open_state: CLOSE` while marking each individual step `OPEN`, and
 * surfacing a custom "Thinking..." indicator through
 * `instance.updateIsMessageLoadingCounter` — all delivered through
 * `upsertMessage`. Each update returns a full `MessageResponse` snapshot under a
 * stable `messageID`; the chat replaces the stored message in place rather than
 * appending, so the streamed text is accumulated locally and the
 * `message_options.reasoning` payload is re-sent on every call.
 *
 * APIs exercised:
 *   - `instance.messaging.upsertMessage`
 *   - `MessageState` (STREAMING while producing, COMPLETE on the final call)
 *   - `instance.updateIsMessageLoadingCounter`
 *   - `ReasoningStep`, `ReasoningStepOpenState`
 *   - `MessageResponseOptions.reasoning`
 *
 * Start reading at: `runControlledReasoningScenario()`.
 */

import type { ChatInstance } from "@carbon/ai-chat";
import {
  MessageResponseTypes,
  MessageState,
  ReasoningStepOpenState,
  type MessageResponse,
  type MessageResponseOptions,
  type ReasoningStep,
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

// Build the full MessageResponse snapshot every upsert applies. Unlike the
// chunk flow, `upsertMessage` replaces the stored message wholesale, so the
// entire text and `message_options.reasoning` payload must be present on each
// call. Keeping `streaming_metadata.id` stable preserves the text item's
// identity across updates; `cancellable` controls the stop-streaming button.
function buildSnapshot(
  responseID: string,
  text: string,
  messageOptions: MessageResponseOptions,
  cancellable: boolean,
): MessageResponse {
  return {
    id: responseID,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text,
          streaming_metadata: cancellable
            ? { id: TEXT_STREAM_ID, cancellable: true }
            : { id: TEXT_STREAM_ID },
        },
      ],
    },
    message_options: messageOptions,
  };
}

function createShellMessage(
  instance: ChatInstance,
  responseID: string,
  messageOptions?: MessageResponseOptions,
) {
  // First upsert is STREAMING: seed an empty-text shell so the message exists
  // before reasoning updates arrive.
  return instance.messaging.upsertMessage(
    responseID,
    MessageState.STREAMING,
    () => buildSnapshot(responseID, "", messageOptions ?? {}, false),
  );
}

function pushMessageOptions(
  instance: ChatInstance,
  responseID: string,
  messageOptions: MessageResponseOptions,
) {
  // STREAMING upsert that advances `message_options.reasoning` while the
  // user-facing text is still empty.
  return instance.messaging.upsertMessage(
    responseID,
    MessageState.STREAMING,
    () => buildSnapshot(responseID, "", messageOptions, true),
  );
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
  let accumulated = "";
  const timeouts: number[] = [];

  // The abort handler must clear every queued `setTimeout` because each word
  // is scheduled up front rather than chained sequentially; otherwise stopping
  // the response would leave residual upserts applying after cancellation.
  const abortHandler = () => {
    isCanceled = true;
    timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  };
  signal?.addEventListener("abort", abortHandler);

  try {
    words.forEach((word, index) => {
      const timeoutId = setTimeout(() => {
        if (!isCanceled) {
          accumulated += `${word} `;
          // Capture the text for this tick so the updater renders this word's
          // snapshot even if the serialized upserts apply slightly later.
          const snapshotText = accumulated;
          // Each snapshot replaces the stored message, so re-send the reasoning
          // `message_options` alongside the growing text or the panel would
          // disappear the moment the answer starts streaming.
          void instance.messaging.upsertMessage(
            responseID,
            MessageState.STREAMING,
            () =>
              buildSnapshot(
                responseID,
                snapshotText,
                finalMessageOptions ?? {},
                true,
              ),
          );
        }
      }, index * WORD_DELAY);
      timeouts.push(timeoutId as unknown as number);
    });

    await sleep(words.length * WORD_DELAY);

    if (!isCanceled) {
      // Final upsert transitions STREAMING -> COMPLETE, which fires `receive`
      // exactly once — the same transition the chunk flow's final_response made.
      await instance.messaging.upsertMessage(
        responseID,
        MessageState.COMPLETE,
        () => buildSnapshot(responseID, text, finalMessageOptions ?? {}, false),
      );
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

  await createShellMessage(instance, responseID, { reasoning: { steps: [] } });

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
    await pushMessageOptions(instance, responseID, {
      reasoning: {
        open_state: ReasoningStepOpenState.CLOSE,
        steps: [...collectedSteps],
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

  // Keep asserting the parent `open_state: CLOSE` on the final snapshot too.
  // Dropping it here would flip the message out of controlled mode at
  // completion, desyncing the panel's open/closed state so the user could no
  // longer collapse it after opening it mid-stream.
  await streamText(instance, responseID, FINAL_TEXT, signal, {
    reasoning: {
      open_state: ReasoningStepOpenState.CLOSE,
      steps: [...collectedSteps],
    },
  });
}

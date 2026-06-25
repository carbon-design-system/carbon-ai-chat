/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Reasoning scenarios for the upsert-message-reasoning-steps example.
 *
 * Demonstrates: two mocked streaming flows — default reasoning steps emitted
 * as discrete `ReasoningStep` items, and a single long-form `reasoning.content`
 * trace — both delivered through `upsertMessage`. Each update returns a full
 * `MessageResponse` snapshot under a stable `messageID`; the chat replaces the
 * stored message in place rather than appending, so the streamed text is
 * accumulated locally and the `message_options.reasoning` payload is re-sent on
 * every call.
 *
 * APIs exercised:
 *   - `instance.messaging.upsertMessage`
 *   - `MessageState` (STREAMING while producing, COMPLETE on the final call)
 *   - `ReasoningStep`
 *   - `MessageResponseOptions.reasoning.steps`
 *   - `MessageResponseOptions.reasoning.content`
 *
 * Start reading at: `runReasoningStepsScenario` for the discrete-steps flow.
 */

import type { ChatInstance } from "@carbon/ai-chat";
import {
  MessageResponseTypes,
  MessageState,
  type MessageResponse,
  type MessageResponseOptions,
  type ReasoningStep,
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

export const scenarios = {
  "Reasoning steps": {
    text: "Reasoning steps will auto-open while the model provides reasoning steps, and then auto-open the active reasoning step.\n\nIt will then hide once user-facing content starts streaming back.\n\nThis is the default behavior.",
  },
  "Reasoning content": {
    text: "Reasoning content can stream in as a single trace without individual steps. Use this when you want a long-form rationale instead of expandable steps.",
  },
};

export type ScenarioKey = keyof typeof scenarios;

export const scenarioOptions = Object.keys(scenarios).map((key) => {
  return { label: key, value: key };
});

// Replace with a real production implementation. These steps stand in for
// what a model server would emit as it streams its reasoning trace.
const REASONING_STEPS = [
  {
    title: "Read the user request",
    content: `Scanning the prompt to classify intent and pull out any parameters before choosing an example response.

Parsed request:
\`\`\`json
{
  "intent": "run_example",
  "channel": "dropdown",
  "selection": "reasoning-steps"
}
\`\`\``,
  },
  {
    title: "Pick a scenario",
    content: `Matching the parsed selection against the registered demo scenarios and resolving the handler to invoke.

\`\`\`ts
const scenario = SCENARIOS[selection] ?? SCENARIOS.default;
await scenario.run({ signal });
\`\`\``,
  },
  {
    // Intentionally left without content to demonstrate the no-body step state.
    title: "Considering options",
  },
  {
    title: "Fetching data",
    content: `Calling the retrieval service for supporting facts, then normalizing the hits before ranking them.

Request:
\`\`\`json
{
  "endpoint": "/mock/retrieve",
  "results": [
    { "id": "doc-123", "score": 0.91 },
    { "id": "doc-456", "score": 0.88 }
  ]
}
\`\`\`

Ranking:
\`\`\`ts
const ranked = results
  .map((hit) => ({ ...hit, weight: hit.score * SOURCE_BOOST[hit.id] }))
  .sort((a, b) => b.weight - a.weight);
\`\`\``,
  },
  {
    title: "Prepare the response",
    content: `Assembling the final answer from the ranked sources and formatting it for display.

\`\`\`ts
return {
  response_type: "text",
  text: render(template, { sources: ranked }),
};
\`\`\``,
  },
];

const REASONING_TRACE_CONTENT = REASONING_STEPS.map(
  (step) => step.content || step.title,
).join("\n\n");

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

async function streamReasoningContentFirst(
  instance: ChatInstance,
  responseID: string,
  content: string,
  signal?: AbortSignal,
) {
  const tokens = content.match(/\S+\s*/g) ?? [content];
  let isCanceled = false;
  // Sequential await loop, so a single flag is sufficient — the next token
  // will short-circuit before scheduling further sleeps.
  const abortHandler = () => {
    isCanceled = true;
  };

  signal?.addEventListener("abort", abortHandler);

  try {
    let partial = "";
    for (const token of tokens) {
      if (isCanceled) {
        break;
      }
      partial += token;
      await pushMessageOptions(instance, responseID, {
        reasoning: { content: partial },
      });
      await sleep(WORD_DELAY);
    }
  } finally {
    signal?.removeEventListener("abort", abortHandler);
  }

  return !isCanceled;
}

export async function runReasoningStepsScenario(
  instance: ChatInstance,
  signal?: AbortSignal,
) {
  const responseID = uuid();
  const collectedSteps: ReasoningStep[] = [];

  await createShellMessage(instance, responseID, { reasoning: { steps: [] } });

  for (const step of REASONING_STEPS) {
    collectedSteps.push(step);
    await pushMessageOptions(instance, responseID, {
      reasoning: { steps: [...collectedSteps] },
    });
    await sleep(REASONING_STEP_DELAY);
  }

  await streamText(
    instance,
    responseID,
    scenarios["Reasoning steps"].text,
    signal,
    { reasoning: { steps: [...collectedSteps] } },
  );
}

export async function runReasoningContentScenario(
  instance: ChatInstance,
  signal?: AbortSignal,
) {
  const responseID = uuid();

  await createShellMessage(instance, responseID, {
    reasoning: { content: "" },
  });

  const completed = await streamReasoningContentFirst(
    instance,
    responseID,
    REASONING_TRACE_CONTENT,
    signal,
  );

  if (!completed) {
    return;
  }

  await streamText(
    instance,
    responseID,
    scenarios["Reasoning content"].text,
    signal,
    { reasoning: { content: REASONING_TRACE_CONTENT } },
  );
}

export async function runScenario(
  scenario: ScenarioKey,
  instance: ChatInstance,
  signal?: AbortSignal,
) {
  switch (scenario) {
    case "Reasoning steps":
      await runReasoningStepsScenario(instance, signal);
      return;
    case "Reasoning content":
      await runReasoningContentScenario(instance, signal);
      return;
    default:
      return;
  }
}

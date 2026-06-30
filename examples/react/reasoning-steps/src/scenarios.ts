/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Reasoning scenarios for the reasoning-steps example.
 *
 * Demonstrates: two mocked streaming flows — default reasoning steps emitted
 * as discrete `ReasoningStep` items, and a single long-form `reasoning.content`
 * trace — both delivered through `addMessageChunk`.
 *
 * APIs exercised:
 *   - `instance.messaging.addMessageChunk`
 *   - `ReasoningStep`
 *   - `MessageResponseOptions.reasoning.steps`
 *   - `MessageResponseOptions.reasoning.content`
 *
 * Start reading at: `runReasoningStepsScenario()`.
 */

import type { ChatInstance } from "@carbon/ai-chat";
import {
  MessageResponseTypes,
  type MessageResponseOptions,
  type ReasoningStep,
  type StreamChunk,
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

// Replace with a real production implementation.
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
      pushMessageOptions(instance, responseID, {
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

  createShellMessage(instance, responseID, { reasoning: { steps: [] } });

  for (const step of REASONING_STEPS) {
    collectedSteps.push(step);
    pushMessageOptions(instance, responseID, {
      reasoning: { steps: collectedSteps },
    });
    await sleep(REASONING_STEP_DELAY);
  }

  await streamText(
    instance,
    responseID,
    scenarios["Reasoning steps"].text,
    signal,
    { reasoning: { steps: collectedSteps } },
  );
}

export async function runReasoningContentScenario(
  instance: ChatInstance,
  signal?: AbortSignal,
) {
  const responseID = uuid();

  createShellMessage(instance, responseID, { reasoning: { content: "" } });

  const completed = await streamReasoningContentFirst(
    instance,
    responseID,
    REASONING_TRACE_CONTENT,
    signal,
  );

  // Bail out before streaming the user-facing answer if the request was aborted mid-reasoning.
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

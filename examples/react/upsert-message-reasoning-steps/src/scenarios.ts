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
 * Start reading at: `runReasoningStepsScenario()`.
 */

import type { ChatInstance } from '@carbon/ai-chat';
import {
  MessageResponseTypes,
  MessageState,
  type MessageResponse,
  type MessageResponseOptions,
  type ReasoningStep,
} from '@carbon/ai-chat';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';

// Replace with a real production implementation.
export const scenarios = {
  'Reasoning steps': {
    text: 'Reasoning steps will auto-open while the model provides reasoning steps, and then auto-open the active reasoning step.\n\nIt will then hide once user-facing content starts streaming back.\n\nThis is the default behavior.',
  },
  'Reasoning content': {
    text: 'Reasoning content can stream in as a single trace without individual steps. Use this when you want a long-form rationale instead of expandable steps.',
  },
};

export type ScenarioKey = keyof typeof scenarios;

export const scenarioOptions = Object.keys(scenarios).map((key) => {
  return { label: key, value: key };
});

const REASONING_STEPS = [
  {
    title: 'Read the user request',
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
    title: 'Pick a scenario',
    content: `Matching the parsed selection against the registered demo scenarios and resolving the handler to invoke.

\`\`\`ts
const scenario = SCENARIOS[selection] ?? SCENARIOS.default;
await scenario.run({ signal });
\`\`\``,
  },
  {
    // Intentionally left without content to demonstrate the no-body step state.
    title: 'Considering options',
  },
  {
    title: 'Fetching data',
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
    title: 'Prepare the response',
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
  (step) => step.content || step.title
).join('\n\n');

const TEXT_STREAM_ID = 'text-1';
const WORD_DELAY = 40;
const REASONING_STEP_DELAY = 3000;

// Resolve as soon as Stop aborts the request, and remove the timer and listener.
function sleep(milliseconds: number, signal?: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }
    const finish = (completed: boolean) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(completed);
    };
    const onAbort = () => finish(false);
    const timer = setTimeout(() => finish(true), milliseconds);
    signal?.addEventListener('abort', onAbort, { once: true });
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
  cancellable: boolean
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

async function pushMessageOptions(
  instance: ChatInstance,
  responseID: string,
  messageOptions: MessageResponseOptions,
  signal?: AbortSignal
) {
  if (signal?.aborted) {
    return;
  }
  // STREAMING upsert that advances `message_options.reasoning` while the
  // user-facing text is still empty.
  await instance.messaging.upsertMessage(
    responseID,
    MessageState.STREAMING,
    () => buildSnapshot(responseID, '', messageOptions, true)
  );
}

async function streamText(
  instance: ChatInstance,
  responseID: string,
  text: string,
  signal?: AbortSignal,
  finalMessageOptions?: MessageResponseOptions
) {
  let accumulated = '';
  for (const word of text.split(' ')) {
    if (signal?.aborted) {
      return;
    }
    accumulated += `${word} `;
    // Await each write so Stop cannot leave queued word updates behind it.
    await instance.messaging.upsertMessage(
      responseID,
      MessageState.STREAMING,
      () =>
        buildSnapshot(responseID, accumulated, finalMessageOptions ?? {}, true)
    );
    if (!(await sleep(WORD_DELAY, signal))) {
      return;
    }
  }
  if (signal?.aborted) {
    return;
  }
  await instance.messaging.upsertMessage(
    responseID,
    MessageState.COMPLETE,
    () => buildSnapshot(responseID, text, finalMessageOptions ?? {}, false)
  );
}

async function streamReasoningContentFirst(
  instance: ChatInstance,
  responseID: string,
  content: string,
  signal?: AbortSignal
) {
  let partial = '';
  for (const token of content.match(/\S+\s*/g) ?? [content]) {
    if (signal?.aborted) {
      return false;
    }
    partial += token;
    await pushMessageOptions(
      instance,
      responseID,
      {
        reasoning: { content: partial },
      },
      signal
    );
    if (!(await sleep(WORD_DELAY, signal))) {
      return false;
    }
  }
  return !signal?.aborted;
}

export async function runReasoningStepsScenario(
  instance: ChatInstance,
  signal?: AbortSignal
) {
  if (signal?.aborted) {
    return;
  }
  const responseID = uuid();
  const collectedSteps: ReasoningStep[] = [];
  await pushMessageOptions(
    instance,
    responseID,
    { reasoning: { steps: [] } },
    signal
  );

  for (const step of REASONING_STEPS) {
    if (signal?.aborted) {
      return;
    }
    collectedSteps.push(step);
    await pushMessageOptions(
      instance,
      responseID,
      {
        reasoning: { steps: [...collectedSteps] },
      },
      signal
    );
    if (!(await sleep(REASONING_STEP_DELAY, signal))) {
      return;
    }
  }
  await streamText(
    instance,
    responseID,
    scenarios['Reasoning steps'].text,
    signal,
    {
      reasoning: { steps: [...collectedSteps] },
    }
  );
}

export async function runReasoningContentScenario(
  instance: ChatInstance,
  signal?: AbortSignal
) {
  if (signal?.aborted) {
    return;
  }
  const responseID = uuid();
  await pushMessageOptions(
    instance,
    responseID,
    {
      reasoning: { content: '' },
    },
    signal
  );
  const completed = await streamReasoningContentFirst(
    instance,
    responseID,
    REASONING_TRACE_CONTENT,
    signal
  );
  if (!completed || signal?.aborted) {
    return;
  }
  await streamText(
    instance,
    responseID,
    scenarios['Reasoning content'].text,
    signal,
    {
      reasoning: { content: REASONING_TRACE_CONTENT },
    }
  );
}

export async function runScenario(
  scenario: ScenarioKey,
  instance: ChatInstance,
  signal?: AbortSignal
) {
  switch (scenario) {
    case 'Reasoning steps':
      await runReasoningStepsScenario(instance, signal);
      return;
    case 'Reasoning content':
      await runReasoningContentScenario(instance, signal);
      return;
    default:
      return;
  }
}

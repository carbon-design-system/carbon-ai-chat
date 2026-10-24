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

import type { ChatInstance } from '@carbon/ai-chat';
import {
  MessageResponseTypes,
  MessageState,
  ReasoningStepOpenState,
  type MessageResponse,
  type MessageResponseOptions,
  type ReasoningStep,
} from '@carbon/ai-chat';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';

const FINAL_TEXT =
  'This *controlled* reasoning example is set to keep all reasoning steps closed by default with a loading indicator visible instead.';

// Replace with a real production implementation. These steps stand in for what
// a model server would emit as it streams its reasoning trace.
const REASONING_STEPS = [
  {
    title: 'Read the user request',
    content:
      'Scanning the prompt and preparing to choose a relevant example response.',
  },
  {
    title: 'Pick a scenario',
    content:
      'Selecting the reasoning flow that matches the provided dropdown choice.',
  },
  {
    title: 'Considering options',
  },
  {
    title: 'Fetching data',
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
    title: 'Prepare the response',
  },
];

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

export async function runControlledReasoningScenario(
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
  if (signal?.aborted) {
    return;
  }

  // Stop clears this run's label before another request can show its own.
  let loading = true;
  const clearLoading = () => {
    if (loading) {
      loading = false;
      instance.updateIsMessageLoadingCounter('decrease');
    }
  };
  instance.updateIsMessageLoadingCounter('increase', 'Thinking...');
  signal?.addEventListener('abort', clearLoading, { once: true });
  try {
    for (const step of REASONING_STEPS) {
      if (signal?.aborted) {
        return;
      }
      // Keep the parent closed while each step opens when the user reveals it.
      collectedSteps.push({ ...step, open_state: ReasoningStepOpenState.OPEN });
      await pushMessageOptions(
        instance,
        responseID,
        {
          reasoning: {
            open_state: ReasoningStepOpenState.CLOSE,
            steps: [...collectedSteps],
          },
        },
        signal
      );
      if (signal?.aborted) {
        return;
      }
      instance.updateIsMessageLoadingCounter(undefined, `${step.title}...`);
      if (!(await sleep(REASONING_STEP_DELAY, signal))) {
        return;
      }
    }
  } finally {
    signal?.removeEventListener('abort', clearLoading);
    clearLoading();
  }
  if (signal?.aborted) {
    return;
  }
  await streamText(instance, responseID, FINAL_TEXT, signal, {
    reasoning: {
      open_state: ReasoningStepOpenState.CLOSE,
      steps: [...collectedSteps],
    },
  });
}

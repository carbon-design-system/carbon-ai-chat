/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock back end for the Upsert message user defined example (Web components).
 *
 * Demonstrates: how `ChatInstance.messaging.upsertMessage` keeps a user_defined
 * widget mounted while its data progressively changes. Any user text replies
 * with a welcome message (a TEXT response plus a POST_BACK button); clicking
 * the button kicks off a long-running scenario that creates one assistant
 * message, keeps it STREAMING while the steps run, then marks it COMPLETE.
 * Stop aborts the background updates without blocking a fresh run.
 *
 * Multiple concurrent runs are supported — each button click generates a fresh
 * messageID, so the lifecycle coordinator parallelizes them (same-ID upserts
 * serialize, different-ID upserts run in parallel).
 *
 * APIs exercised:
 *   - `ChatInstance.messaging.upsertMessage`
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageState.STREAMING` / `MessageState.COMPLETE`
 *   - `MessageResponseTypes.TEXT` / `BUTTON` / `USER_DEFINED`
 *   - `ButtonItemType.POST_BACK`
 *   - `CustomSendMessageOptions.signal`
 *
 * Start reading at: the `customSendMessage` function near the bottom.
 */

import {
  ButtonItemType,
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  MessageState,
} from '@carbon/ai-chat';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';

// Button click posts back this exact string; `customSendMessage` branches on it
// to decide whether to start a scenario or reply with the welcome message.
const START_TRIGGER = 'Show me the upsert demo';

// Five steps and ~21s total runtime exercise progressive updates over a realistic duration.
const STEP_TIMINGS_MS = [6000, 2000, 1000, 8000, 4000];

const STEPS: ReadonlyArray<{ label: string; title: string }> = [
  { label: 'Step 1', title: 'Estimate inventory needs in all locations' },
  { label: 'Step 2', title: 'Identify locations with excess inventory' },
  { label: 'Step 3', title: 'Prepare multiple rebalancing scenarios' },
  { label: 'Step 4', title: 'Rank rebalancing scenarios for speed and cost' },
  { label: 'Step 5', title: 'Prepare recommendations' },
];

type StepKind = 'NOT-STARTED' | 'IN-PROGRESS' | 'SUCCEEDED';

interface StepsCardPayload {
  user_defined_type: 'steps_card';
  title: string;
  status: string;
  showFooter: boolean;
  steps: Array<{
    label: string;
    title: string;
    description: string;
    kind: StepKind;
  }>;
}

/**
 * Side-effect channel for scenario completion. The host (`main.ts`) subscribes
 * to `"complete"`; `completeStepsScenario` dispatches once when its final upsert
 * resolves. Using a named `EventTarget` here keeps the signal:
 *   - co-located with the scenario logic that fires it,
 *   - free of `window`/global pollution,
 *   - typed and discoverable via this single export.
 */
export const scenarioBus = new EventTarget();
export type ScenarioCompleteDetail = { messageID: string };

function welcomeResponse(): MessageResponse {
  return {
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text:
            'Click the button below to start a progressive-steps demo. ' +
            'Click it again while one is running — multiple runs progress concurrently.',
        },
        {
          response_type: MessageResponseTypes.BUTTON,
          button_type: ButtonItemType.POST_BACK,
          label: 'Start steps demo',
          // The chat sends `value.input.text` back as the next user request; the
          // `if` in `customSendMessage` matches on this exact string. `silent`
          // keeps that machine-readable trigger out of the visible transcript.
          value: { input: { text: START_TRIGGER } },
          silent: true,
        },
      ],
    },
  };
}

// `completedCount` = how many steps have finished (0..STEPS.length). The step
// at index `completedCount` (if any) is IN-PROGRESS; earlier are SUCCEEDED,
// later are NOT-STARTED. Pure function — no state, identical inputs always
// produce identical output, so concurrent scenarios never collide.
function buildResponse(
  messageID: string,
  completedCount: number,
  requestID: string
): MessageResponse {
  const done = completedCount >= STEPS.length;
  const payload: StepsCardPayload = {
    user_defined_type: 'steps_card',
    title: 'Optimizing excess inventory',
    status: done ? 'Status: completed' : 'Status: running',
    showFooter: done,
    steps: STEPS.map((step, index) => ({
      label: step.label,
      title: step.title,
      description:
        index < completedCount
          ? 'Completed successfully'
          : index === completedCount
            ? 'In progress...'
            : 'Not started',
      kind:
        index < completedCount
          ? 'SUCCEEDED'
          : index === completedCount
            ? 'IN-PROGRESS'
            : 'NOT-STARTED',
    })),
  };

  return {
    id: messageID,
    request_id: requestID,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: 'Working on this — keep typing if you want.',
        },
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          streaming_metadata: { id: 'steps-card', cancellable: !done },
          user_defined: payload as unknown as Record<string, unknown>,
        },
      ],
    },
  };
}

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

async function completeStepsScenario(
  instance: ChatInstance,
  messageID: string,
  requestID: string,
  signal?: AbortSignal
) {
  for (let i = 0; i < STEP_TIMINGS_MS.length; i += 1) {
    if (!(await sleep(STEP_TIMINGS_MS[i], signal)) || signal?.aborted) {
      return;
    }
    const state =
      i === STEP_TIMINGS_MS.length - 1
        ? MessageState.COMPLETE
        : MessageState.STREAMING;
    await instance.messaging.upsertMessage(messageID, state, () =>
      buildResponse(messageID, i + 1, requestID)
    );
  }
  if (signal?.aborted) {
    return;
  }
  scenarioBus.dispatchEvent(
    new CustomEvent<ScenarioCompleteDetail>('complete', {
      detail: { messageID },
    })
  );
}

async function runStepsScenario(
  instance: ChatInstance,
  requestID: string,
  signal?: AbortSignal
) {
  if (signal?.aborted) {
    return;
  }
  const messageID = uuid();
  // Register the stream before the sender settles so Stop retains its controller.
  await instance.messaging.upsertMessage(
    messageID,
    MessageState.STREAMING,
    () => buildResponse(messageID, 0, requestID)
  );
  if (signal?.aborted) {
    return;
  }
  // Background work keeps the input usable and lets several cards run at once.
  void completeStepsScenario(instance, messageID, requestID, signal);
}

async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance
) {
  if (request.input.text === START_TRIGGER) {
    await runStepsScenario(instance, request.id, requestOptions.signal);
    return;
  }
  instance.messaging.addMessage(welcomeResponse());
}

export { customSendMessage };

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock back end for the Upsert message user defined example.
 *
 * Demonstrates: how `ChatInstance.messaging.upsertMessage` keeps a user_defined
 * widget mounted while its data progressively changes. Any user text replies
 * with a welcome message (a TEXT response plus a POST_BACK button); clicking
 * the button kicks off a long-running scenario that creates one assistant
 * message, marks it COMPLETE immediately, then mutates the embedded
 * steps-card payload over ~21 s via successive upserts to the same messageID.
 *
 * Multiple concurrent runs are supported — each button click generates a fresh
 * messageID, so the lifecycle coordinator parallelizes them (same-ID upserts
 * serialize, different-ID upserts run in parallel).
 *
 * APIs exercised:
 *   - `ChatInstance.messaging.upsertMessage`
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageState.COMPLETE`
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
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

// Button click posts back this exact string; `customSendMessage` branches on it
// to decide whether to start a scenario or reply with the welcome message.
const START_TRIGGER = "__upsert_demo_start__";

// Five steps and ~21s total runtime exercise progressive updates over a realistic duration.
const STEP_TIMINGS_MS = [6000, 2000, 1000, 8000, 4000];

const STEPS: ReadonlyArray<{ label: string; title: string }> = [
  { label: "Step 1", title: "Estimate inventory needs in all locations" },
  { label: "Step 2", title: "Identify locations with excess inventory" },
  { label: "Step 3", title: "Prepare multiple rebalancing scenarios" },
  { label: "Step 4", title: "Rank rebalancing scenarios for speed and cost" },
  { label: "Step 5", title: "Prepare recommendations" },
];

type StepKind = "NOT-STARTED" | "IN-PROGRESS" | "SUCCEEDED";

interface StepsCardPayload {
  user_defined_type: "steps_card";
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
 * Side-effect channel for scenario completion. The host (`App.tsx`) subscribes
 * to `"complete"`; `runStepsScenario` dispatches once when its final upsert
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
            "Click the button below to start a progressive-steps demo. " +
            "Click it again while one is running — multiple runs progress concurrently.",
        },
        {
          response_type: MessageResponseTypes.BUTTON,
          button_type: ButtonItemType.POST_BACK,
          label: "Start steps demo",
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

// Pure function — different messageIDs never collide when concurrent scenarios overlap.
function buildResponse(
  messageID: string,
  completedCount: number,
): MessageResponse {
  const done = completedCount >= STEPS.length;
  const payload: StepsCardPayload = {
    user_defined_type: "steps_card",
    title: "Optimizing excess inventory",
    status: done ? "Status: completed" : "Status: running",
    showFooter: done,
    steps: STEPS.map((step, index) => ({
      label: step.label,
      title: step.title,
      description:
        index < completedCount
          ? "Completed successfully"
          : index === completedCount
            ? "In progress..."
            : "Not started",
      kind:
        index < completedCount
          ? "SUCCEEDED"
          : index === completedCount
            ? "IN-PROGRESS"
            : "NOT-STARTED",
    })),
  };

  return {
    id: messageID,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "Working on this — keep typing if you want.",
        },
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: payload as unknown as Record<string, unknown>,
        },
      ],
    },
  };
}

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

// One scenario per invocation. `messageID` is local — two concurrent runs get
// two distinct IDs, which the lifecycle coordinator parallelizes.
async function runStepsScenario(
  instance: ChatInstance,
  signal: AbortSignal | undefined,
) {
  const messageID = uuid();

  // Initial upsert: COMPLETE immediately so `pre:receive`/`receive` fire once
  // and the input stays usable — the user is not blocked by the long task.
  await instance.messaging.upsertMessage(messageID, MessageState.COMPLETE, () =>
    buildResponse(messageID, 0),
  );

  for (let i = 0; i < STEP_TIMINGS_MS.length; i += 1) {
    await sleep(STEP_TIMINGS_MS[i]);
    if (signal?.aborted) {
      return;
    }
    // Same `messageID` + COMPLETE: re-renders the user_defined widget in place
    // without re-firing `receive`. The reducer reuses unchanged LocalMessageItem
    // refs, so the StepsCard component instance is reconciled, not remounted.
    await instance.messaging.upsertMessage(
      messageID,
      MessageState.COMPLETE,
      () => buildResponse(messageID, i + 1),
    );
  }

  // Signal the host page so it can show its completion toast. One-line side
  // effect, co-located with the scenario — see `scenarioBus` above.
  scenarioBus.dispatchEvent(
    new CustomEvent<ScenarioCompleteDetail>("complete", {
      detail: { messageID },
    }),
  );
}

async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  if (request.input.text === START_TRIGGER) {
    // Fire-and-forget so `customSendMessage` resolves immediately; this is
    // what re-enables the input while the scenario runs in the background.
    void runStepsScenario(instance, requestOptions.signal);
    return;
  }
  instance.messaging.addMessage(welcomeResponse());
}

export { customSendMessage };

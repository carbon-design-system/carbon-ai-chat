/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ButtonItemType,
  ChatInstance,
  CustomSendMessageOptions,
  GenericItem,
  MessageRequest,
  MessageResponse,
  MessageResponseOptions,
  MessageResponseTypes,
  MessageState,
  ReasoningStep,
  UserDefinedItem,
} from '@carbon/ai-chat';

// The welcome button posts back this string; `customSendMessage` runs the
// scenario for any non-empty input. `silent` keeps the trigger message out of
// the visible transcript.
const START_TRIGGER = 'Show me the reasoning demo';

const TEXT_STREAM_ID = 'final-text';
const WORD_DELAY = 50;
const STEP_GAP = 600;

interface StepPlan {
  title: string;
  body: string;
  summary: string;
  citations?: string[];
}

const STEP_PLANS: StepPlan[] = [
  {
    title: 'Read the user request',
    body: "Scanning the message for the user's goal and any required tools.",
    summary: 'Detected a request for an example walkthrough.',
    citations: ['session-context'],
  },
  {
    title: 'Gather supporting context',
    body: 'Fetching documents from the knowledge base that match the goal.',
    summary: 'Pulled 3 supporting documents from the mock retrieval service.',
    citations: ['doc-123', 'doc-456', 'doc-789'],
  },
  {
    title: 'Draft the response',
    body: 'Composing a short answer that cites the supporting documents.',
    summary: 'Drafted a 2-sentence response with inline citations.',
  },
];

const FINAL_TEXT =
  'Here is the response. Each reasoning step above streamed a TextItem into its content array and then appended a user_defined summary card.';

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

function makeStepContent(
  streamedText: string,
  summary?: StepPlan
): GenericItem[] {
  const content: GenericItem[] = [
    {
      response_type: MessageResponseTypes.TEXT,
      text: streamedText,
    },
  ];
  if (summary) {
    const userDefined: UserDefinedItem = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: {
        user_defined_type: 'reasoning_summary',
        summary: summary.summary,
        citations: summary.citations,
      },
    };
    content.push(userDefined);
  }
  return content;
}

function cloneSteps(steps: ReasoningStep[]): ReasoningStep[] {
  return steps.map((step) => ({
    title: step.title,
    content: Array.isArray(step.content) ? [...step.content] : step.content,
    open_state: step.open_state,
  }));
}

// Build the full MessageResponse snapshot every upsert applies. `upsertMessage`
// replaces the stored message wholesale, so the answer text and the entire
// `message_options.reasoning` payload (every streamed step + summary card) must
// be present on each call. Keeping `streaming_metadata.id` stable preserves the
// text item's identity across updates; `cancellable` controls the stop button.
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
  // STREAMING upsert that advances `message_options.reasoning` (the steps and
  // their streamed content arrays) while the answer text is still empty.
  await instance.messaging.upsertMessage(
    responseID,
    MessageState.STREAMING,
    () => buildSnapshot(responseID, '', messageOptions, true)
  );
}

async function streamFinalText(
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

async function runScenario(instance: ChatInstance, signal?: AbortSignal) {
  if (signal?.aborted) {
    return;
  }
  const responseID = crypto.randomUUID();
  const steps: ReasoningStep[] = [];
  await pushMessageOptions(
    instance,
    responseID,
    { reasoning: { steps: [] } },
    signal
  );

  for (const plan of STEP_PLANS) {
    if (signal?.aborted) {
      return;
    }
    steps.push({ title: plan.title, content: [] as GenericItem[] });
    await pushMessageOptions(
      instance,
      responseID,
      {
        reasoning: { steps: cloneSteps(steps) },
      },
      signal
    );
    if (!(await sleep(STEP_GAP, signal))) {
      return;
    }

    let partial = '';
    for (const word of plan.body.split(' ')) {
      if (signal?.aborted) {
        return;
      }
      partial = partial ? `${partial} ${word}` : word;
      steps[steps.length - 1] = {
        title: plan.title,
        content: makeStepContent(partial),
      };
      await pushMessageOptions(
        instance,
        responseID,
        {
          reasoning: { steps: cloneSteps(steps) },
        },
        signal
      );
      if (!(await sleep(WORD_DELAY, signal))) {
        return;
      }
    }
    if (signal?.aborted) {
      return;
    }
    steps[steps.length - 1] = {
      title: plan.title,
      content: makeStepContent(plan.body, plan),
    };
    await pushMessageOptions(
      instance,
      responseID,
      {
        reasoning: { steps: cloneSteps(steps) },
      },
      signal
    );
    if (!(await sleep(STEP_GAP, signal))) {
      return;
    }
  }
  await streamFinalText(instance, responseID, FINAL_TEXT, signal, {
    reasoning: { steps: cloneSteps(steps) },
  });
}

function sendWelcome(instance: ChatInstance) {
  // Deliver the static welcome through upsertMessage too: a brand-new COMPLETE
  // insert under a fresh messageID fires `receive` once, matching addMessage.
  // The post-back button kicks off the scenario when clicked.
  return instance.messaging.upsertMessage(
    crypto.randomUUID(),
    MessageState.COMPLETE,
    () => ({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: "Send any message to see reasoning steps where each step's content is a streamed TextItem followed by an appended user_defined summary card.",
          },
          {
            response_type: MessageResponseTypes.BUTTON,
            button_type: ButtonItemType.POST_BACK,
            label: 'Send a message to see example',
            value: { input: { text: START_TRIGGER } },
            silent: true,
          },
        ],
      },
    })
  );
}

async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance
) {
  const trimmed = request.input.text?.trim() ?? '';
  if (!trimmed) {
    await sendWelcome(instance);
    return;
  }
  await runScenario(instance, requestOptions.signal);
}

export { customSendMessage };

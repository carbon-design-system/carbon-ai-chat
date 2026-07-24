/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  GenericItem,
  MessageRequest,
  MessageResponseOptions,
  MessageResponseTypes,
  ReasoningStep,
  StreamChunk,
  UserDefinedItem,
} from '@carbon/ai-chat';

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

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
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

function createShellMessage(
  instance: ChatInstance,
  responseID: string,
  messageOptions: MessageResponseOptions
) {
  instance.messaging.addMessageChunk({
    partial_item: {
      response_type: MessageResponseTypes.TEXT,
      text: '',
      streaming_metadata: { id: TEXT_STREAM_ID },
    },
    partial_response: { message_options: messageOptions },
    streaming_metadata: { response_id: responseID },
  });
}

function pushMessageOptions(
  instance: ChatInstance,
  responseID: string,
  messageOptions: MessageResponseOptions
) {
  instance.messaging.addMessageChunk({
    partial_item: {
      response_type: MessageResponseTypes.TEXT,
      text: '',
      streaming_metadata: { id: TEXT_STREAM_ID, cancellable: true },
    },
    partial_response: { message_options: messageOptions },
    streaming_metadata: { response_id: responseID },
  } as StreamChunk);
}

async function streamFinalText(
  instance: ChatInstance,
  responseID: string,
  text: string,
  finalMessageOptions: MessageResponseOptions,
  signal?: AbortSignal
) {
  const words = text.split(' ');
  let canceled = false;
  const onAbort = () => {
    canceled = true;
  };
  signal?.addEventListener('abort', onAbort);

  try {
    for (let i = 0; i < words.length; i += 1) {
      if (canceled) {
        return;
      }
      instance.messaging.addMessageChunk({
        partial_item: {
          response_type: MessageResponseTypes.TEXT,
          text: `${words[i]} `,
          streaming_metadata: { id: TEXT_STREAM_ID, cancellable: true },
        },
        streaming_metadata: { response_id: responseID },
      });
      await sleep(WORD_DELAY);
    }

    if (canceled) {
      return;
    }

    const completeItem = {
      response_type: MessageResponseTypes.TEXT,
      text,
      streaming_metadata: { id: TEXT_STREAM_ID },
    };
    instance.messaging.addMessageChunk({
      complete_item: completeItem,
      streaming_metadata: { response_id: responseID },
    });

    instance.messaging.addMessageChunk({
      final_response: {
        id: responseID,
        output: { generic: [completeItem] },
        message_options: finalMessageOptions,
      },
    });
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

async function runScenario(instance: ChatInstance, signal?: AbortSignal) {
  const responseID = crypto.randomUUID();
  const steps: ReasoningStep[] = [];

  createShellMessage(instance, responseID, {
    reasoning: { steps: [] },
  });

  for (let i = 0; i < STEP_PLANS.length; i += 1) {
    if (signal?.aborted) {
      return;
    }

    const plan = STEP_PLANS[i];

    // 1. Append the new step with its title and empty content, so the user
    //    sees the step appear before any body content streams in.
    steps.push({
      title: plan.title,
      content: [] as GenericItem[],
    });
    pushMessageOptions(instance, responseID, {
      reasoning: { steps: cloneSteps(steps) },
    });
    await sleep(STEP_GAP);

    // 2. Stream the TextItem body for this step word-by-word.
    const words = plan.body.split(' ');
    let partial = '';

    for (let w = 0; w < words.length; w += 1) {
      if (signal?.aborted) {
        return;
      }
      partial = partial ? `${partial} ${words[w]}` : words[w];
      steps[i] = {
        title: plan.title,
        content: makeStepContent(partial),
      };
      pushMessageOptions(instance, responseID, {
        reasoning: { steps: cloneSteps(steps) },
      });
      await sleep(WORD_DELAY);
    }

    // 3. Append the user_defined summary card to this step's content array.
    steps[i] = {
      title: plan.title,
      content: makeStepContent(plan.body, plan),
    };
    pushMessageOptions(instance, responseID, {
      reasoning: { steps: cloneSteps(steps) },
    });

    await sleep(STEP_GAP);
  }

  await streamFinalText(
    instance,
    responseID,
    FINAL_TEXT,
    { reasoning: { steps: cloneSteps(steps) } },
    signal
  );
}

function sendWelcome(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "Send any message to see reasoning steps where each step's content is a streamed TextItem followed by an appended user_defined summary card.",
        },
      ],
    },
  });
}

async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance
) {
  const trimmed = request.input.text?.trim() ?? '';
  if (!trimmed) {
    sendWelcome(instance);
    return;
  }
  await runScenario(instance, requestOptions.signal);
}

export { customSendMessage };

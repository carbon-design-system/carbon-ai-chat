/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChainOfThoughtStep,
  ChainOfThoughtStepStatus,
  ChatInstance,
  CustomSendMessageOptions,
  GenericItemMessageFeedbackOptions,
  MessageResponse,
  MessageResponseTypes,
  ReasoningStep,
  ReasoningSteps,
  ReasoningStepOpenState,
  ResponseUserProfile,
  StreamChunk,
  UserType,
} from "@carbon/ai-chat";

import {
  CHAIN_OF_THOUGHT_TEXT,
  CHAIN_OF_THOUGHT_TEXT_STREAM,
  HTML,
  MARKDOWN,
  WELCOME_TEXT,
  WORD_DELAY,
} from "./constants";
import { RESPONSE_MAP } from "./responseMap";

async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

const defaultHumanUserProfile: ResponseUserProfile = {
  id: "1",
  nickname: "James",
  user_type: UserType.HUMAN,
};

const defaultAlternativeAssistantProfile: ResponseUserProfile = {
  id: "1",
  nickname: "Super assistant",
  user_type: UserType.BOT,
};

const defaultWatsonAgentProfile: ResponseUserProfile = {
  id: "1",
  nickname: "Carbon",
  user_type: UserType.WATSONX,
};

const fullChainOfThought: ChainOfThoughtStep[] = [
  {
    title: "Querying molecular structure database for carbon compounds",
    tool_name: "chem_db_query",
    description: `This step queries chemical databases for carbon structures.\n\n*chem_db_query* accesses the *ChemSpider* database maintained by the *Royal Society of Chemistry*. This contains molecular data used to identify carbon allotropes and organic compounds.\n\nSee more information on [ChemSpider](https://ibm.com).`,
    request: {
      args: {
        element: "carbon",
        query_type: "allotropes",
        filters: {
          bonding_type: "covalent",
        },
        include: [
          "diamond",
          "graphite",
          "fullerenes",
          {
            name: "carbon nanotubes",
          },
        ],
      },
    },
    response: {
      content: `{ "allotropes_found": 4, "primary_structures": ["diamond", "graphite", "fullerenes", "nanotubes"] }`,
    },
  },
  {
    title: "Checking results",
  },
  {
    title: "Calculating carbon bond energies and molecular stability metrics",
    tool_name: "bond_analyzer",
    request: {
      args: {
        molecule: "benzene",
      },
    },
    response: {
      content: `Benzene shows **aromatic stability** with delocalized π electrons. The C-C bond length is *1.39 Å*, intermediate between single and double bonds.`,
    },
  },
  {
    title: "Periodic trend analysis",
    tool_name: "periodic_analyzer",
    request: {
      args: {
        group: 14,
      },
    },
    response: {
      content: {
        trend: "atomic_radius_increases_down_group",
        elements: ["C", "Si", "Ge", "Sn", "Pb"],
      },
    },
  },
];

const defaultReasoningSteps: ReasoningStep[] = [
  {
    title: "Interpret the request",
    content:
      "Identified the user's main objective and clarified any constraints so downstream steps share the same intent. Parsed the tone, looked for safety-sensitive terms, and expanded acronyms to avoid ambiguity before moving on.",
  },
  {
    title: "Considering",
  },
  {
    title: "Check supporting documents",
    content: `Gathered references from the mock knowledge base, prioritizing the latest entries. Verified citations match the requested scope and collected multiple excerpts to weave into the reply rather than relying on a single source.

Called **search_docs** tool:
\`\`\`json
{
  "tool": "search_docs",
  "args": {
    "query": "latest release notes",
    "filters": {
      "product": "carbon-ai-chat",
      "type": ["how-to", "reference"],
      "date_range": "last_90_days"
    },
    "limit": 3
  },
  "response": {
    "results": [
      {
        "id": "doc-1024",
        "title": "Configuring custom reasoning steps",
        "published": "2025-02-02"
      },
      {
        "id": "doc-2048",
        "title": "Streaming responses with chain of thought",
        "published": "2025-01-18"
      },
      {
        "id": "doc-4096",
        "title": "Accessibility updates for reasoning UI",
        "published": "2024-12-10"
      }
    ]
  }
}
\`\`\``,
  },
  {
    title: "Reading data",
  },
  {
    title: "Evaluate possible solutions",
    content:
      "Compared internal guidance with the latest public documentation to find an approach that balances accuracy and safety. Considered two alternate paths, noted tradeoffs, and picked the one with the fewest edge cases for a quick, stable response.",
  },
  {
    title: "Compose the response",
    content:
      "Structured the final answer with plain-language explanations and cited the most trustworthy sources. Included a short summary up front, followed by detailed steps and inline notes on where the information originated. Added a brief safety check to ensure no speculative claims slipped in.",
  },
];

const defaultReasoningTraceContent = defaultReasoningSteps
  .map((step) => step.content)
  .filter((content): content is string => Boolean(content))
  .join("\n\n");

function buildReasoningPayload(
  steps: ReasoningStep[] | undefined,
  visibleCount: number,
  finalState = false,
  openState?: ReasoningStepOpenState,
  content?: string,
): ReasoningSteps {
  const totalCount = steps ? (finalState ? steps.length : visibleCount) : 0;
  const limited = steps
    ? steps.slice(0, totalCount).map((step, _index) => {
        const clone: ReasoningStep = { ...step };
        return clone;
      })
    : [];

  const payload: ReasoningSteps = {
    steps: limited,
  };

  if (typeof openState !== "undefined") {
    payload.open_state = openState;
  }

  if (typeof content === "string") {
    payload.content = content;
  }

  return payload;
}

/**
 * A function that just mocks the chain of thought steps coming in live.
 */
function returnChainOfStepByStatus(
  chainOfThought: ChainOfThoughtStep[],
  currentIndex: number,
  state: ChainOfThoughtStepStatus,
) {
  const currentChainOfThought = [];

  for (let i = 0; i < chainOfThought.length; i++) {
    const step = {
      ...chainOfThought[i],
    };
    if (
      i < currentIndex ||
      (i === currentIndex && state === ChainOfThoughtStepStatus.SUCCESS)
    ) {
      step.status = ChainOfThoughtStepStatus.SUCCESS;
      currentChainOfThought.push(step);
    } else if (
      i === currentIndex &&
      state === ChainOfThoughtStepStatus.PROCESSING
    ) {
      step.response = undefined;
      step.status = state;
      currentChainOfThought.push(step);
    } else {
      break;
    }
  }

  return currentChainOfThought;
}

async function doTextStreaming(
  instance: ChatInstance,
  text: string = MARKDOWN,
  cancellable = true,
  wordDelay = WORD_DELAY,
  userProfile?: ResponseUserProfile,
  chainOfThought?: ChainOfThoughtStep[],
  reasoning?: ReasoningSteps,
  feedback?: GenericItemMessageFeedbackOptions,
  requestOptions?: CustomSendMessageOptions,
) {
  const signal = requestOptions?.signal;
  const responseID = crypto.randomUUID();
  const words = text.split(" ");
  const totalWords = words.length;

  const chainOfThoughtStreamingSteps: any = {};
  const reasoningSteps = reasoning?.steps;
  const reasoningContent = reasoning?.content;
  const reasoningOpenState = reasoning?.open_state;
  const reasoningFinalState =
    reasoningSteps?.length || typeof reasoningContent !== "undefined"
      ? buildReasoningPayload(
          reasoningSteps,
          reasoningSteps?.length ?? 0,
          true,
          reasoningOpenState,
          reasoningContent,
        )
      : undefined;

  // Setup mocking chain of thought steps coming in as the text renders.
  if (typeof chainOfThought !== "undefined") {
    const numberOfSteps = chainOfThought.length * 2;
    const stepWordAmount = Math.floor(totalWords / numberOfSteps);
    for (let i = 0; i < chainOfThought.length - 1; i++) {
      const word = Math.max(stepWordAmount * 2 * i, 1);
      chainOfThoughtStreamingSteps[word] = returnChainOfStepByStatus(
        chainOfThought,
        i,
        ChainOfThoughtStepStatus.PROCESSING,
      );
      chainOfThoughtStreamingSteps[word + stepWordAmount] =
        returnChainOfStepByStatus(
          chainOfThought,
          i,
          ChainOfThoughtStepStatus.SUCCESS,
        );
    }
  }

  let isCanceled = false;
  let lastWordIndex = 0;

  if (signal?.aborted) {
    isCanceled = true;
  }

  // Listen to abort signal (handles both stop button and restart/clear)
  const abortHandler = () => {
    isCanceled = true;
  };
  signal?.addEventListener("abort", abortHandler);

  try {
    if (reasoningSteps?.length || typeof reasoningContent === "string") {
      const reasoningDisplaySteps = reasoningSteps?.map((step) => ({
        ...step,
        content: step.content ? "" : step.content,
      }));

      let reasoningContentProgress =
        typeof reasoningContent === "string" ? "" : undefined;

      const emitReasoningChunk = (payload: ReasoningSteps) => {
        const chunk: StreamChunk = {
          partial_item: {
            response_type: MessageResponseTypes.TEXT,
            text: "",
            streaming_metadata: {
              id: "1",
              cancellable,
            },
          },
          streaming_metadata: {
            response_id: responseID,
          },
          partial_response: {
            message_options: {
              response_user_profile: userProfile,
              reasoning: payload,
            },
          },
        };

        instance.messaging.addMessageChunk(chunk);
      };

      if (reasoningDisplaySteps?.length) {
        for (
          let stepIndex = 0;
          stepIndex < reasoningDisplaySteps.length && !isCanceled;
          stepIndex++
        ) {
          await sleep(wordDelay);
          if (isCanceled) {
            break;
          }

          emitReasoningChunk(
            buildReasoningPayload(
              reasoningDisplaySteps,
              stepIndex + 1,
              false,
              reasoningOpenState,
              reasoningContentProgress,
            ),
          );

          const originalContent = reasoningSteps
            ? reasoningSteps[stepIndex].content
            : undefined;
          if (!originalContent) {
            continue;
          }

          const contentTokens = originalContent.match(/\S+\s*/g) ?? [
            originalContent,
          ];
          let partialContent = "";

          for (const token of contentTokens) {
            if (isCanceled) {
              break;
            }
            partialContent += token;
            reasoningDisplaySteps[stepIndex].content = partialContent;
            await sleep(wordDelay);
            if (isCanceled) {
              break;
            }
            emitReasoningChunk(
              buildReasoningPayload(
                reasoningDisplaySteps,
                stepIndex + 1,
                false,
                reasoningOpenState,
                reasoningContentProgress,
              ),
            );
          }

          reasoningDisplaySteps[stepIndex].content = originalContent;
        }
      }

      if (typeof reasoningContent === "string" && !isCanceled) {
        const contentTokens = reasoningContent.match(/\S+\s*/g) ?? [
          reasoningContent,
        ];
        reasoningContentProgress = "";

        for (const token of contentTokens) {
          if (isCanceled) {
            break;
          }
          reasoningContentProgress += token;
          await sleep(wordDelay);
          if (isCanceled) {
            break;
          }
          emitReasoningChunk(
            buildReasoningPayload(
              reasoningDisplaySteps,
              reasoningDisplaySteps?.length ?? 0,
              false,
              reasoningOpenState,
              reasoningContentProgress,
            ),
          );
        }
      }
    }

    for (let index = 0; index < words.length && !isCanceled; index++) {
      const word = words[index];
      lastWordIndex = index;

      await sleep(wordDelay);
      // Each time you get a chunk back, you can call `addMessageChunk`.
      const chunk: StreamChunk = {
        partial_item: {
          response_type: MessageResponseTypes.TEXT,
          // The next chunk, the chat component will deal with appending these chunks.
          text: `${word} `,
          streaming_metadata: {
            // This is the id of the item inside the response. If you have multiple items in this message they will be
            // ordered in the view in the order of the first message chunk received. If you want message item 1 to
            // appear above message item 2, be sure to seed it with a chunk first, even if its empty to start.
            id: "1",
            cancellable,
          },
        },
        streaming_metadata: {
          // This is the id of the entire message response.
          response_id: responseID,
        },
      };

      chunk.partial_response = {};

      chunk.partial_response.message_options = {};

      chunk.partial_response.message_options.response_user_profile =
        userProfile;

      if (chainOfThoughtStreamingSteps[index]) {
        chunk.partial_response.message_options.chain_of_thought =
          chainOfThoughtStreamingSteps[index];
      }

      instance.messaging.addMessageChunk(chunk);
    }

    // When you are done streaming this item in the response, you should call the complete item.
    // This requires ALL the concatenated final text. If you want to append text, run a post processing safety check, or anything
    // else that mutates the data, you can do so here.
    const completeItem = {
      response_type: MessageResponseTypes.TEXT,
      text: isCanceled ? words.splice(0, lastWordIndex).join(" ") : text,
      streaming_metadata: {
        // This is the id of the item inside the response.
        id: "1",
        stream_stopped: isCanceled,
      },
    };

    const chunk: StreamChunk = {
      complete_item: completeItem,
      streaming_metadata: {
        // This is the id of the entire message response.
        response_id: responseID,
      },
    };

    chunk.partial_response = {
      message_options: {
        response_user_profile: userProfile,
        chain_of_thought: chainOfThought,
      },
    };

    if (reasoningFinalState) {
      chunk.partial_response.message_options =
        chunk.partial_response.message_options || {};
      chunk.partial_response.message_options.reasoning = reasoningFinalState;
    }

    instance.messaging.addMessageChunk(chunk);

    // When all and any chunks are complete, you send a final response.
    // You can rearrange or re-write everything here, but what you send here is what the chat will display when streaming
    // has been completed.
    const finalResponse: MessageResponse = {
      id: responseID,
      output: {
        generic: feedback
          ? [
              {
                ...completeItem,
                message_item_options: {
                  feedback,
                },
              },
            ]
          : [completeItem],
      },
      message_options: {
        response_user_profile: userProfile,
        chain_of_thought: chainOfThought,
        reasoning: undefined,
      },
    };

    if (reasoningFinalState) {
      finalResponse.message_options = finalResponse.message_options || {};
      finalResponse.message_options.reasoning = reasoningFinalState;
    }

    await instance.messaging.addMessageChunk({
      final_response: finalResponse,
    } as StreamChunk);
  } finally {
    signal?.removeEventListener("abort", abortHandler);
  }
}

function doWelcomeText(instance: ChatInstance) {
  const options = Object.keys(RESPONSE_MAP).map((key) => ({
    label: key,
    value: { input: { text: key } },
  }));
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: WELCOME_TEXT,
        },
        {
          response_type: MessageResponseTypes.OPTION,
          title: "Select a response to view it in action.",
          options,
        },
      ],
    },
  });
}

function doText(
  instance: ChatInstance,
  text: string = MARKDOWN,
  userProfile?: ResponseUserProfile,
  chainOfThought?: ChainOfThoughtStep[],
  feedback?: GenericItemMessageFeedbackOptions,
  reasoning?: ReasoningSteps,
) {
  const genericItem = {
    response_type: MessageResponseTypes.TEXT,
    text,
  };

  const message: MessageResponse = {
    output: {
      generic: [genericItem],
    },
  };

  message.message_options = {
    chain_of_thought: chainOfThought,
    reasoning,
  };

  if (userProfile) {
    message.message_options.response_user_profile = userProfile;
  }

  if (feedback) {
    message.output.generic = message.output.generic || [];
    message.output.generic[0] = {
      ...genericItem,
      message_item_options: {
        feedback,
      },
    };
  } else if (!userProfile) {
    message.output.generic = message.output.generic || [];
    message.output.generic[0] = {
      ...genericItem,
      message_item_options: {
        feedback: {
          /**
           * Indicates if a request for feedback should be displayed.
           */
          is_on: true,

          /**
           * A unique identifier for this feedback. This is required for the feedback to be recorded in message history.
           */
          id: "1",

          /**
           * Indicates if the user should be asked for additional detailed information when providing positive feedback.
           */
          show_positive_details: false,

          /**
           * Indicates if the user should be asked for additional detailed information when providing negative feedback.
           */
          show_negative_details: true,

          /**
           * Indicates whether the prompt line should be shown.
           */
          show_prompt: true,

          /**
           * We want a list of negative feedback categories, but don't care about positive.
           */
          categories: {
            negative: ["Wrong answer", "Do not like the answer"],
          },
        },
      },
    };
  }

  instance.messaging.addMessage(message);
}

function doTextWithHumanProfile(
  instance: ChatInstance,
  text: string = MARKDOWN,
  responseUserProfile: ResponseUserProfile = defaultHumanUserProfile,
) {
  doText(instance, text, responseUserProfile);
}

function doTextWithNonWatsonAssistantProfile(
  instance: ChatInstance,
  text: string = MARKDOWN,
  responseUserProfile: ResponseUserProfile = defaultAlternativeAssistantProfile,
) {
  doText(instance, text, responseUserProfile);
}

function doTextWithWatsonAgentProfile(
  instance: ChatInstance,
  text: string = MARKDOWN,
  responseUserProfile: ResponseUserProfile = defaultWatsonAgentProfile,
) {
  doText(instance, text, responseUserProfile);
}

async function doTextStreamingWithNonWatsonAssistantProfile(
  instance: ChatInstance,
  text: string = MARKDOWN,
  cancellable = true,
  userProfile: ResponseUserProfile = defaultAlternativeAssistantProfile,
  requestOptions?: CustomSendMessageOptions,
) {
  return doTextStreaming(
    instance,
    text,
    cancellable,
    WORD_DELAY,
    userProfile,
    undefined,
    undefined,
    undefined,
    requestOptions,
  );
}

async function doTextChainOfThoughtStreaming(
  instance: ChatInstance,
  text: string = CHAIN_OF_THOUGHT_TEXT_STREAM,
  cancellable = true,
  userProfile?: ResponseUserProfile,
  chainOfThought: ChainOfThoughtStep[] = fullChainOfThought,
  requestOptions?: CustomSendMessageOptions,
) {
  doTextStreaming(
    instance,
    text,
    cancellable,
    300,
    userProfile,
    chainOfThought,
    undefined,
    undefined,
    requestOptions,
  );
}

function doTextChainOfThought(
  instance: ChatInstance,
  text: string = CHAIN_OF_THOUGHT_TEXT,
  userProfile?: ResponseUserProfile,
  chainOfThought: ChainOfThoughtStep[] = fullChainOfThought,
) {
  doText(instance, text, userProfile, chainOfThought);
}

async function doTextWithReasoningStepsStreaming(
  instance: ChatInstance,
  requestOptions?: CustomSendMessageOptions,
) {
  await doTextStreaming(
    instance,
    MARKDOWN,
    true,
    WORD_DELAY,
    undefined,
    undefined,
    {
      steps: defaultReasoningSteps,
    },
    undefined,
    requestOptions,
  );
}

async function doTextWithReasoningTraceStreaming(
  instance: ChatInstance,
  requestOptions?: CustomSendMessageOptions,
) {
  await doTextStreaming(
    instance,
    MARKDOWN,
    true,
    WORD_DELAY,
    undefined,
    undefined,
    {
      content: defaultReasoningTraceContent,
    },
    undefined,
    requestOptions,
  );
}

function doHTML(
  instance: ChatInstance,
  text: string = HTML,
  userProfile?: ResponseUserProfile,
  chainOfThought?: ChainOfThoughtStep[],
) {
  // Make sure simple standalone html works as well.
  doText(instance, "<b>Carbon is bold!</b>", userProfile);
  doText(instance, text, userProfile, chainOfThought);
}

async function doHTMLStreaming(
  instance: ChatInstance,
  text: string = HTML,
  cancellable = true,
  wordDelay = WORD_DELAY,
  userProfile?: ResponseUserProfile,
  chainOfThought?: ChainOfThoughtStep[],
  requestOptions?: CustomSendMessageOptions,
) {
  await doTextStreaming(
    instance,
    text,
    cancellable,
    wordDelay,
    userProfile,
    chainOfThought,
    undefined,
    undefined,
    requestOptions,
  );
}

function doTextWithFeedback(instance: ChatInstance) {
  const feedbackText =
    "We'd love to hear your thoughts on Carbon! This versatile element forms the backbone of all organic chemistry and is essential for life as we know it. How do you feel about this fundamental building block of matter? Please use the feedback buttons below to share your opinion.";

  const feedback: GenericItemMessageFeedbackOptions = {
    is_on: true,
    id: crypto.randomUUID(),
    show_positive_details: false,
    show_negative_details: true,
    show_prompt: true,
    categories: {
      negative: ["Not informative", "Too technical", "Don't like the topic"],
      positive: ["Very helpful", "Interesting", "Good explanation"],
    },
  };

  doText(instance, feedbackText, undefined, undefined, feedback);
}

async function doTextWithFeedbackStreaming(
  instance: ChatInstance,
  requestOptions?: CustomSendMessageOptions,
) {
  const feedbackText =
    "We'd love to hear your thoughts on Carbon! This versatile element forms the backbone of all organic chemistry and is essential for life as we know it. How do you feel about this fundamental building block of matter? Please use the feedback buttons below to share your opinion.";

  const feedback: GenericItemMessageFeedbackOptions = {
    is_on: true,
    id: crypto.randomUUID(),
    show_positive_details: false,
    show_negative_details: true,
    show_prompt: true,
    categories: {
      negative: ["Not informative", "Too technical", "Don't like the topic"],
      positive: ["Very helpful", "Interesting", "Good explanation"],
    },
  };

  await doTextStreaming(
    instance,
    feedbackText,
    true,
    WORD_DELAY,
    undefined,
    undefined,
    undefined,
    feedback,
    requestOptions,
  );
}

export {
  doTextChainOfThoughtStreaming,
  doTextChainOfThought,
  doTextStreaming,
  doTextWithReasoningStepsStreaming,
  doTextWithReasoningTraceStreaming,
  doWelcomeText,
  doText,
  doTextWithHumanProfile,
  doTextWithNonWatsonAssistantProfile,
  doTextStreamingWithNonWatsonAssistantProfile,
  doTextWithWatsonAgentProfile,
  doHTML,
  doHTMLStreaming,
  doTextWithFeedback,
  doTextWithFeedbackStreaming,
};

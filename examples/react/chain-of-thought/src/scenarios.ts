/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Chain-of-thought scenario for the chain-of-thought example.
 *
 * Demonstrates: shipping a complete `chain_of_thought` array on the final
 * response. Unlike reasoning steps, the chain-of-thought drawer is intended
 * for raw tool-call debugging traces and renders only on the finalized
 * message rather than streaming step-by-step.
 *
 * APIs exercised:
 *   - `instance.messaging.addMessageChunk`
 *   - `ChainOfThoughtStep`, `ChainOfThoughtStepStatus`
 *   - `MessageResponseOptions.chain_of_thought`
 *
 * Start reading at: `runChainOfThoughtScenario()`.
 */

import type { ChatInstance } from "@carbon/ai-chat";
import {
  MessageResponseTypes,
  ChainOfThoughtStepStatus,
  type ChainOfThoughtStep,
  type MessageResponseOptions,
  type StreamChunk,
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

const FINAL_TEXT =
  "Chain of thought is best suited for raw debugging or tool-call traces. In most cases you should use reasoning steps instead, because they are more user-friendly while still exposing the assistant's thinking.";

// Replace with a real production implementation. Each entry models a single
// tool invocation: `tool_name` plus a `request`/`response` pair render in the
// chain-of-thought drawer as a tool trace, and `status` controls the badge.
const CHAIN_OF_THOUGHT_STEPS: ChainOfThoughtStep[] = [
  {
    title: "Vector search",
    description: "Retrieved similar documents.",
    tool_name: "semantic_search",
    request: { args: { query: "user request" } },
    response: { content: ["doc-1", "doc-2", "doc-3"] },
    status: ChainOfThoughtStepStatus.SUCCESS,
  },
  {
    title: "Summarize",
    description: "Summarizing the retrieved documents.",
    tool_name: "summarize",
    request: { args: { documents: ["doc-1", "doc-2", "doc-3"] } },
    response: { content: "Summary of the retrieved context." },
    status: ChainOfThoughtStepStatus.SUCCESS,
  },
  {
    title: "Generate response",
    description: "Drafting the user-facing reply.",
    tool_name: "generate",
    request: { args: { summary: "Summary of the retrieved context." } },
    response: { content: "Final chain of thought drafted." },
    status: ChainOfThoughtStepStatus.SUCCESS,
  },
];

const TEXT_STREAM_ID = "text-1";
const WORD_DELAY = 40;

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
  // Seed the message with an empty streaming text item so the shell exists
  // before the chain-of-thought trace lands on the final response.
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

export async function runChainOfThoughtScenario(
  instance: ChatInstance,
  signal?: AbortSignal,
) {
  const responseID = uuid();
  createShellMessage(instance, responseID, { chain_of_thought: [] });

  // Chain-of-thought traces ship as a single complete array on the final
  // response rather than streaming step-by-step like reasoning steps do —
  // they are intended for raw tool-call debugging rather than live UX.
  await streamText(instance, responseID, FINAL_TEXT, signal, {
    chain_of_thought: CHAIN_OF_THOUGHT_STEPS,
  });
}

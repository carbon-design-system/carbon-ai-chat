/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock messaging backend for the float web-components example.
 *
 * Demonstrates: a `customSendMessage` implementation that fabricates a
 * streamed assistant turn entirely on the client, including chunked
 * streaming, abort-signal handling, and a final response payload.
 *
 * APIs exercised:
 *   - `ChatInstance.messaging.addMessage`
 *   - `ChatInstance.messaging.addMessageChunk`
 *   - `StreamChunk` (`partial_item`, `complete_item`, `final_response`)
 *   - `MessageResponseTypes.TEXT`
 *   - `CustomSendMessageOptions.signal` (AbortSignal cancellation)
 *
 * Start reading at: the `customSendMessage` export at the bottom; it
 * dispatches to `doFakeTextStreaming` for non-empty user input.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
  StreamChunk,
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

const WELCOME_TEXT = `Welcome to this example of a custom back-end. This back-end is mocked entirely on the client side.

Send any message and you will receive a streamed response from the mock backend.`;

const TEXT = `Lorem ipsum odor amet, consectetuer adipiscing elit. Aliquet non platea elementum morbi porta accumsan. Tortor libero consectetur dapibus volutpat porta vestibulum.

Quam scelerisque platea ridiculus sem placerat pharetra sed. Porttitor per massa venenatis fusce fusce ad cras. Vel congue semper, rhoncus tempus nisl nam.`;

const WORD_DELAY = 40;

async function doFakeTextStreaming(
  instance: ChatInstance,
  signal?: AbortSignal,
) {
  // mock scaffolding that fakes a streaming LLM by emitting one word per
  // tick. Replace with a real production implementation that pipes server
  // chunks into `instance.messaging.addMessageChunk`.
  const responseID = uuid();
  const words = TEXT.split(" ");
  let isCanceled = false;
  // tracks the highest word index actually emitted so a cancel can
  // reconstruct the partial text that the user already saw.
  let lastStreamedIndex = -1;
  const timeouts: number[] = [];

  const abortHandler = () => {
    isCanceled = true;
    // clearing every queued timeout is what actually halts the stream;
    // flipping `isCanceled` alone would still let scheduled chunks fire.
    timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  };
  signal?.addEventListener("abort", abortHandler);

  try {
    words.forEach((word, index) => {
      const timeoutId = setTimeout(() => {
        if (!isCanceled) {
          lastStreamedIndex = index;
          instance.messaging.addMessageChunk({
            partial_item: {
              response_type: MessageResponseTypes.TEXT,
              text: `${word} `,
              streaming_metadata: {
                id: "1",
                cancellable: true,
              },
            },
            streaming_metadata: {
              response_id: responseID,
            },
          });
        }
      }, index * WORD_DELAY);
      timeouts.push(timeoutId as unknown as number);
    });

    const totalDelay = words.length * WORD_DELAY;
    const startTime = Date.now();
    // poll until the last scheduled chunk has fired (or the caller aborts)
    // so the function only resolves once the stream is fully drained — this is
    // what lets the chat UI show the "stop streaming" affordance until done.
    while (!isCanceled && Date.now() - startTime < totalDelay) {
      await sleep(100);
    }

    if (!isCanceled) {
      const completeItem = {
        response_type: MessageResponseTypes.TEXT,
        text: TEXT,
        streaming_metadata: {
          id: "1",
        },
      };
      instance.messaging.addMessageChunk({
        complete_item: completeItem,
        streaming_metadata: {
          response_id: responseID,
        },
      } as StreamChunk);

      const finalResponse = {
        id: responseID,
        output: {
          generic: [completeItem],
        },
      };

      instance.messaging.addMessageChunk({
        final_response: finalResponse,
      } as StreamChunk);
    } else {
      // on cancel, finalize with only the words actually streamed before
      // the abort so the rendered transcript matches what the user saw rather
      // than the full mock `TEXT`.
      const streamedText =
        lastStreamedIndex >= 0
          ? words.slice(0, lastStreamedIndex + 1).join(" ") + " "
          : "";
      const completeItem = {
        response_type: MessageResponseTypes.TEXT,
        text: streamedText,
        streaming_metadata: {
          id: "1",
          // signals to the chat UI that streaming ended via user stop, not
          // natural completion, which affects telemetry and stop-button state.
          stream_stopped: true,
        },
      };
      instance.messaging.addMessageChunk({
        complete_item: completeItem,
        streaming_metadata: {
          response_id: responseID,
        },
      } as StreamChunk);

      const finalResponse = {
        id: responseID,
        output: {
          generic: [completeItem],
        },
      };

      instance.messaging.addMessageChunk({
        final_response: finalResponse,
      } as StreamChunk);
    }
  } finally {
    signal?.removeEventListener("abort", abortHandler);
  }
}

async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // the chat dispatches an empty-text request on first open to seed the
  // welcome turn; respond with a non-streamed message and short-circuit before
  // hitting the streaming path.
  if (request.input.text === "") {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: WELCOME_TEXT,
          },
        ],
      },
    });
    return;
  }

  // forward the AbortSignal so the chat's stop-streaming button can halt
  // the in-flight mock turn. Replace with a real production implementation.
  doFakeTextStreaming(instance, requestOptions.signal);
}

export { customSendMessage };

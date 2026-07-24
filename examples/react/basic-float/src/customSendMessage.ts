/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the float example.
 *
 * Demonstrates: how to wire a `customSendMessage` handler that streams a
 * fake assistant reply chunk-by-chunk and honors cancellation.
 *
 * APIs exercised:
 *   - `ChatInstance.messaging.addMessage`
 *   - `ChatInstance.messaging.addMessageChunk` with `PartialItemChunkWithId` and `StreamChunk`
 *   - `MessageResponseTypes.TEXT`
 *   - `CustomSendMessageOptions.signal` for abort handling
 *
 * Start reading at: `customSendMessage` at the bottom of the file.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
  PartialItemChunkWithId,
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

// Replace with a real production implementation.
async function doFakeTextStreaming(
  instance: ChatInstance,
  signal?: AbortSignal,
) {
  const responseID = uuid();
  const words = TEXT.split(" ");
  let isCanceled = false;
  let lastStreamedIndex = -1;
  const timeouts: number[] = [];

  // The abort signal fires when the user clicks "stop"; cancel pending word
  // chunks so we can emit a final stream_stopped item instead of more text.
  const abortHandler = () => {
    isCanceled = true;
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
          } as PartialItemChunkWithId);
        }
      }, index * WORD_DELAY);
      timeouts.push(timeoutId as unknown as number);
    });

    // Keep the async function alive until every scheduled word chunk has run
    // (or the signal aborts) so the caller can await the full stream.
    const totalDelay = words.length * WORD_DELAY;
    const startTime = Date.now();
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
      const streamedText =
        lastStreamedIndex >= 0
          ? words.slice(0, lastStreamedIndex + 1).join(" ") + " "
          : "";
      const completeItem = {
        response_type: MessageResponseTypes.TEXT,
        text: streamedText,
        streaming_metadata: {
          id: "1",
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

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // Empty input text is the synthetic "hello" the chat sends when it opens;
  // respond with a non-streamed welcome message instead of running the stream.
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

  doFakeTextStreaming(instance, requestOptions.signal);
}

export { customSendMessage };

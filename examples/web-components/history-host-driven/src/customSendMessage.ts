/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock implementation of `PublicConfig.messaging.customSendMessage`.
 *
 * Demonstrates: a fully client-side fake back-end that routes on the
 * incoming `MessageRequest.input.text` to either deliver a complete
 * `addMessage` response or simulate token streaming via `addMessageChunk`.
 *
 * APIs exercised:
 *   - `ChatInstance.messaging.addMessage`
 *   - `ChatInstance.messaging.addMessageChunk`
 *   - `StreamChunk` with `partial_item`, `complete_item`, `final_response`
 *   - `CustomSendMessageOptions.signal` for cancellation
 *
 * Start reading at: `customSendMessage`.
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

const WELCOME_TEXT = `Welcome to this example of a custom back-end. This back-end is mocked entirely on the client side. It does not show all potential functionality.

You can try the following responses:

- stream text
- text

The "text" response includes the configuration to include user feedback (thumbs up/down, etc) in this example. You can apply feedback to any response type.
`;

const TEXT =
  `Lorem ipsum odor amet, consectetuer adipiscing elit. \`Inline Code Venenatis\` aliquet non platea elementum morbi porta accumsan. Tortor libero consectetur dapibus volutpat porta vestibulum.

Quam scelerisque platea ridiculus sem placerat pharetra sed. Porttitor per massa venenatis fusce fusce ad cras. Vel congue semper, rhoncus tempus nisl nam. Purus molestie tristique diam himenaeos sapien lacus.

| Lorem        | Ipsum      | Odor    | Amet      |
|--------------|------------|---------|-----------|
| consectetuer | adipiscing | elit    | Venenatis |
| 0            | 1          | 2       | 3         |
| bibendum     | enim       | blandit | quis      |


- consectetuer
- adipiscing
- elit
- Venenatis

` +
  "\n```python\n" +
  `import random

def generate_lorem_ipsum(paragraphs=1):
    # Base words for Lorem Ipsum
    lorem_words = (
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor "
        "incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud "
        "exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure "
        "dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. "
        "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt "
        "mollit anim id est laborum."
    ).split()
    
    # Function to generate a random sentence
    def random_sentence():
        sentence_length = random.randint(4, 12)
        sentence = random.sample(lorem_words, sentence_length)
        return " ".join(sentence).capitalize() + "."
    
    # Function to generate a paragraph
    def random_paragraph():
        sentence_count = random.randint(3, 6)
        return " ".join(random_sentence() for _ in range(sentence_count))
    
    # Generate the requested number of paragraphs
    return "\\n\\n".join(random_paragraph() for _ in range(paragraphs))

# Example usage
print(generate_lorem_ipsum(2))  # Generates 2 paragraphs of Lorem Ipsum text
` +
  "\n\n```";

const WORD_DELAY = 40;

// Replace with a real production implementation.
async function doFakeTextStreaming(
  instance: ChatInstance,
  signal?: AbortSignal,
) {
  const responseID = uuid();
  const words = TEXT.split(" ");
  let isCanceled = false;
  const timeouts: number[] = [];

  // The same abort signal fires for both the user-facing stop button and an
  // internal restart/clear, so a single handler covers both cancellation paths.
  const abortHandler = () => {
    isCanceled = true;
    // Pending word-emit timeouts must be drained or the chat would receive
    // chunks for an aborted response and the UI would briefly keep growing.
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

    await sleep(words.length * WORD_DELAY);

    if (!isCanceled) {
      const completeItem = {
        response_type: MessageResponseTypes.TEXT,
        text: `${TEXT}\n\nMore stuff on the end when adding as a complete item.`,
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
      // Emit a truncated complete item flagged with `stream_stopped` so the
      // chat persists the partial output instead of leaving an orphan stream.
      const completeItem = {
        response_type: MessageResponseTypes.TEXT,
        text: words.slice(0, Math.floor(words.length * 0.3)).join(" "),
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
  // An empty input string is the synthetic request the chat fires on open to
  // request a welcome message, so it is handled separately from user input.
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
  } else {
    switch (request.input.text) {
      case "text":
        instance.messaging.addMessage({
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: TEXT,
              },
            ],
          },
        });
        break;
      case "stream text":
        doFakeTextStreaming(instance as ChatInstance, requestOptions.signal);
        break;
      default:
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
    }
  }
}

export { customSendMessage };

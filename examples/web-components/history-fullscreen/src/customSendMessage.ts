/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock implementation of `PublicConfig.messaging.customSendMessage`.
 *
 * Demonstrates: a fully client-side back-end that branches on the user's
 * input text to produce either a static response, a streamed response via
 * `addMessageChunk`, or a welcome message — including correct handling of
 * the abort signal supplied through `CustomSendMessageOptions`.
 *
 * APIs exercised:
 *   - `instance.messaging.addMessage` and `addMessageChunk`
 *   - `StreamChunk` with `partial_item`, `complete_item`, `final_response`
 *   - `CustomSendMessageOptions.signal` for cancel/restart
 *
 * Start reading at: `customSendMessage`, then `doFakeTextStreaming`.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
  StreamChunk,
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

// Replace with a real production implementation. The streamed response uses this to pace fake chunks with timing similar to a real model.
async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

const WELCOME_TEXT = `Welcome to this example of a custom back-end. This back-end is mocked entirely on the client side. It does not show all potential functionality.

You can try the following responses:

- stream text
- text
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

// Per-word pacing for the fake stream; small enough to feel live but slow enough to exercise the streaming UI.
const WORD_DELAY = 40;

async function doFakeTextStreaming(
  instance: ChatInstance,
  signal?: AbortSignal,
) {
  const responseID = uuid();
  const words = TEXT.split(" ");
  let isCanceled = false;
  const timeouts: number[] = [];

  // The chat fires the same abort signal whether the user clicks stop or restarts the conversation; both paths must halt the stream.
  const abortHandler = () => {
    isCanceled = true;
    // Without this, queued setTimeout callbacks would keep emitting partial chunks after cancellation.
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
      // The complete_item replaces the accumulated partials; emitting extra trailing text shows that the final shape can differ from the streamed prefix.
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

      // final_response is required to flip the message out of the streaming state and unlock follow-up input.
      instance.messaging.addMessageChunk({
        final_response: finalResponse,
      } as StreamChunk);
    } else {
      // On cancellation, persist roughly the prefix the user actually saw and tag it stream_stopped so the UI can render the partial-message marker.
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
    // Detaches the listener regardless of which branch ran so the AbortSignal does not retain a reference to this closure.
    signal?.removeEventListener("abort", abortHandler);
  }
}

// Replace with a real production implementation. This handler routes the request to a fake response based on the literal user text.
async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // An empty input is the chat's synthetic "session start" message; respond with a welcome describing the demo's supported commands.
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
        // Intentionally not awaited; the chat expects customSendMessage to return promptly while addMessageChunk drives the UI asynchronously.
        doFakeTextStreaming(instance as ChatInstance, requestOptions.signal);
        break;
      default:
        // Unknown commands fall back to the welcome blurb so the user always gets a discoverable response.
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

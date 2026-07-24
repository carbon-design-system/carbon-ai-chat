/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the Vite + Vitest example.
 *
 * Demonstrates: a synchronous `customSendMessage` that stands in for a real
 * service so the dev server (and Vitest suite) can exercise the chat surface
 * without network plumbing. The "one thing" demonstrated by this example is
 * the Vite + Vitest toolchain glue, so this handler is intentionally small.
 *
 * APIs exercised:
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: the empty-input branch in `customSendMessage` for the
 * welcome-message convention used by the chat runtime.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const WELCOME_TEXT = `Welcome to the Vite + Vitest Carbon AI Chat example.

Send any message to receive an echo response from the mock backend.`;

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // the chat runtime fires `customSendMessage` with an empty `input.text`
  // when the widget first opens — that's the hook for the welcome message,
  // not a user-typed empty string.
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

  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: `Echo from the Vite mock backend: "${request.input.text}".`,
        },
      ],
    },
  });
}

export { customSendMessage };

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock `customSendMessage` for the Next.js example.
 *
 * Demonstrates: a minimal `customSendMessage` handler so the example can run
 * without a real backend. The framework integration (Next.js App Router) is
 * the focus of this example, so the chat-side logic is intentionally trivial.
 *
 * APIs exercised:
 *   - `customSendMessage` (PublicConfig.messaging)
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: `customSendMessage` below — the welcome branch handles the
 * empty-string bootstrap request, the second branch echoes user input.
 * Replace with a real production implementation.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const WELCOME_TEXT = `Welcome to the Next.js + Carbon AI Chat example.

Send any message to receive an echo response from the mock backend. The chat itself is mounted from the client component in \`./ChatExample.tsx\`.`;

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // Carbon AI Chat issues an empty-string request on first load so the host can post a welcome message before the user types.
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

  // Replace with a real production implementation. This mock just echoes input so the Next.js wiring can be exercised end-to-end.
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: `Echo from the Next.js mock backend: "${request.input.text}".`,
        },
      ],
    },
  });
}

export { customSendMessage };

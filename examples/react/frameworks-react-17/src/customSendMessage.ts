/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock messaging backend for the React 17 example.
 *
 * Demonstrates: a minimal `customSendMessage` implementation so the
 * example can run without a real server, keeping the focus on the React 17
 * legacy render path rather than on chat configuration.
 *
 * APIs exercised:
 *   - `customSendMessage` signature from `PublicConfig.messaging`
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: the `customSendMessage` function declaration below.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

// copy shown when the chat first opens (empty input from the welcome event); kept short so the example surface is the legacy render API, not the message content.
const WELCOME_TEXT = `Welcome to the React 17 + ReactDOM.render Carbon AI Chat example.

Send any message to receive an echo response from the mock backend.`;

// mock scaffolding stand-in for a server round-trip. Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // Carbon AI Chat invokes `customSendMessage` with an empty `input.text` on first open to request a welcome message; branch here so we can answer with `WELCOME_TEXT` instead of echoing.
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

  // trivial echo so the example proves the legacy `ReactDOM.render` mount path delivers events end-to-end. Replace with a real production implementation.
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: `Echo from the React 17 mock backend: "${request.input.text}".`,
        },
      ],
    },
  });
}

export { customSendMessage };

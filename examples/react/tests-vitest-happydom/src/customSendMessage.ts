/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the Vitest and happy-dom example.
 *
 * Uses ChatInstance.messaging.addMessage and MessageResponseTypes.TEXT to
 * show a welcome message and echo user input when you run the app.
 * Start with the empty-input branch for the welcome-message path.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from '@carbon/ai-chat';

const WELCOME_TEXT = `Welcome to the Vitest and happy-dom Carbon AI Chat example.

Send any message to receive an echo response from the mock backend.`;

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance
) {
  // the chat runtime fires `customSendMessage` with an empty `input.text`
  // when the widget first opens — that's the hook for the welcome message,
  // not a user-typed empty string.
  if (request.input.text === '') {
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
          text: `Echo from the mock backend: "${request.input.text}".`,
        },
      ],
    },
  });
}

export { customSendMessage };

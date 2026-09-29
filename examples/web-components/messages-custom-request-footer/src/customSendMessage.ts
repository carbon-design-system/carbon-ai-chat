/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the messages-custom-request-footer example.
 *
 * Demonstrates: how little the backend has to do. A footer under a user message
 * needs nothing on the wire — the chat mints the slot and fires the event for
 * every message the user sends — so this file only replies with text.
 *
 * APIs exercised:
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: the exported `customSendMessage` function near the bottom.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from '@carbon/ai-chat';

const WELCOME_TEXT =
  'Welcome! Send a message and a copy button appears beneath it. Replies from the assistant have no footer, because this example sets only the request-footer callback.';

const REPLY_TEXT =
  'Thanks. Your message above has a copy button under it; this reply does not.';

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance
) {
  // The chat sends one empty-input turn when it opens. Greet the user, then
  // reply the same way to everything else.
  const text = request.input.text === '' ? WELCOME_TEXT : REPLY_TEXT;
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text,
        },
      ],
    },
  });
}

export { customSendMessage };

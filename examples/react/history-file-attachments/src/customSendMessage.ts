/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the file-attachments history example.
 *
 * Demonstrates: the minimum `customSendMessage` needed to keep the conversation
 * usable after the restored history loads. This example's subject is the restore,
 * so the send path stays deliberately plain.
 *
 * APIs exercised:
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: `customSendMessage()`.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from '@carbon/ai-chat';

// Replace with a real production implementation that calls your service.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance
) {
  // The chat sends an empty message on first open as a welcome handshake. Here the
  // restored history is the opening content, so there is nothing to reply to.
  if (!request.input.text) {
    return;
  }

  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: 'This example is about restoring attachments from history — reload the page to see the chip come back.',
        },
      ],
    },
  });
}

export { customSendMessage };

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the Watch / Messages example.
 *
 * A welcome button starts one partial response with a request-derived ID.
 * The host completes that response through the public activeResponseId.
 */

import {
  ButtonItemType,
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
  MessageState,
} from '@carbon/ai-chat';

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance
) {
  if (request.input.text !== 'start-response') {
    await instance.messaging.addMessage({
      request_id: request.id,
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'Choose Start response to watch messages and status change.',
          },
          {
            response_type: MessageResponseTypes.BUTTON,
            button_type: ButtonItemType.POST_BACK,
            label: 'Start response',
            value: { input: { text: 'start-response' } },
          },
        ],
      },
    });
    return;
  }

  const id = `watch-messages-response-${request.id}`;
  await instance.messaging.upsertMessage(id, MessageState.STREAMING, () => ({
    id,
    request_id: request.id,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: 'A partial response is visible.',
          streaming_metadata: { id: 'answer' },
        },
      ],
    },
  }));
}

export { customSendMessage };

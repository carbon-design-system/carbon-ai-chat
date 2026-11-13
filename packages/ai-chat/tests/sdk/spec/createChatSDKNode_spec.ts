/**
 * @jest-environment node
 */

/* eslint jsdoc/check-tag-names: ["error", { "definedTags": ["jest-environment"] }] */

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createChatSDK } from '../../../src/sdk';
import { chatOf } from '../../../src/sdk/internal';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import type { ChatSDKInstance } from '../../../src/types/instance/ChatSDKInstance';
import { MessageSendSource } from '../../../src/types/events/eventBusTypes';
import {
  MessageResponseTypes,
  type MessageRequest,
  type MessageResponse,
} from '../../../src/types/messaging/Messages';

function reply(request: MessageRequest, text: string): MessageResponse {
  return {
    id: `reply-${request.id}`,
    request_id: request.id,
    output: { generic: [{ response_type: MessageResponseTypes.TEXT, text }] },
  };
}

it('runs with no DOM and no storage globals', () => {
  expect(typeof window).toBe('undefined');
  expect(typeof document).toBe('undefined');
  expect(typeof sessionStorage).toBe('undefined');
  expect(typeof localStorage).toBe('undefined');
});

it('sends and receives through a chat createChatSDK started', async () => {
  const sent: string[] = [];
  const customSendMessage = jest.fn(
    async (
      request: MessageRequest,
      _options: unknown,
      instance: ChatSDKInstance
    ) => {
      const text = (request.input as { text?: string }).text ?? '';
      sent.push(text);
      const response = reply(request, `echo: ${text}`);
      await instance.messaging.upsertMessage(
        response.id,
        MessageState.COMPLETE,
        () => response
      );
    }
  );
  const chat = await createChatSDK({ messaging: { customSendMessage } });
  try {
    // Boot sent the welcome request and stored its reply.
    expect(sent).toEqual(['']);
    expect(chat.state.get().messages).toHaveLength(2);

    // `messaging.send` arrives with #1826; this is the path it will call.
    await chatOf(chat).actions.send('hello', MessageSendSource.INSTANCE_SEND);
    expect(sent).toEqual(['', 'hello']);
    const texts = chat.state
      .get()
      .messages.flatMap((message) =>
        'output' in message
          ? message.output.generic.map((item) =>
              'text' in item ? item.text : ''
            )
          : [(message.input as { text?: string }).text]
      );
    expect(texts).toEqual(['', 'echo: ', 'hello', 'echo: hello']);
    expect(chat.state.get().status).toBe('ready');
  } finally {
    chat.destroy();
  }
});

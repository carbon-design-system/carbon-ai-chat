/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';

import {
  ChatInstance,
  MessageResponseTypes,
} from '../../../../src/aiChatEntry';
import {
  FakeBackend,
  contractChat,
  contractSetup,
  fakeBackend,
  finishSend,
  instanceSender,
  startSend,
  textResponse,
} from '../../helpers';

/** Runs a host call that changes chat state. */
async function host(call: () => unknown): Promise<void> {
  await act(async () => {
    await call();
  });
}

const activeResponseId = (instance: ChatInstance) =>
  instance.getState().activeResponseId;

// @covers state.activeResponseId instance.messaging.addMessage instance.send
// @covers instance.messaging.addMessageChunk instance.messaging.removeMessages
// @covers instance.messaging.clearConversation instance.messaging.restartConversation
describe('activeResponseId', () => {
  contractSetup();

  async function mount(): Promise<{
    instance: ChatInstance;
    backend: FakeBackend;
  }> {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
    });
    return { instance, backend };
  }

  it('starts null', async () => {
    const { instance } = await mount();
    expect(activeResponseId(instance)).toBeNull();
  });

  it('names the latest response the host added', async () => {
    const { instance } = await mount();
    await host(() => instance.messaging.addMessage(textResponse('a', 'r1')));
    expect(activeResponseId(instance)).toBe('r1');
    await host(() => instance.messaging.addMessage(textResponse('b', 'r2')));
    expect(activeResponseId(instance)).toBe('r2');
  });

  it('clears on send, and names the reply once it arrives', async () => {
    const { instance, backend } = await mount();
    await host(() => instance.messaging.addMessage(textResponse('a', 'r1')));
    const started = await startSend(instanceSender(instance, backend), 'hello');
    expect(activeResponseId(instance)).toBeNull();
    await host(() =>
      instance.messaging.addMessage(
        textResponse('b', 'r2', { request_id: started.sent.request.id })
      )
    );
    expect(activeResponseId(instance)).toBe('r2');
    await finishSend(started);
    expect(activeResponseId(instance)).toBe('r2');
  });

  it('names a streamed response from its first chunk', async () => {
    const { instance } = await mount();
    await host(() =>
      instance.messaging.addMessageChunk({
        partial_item: {
          response_type: MessageResponseTypes.TEXT,
          text: 'hi',
          streaming_metadata: { id: 'item-1' },
        },
        streaming_metadata: { response_id: 'stream-1' },
      })
    );
    expect(activeResponseId(instance)).toBe('stream-1');
  });

  it('falls back to the previous response when the latest is removed', async () => {
    const { instance } = await mount();
    await host(() => instance.messaging.addMessage(textResponse('a', 'r1')));
    await host(() => instance.messaging.addMessage(textResponse('b', 'r2')));
    await host(() => instance.messaging.removeMessages(['r2']));
    expect(activeResponseId(instance)).toBe('r1');
  });

  it('clears on clearConversation', async () => {
    const { instance } = await mount();
    await host(() => instance.messaging.addMessage(textResponse('a', 'r1')));
    await host(() => instance.messaging.clearConversation());
    expect(activeResponseId(instance)).toBeNull();
  });

  it('clears on restartConversation', async () => {
    const { instance } = await mount();
    await host(() => instance.messaging.addMessage(textResponse('a', 'r1')));
    await host(() => instance.messaging.restartConversation());
    expect(activeResponseId(instance)).toBeNull();
  });
});

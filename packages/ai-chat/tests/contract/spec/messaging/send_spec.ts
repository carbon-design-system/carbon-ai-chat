/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import {
  BusEventPreSend,
  BusEventSend,
  BusEventType,
  MessageRequest,
  MessageSendSource,
} from '../../../../src/aiChatEntry';
import {
  contractCleanup,
  describeShared,
  finishSend,
  recordEvents,
  startSend,
  textResponse,
} from '../../helpers';

// @covers instance.send event.pre:send event.send state.messages state.status
// @covers config.messaging.customSendMessage export.aiChatEntry.MessageSendSource
describeShared('send', (makeDriver) => {
  afterEach(contractCleanup);

  it('passes the request to customSendMessage with its text', async () => {
    const chat = await makeDriver();
    const { sent } = await startSend(chat, 'hello');
    expect(sent.request.input.text).toBe('hello');
    // On `main` a plain send leaves `silent` unset, though its type is
    // `boolean`; a host can only rely on it being falsy.
    expect(sent.options.silent).toBeFalsy();
    expect(sent.options.signal).toBeInstanceOf(AbortSignal);
    expect(sent.options.signal.aborted).toBe(false);
  });

  it('resolves only after customSendMessage settles', async () => {
    const chat = await makeDriver();
    const started = await startSend(chat, 'hello');
    let settled = false;
    started.done.then(() => {
      settled = true;
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(settled).toBe(false);
    await finishSend(started);
    expect(settled).toBe(true);
  });

  it('fires pre:send, then send, then calls customSendMessage', async () => {
    const chat = await makeDriver();
    const order: string[] = [];
    const backendCalls = () => chat.backend.requests.length;
    chat.on([
      {
        type: BusEventType.PRE_SEND,
        handler: () => order.push(`pre:send after ${backendCalls()} calls`),
      },
      {
        type: BusEventType.SEND,
        handler: () => order.push(`send after ${backendCalls()} calls`),
      },
    ]);
    await startSend(chat, 'hello');
    expect(order).toEqual(['pre:send after 0 calls', 'send after 0 calls']);
    expect(backendCalls()).toBe(1);
  });

  it('gives send and customSendMessage the edits a pre:send handler made', async () => {
    const chat = await makeDriver();
    chat.on({
      type: BusEventType.PRE_SEND,
      handler: (event: BusEventPreSend) => {
        event.data.input.text = 'edited';
      },
    });
    const events = recordEvents(chat, [BusEventType.SEND]);
    const { sent } = await startSend(chat, 'hello');
    expect(sent.request.input.text).toBe('edited');
    expect(events.of<BusEventSend>(BusEventType.SEND)[0].data.input.text).toBe(
      'edited'
    );
  });

  it('marks a programmatic send with the INSTANCE_SEND source', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.PRE_SEND,
      BusEventType.SEND,
    ]);
    const { sent } = await startSend(chat, 'hello');
    expect(sent.options.busEventSend?.source).toBe(
      MessageSendSource.INSTANCE_SEND
    );
    expect(events.of<BusEventSend>(BusEventType.SEND)[0].source).toBe(
      MessageSendSource.INSTANCE_SEND
    );
    expect(events.of<BusEventPreSend>(BusEventType.PRE_SEND)[0].source).toBe(
      MessageSendSource.INSTANCE_SEND
    );
  });

  it('keeps an ID the host set on the request', async () => {
    const chat = await makeDriver();
    const request: MessageRequest = { id: 'host-id', input: { text: 'hello' } };
    const { sent } = await startSend(chat, request);
    expect(sent.request.id).toBe('host-id');
    expect(chat.messages().map((message) => message.id)).toContain('host-id');
  });

  it('gives a string send an ID, and the same ID in state and to the backend', async () => {
    const chat = await makeDriver();
    const { sent } = await startSend(chat, 'hello');
    expect(typeof sent.request.id).toBe('string');
    expect(sent.request.id.length).toBeGreaterThan(0);
    expect(chat.messages().map((message) => message.id)).toEqual([
      sent.request.id,
    ]);
  });

  it('moves status from submitted to ready as the turn completes', async () => {
    const chat = await makeDriver();
    expect(chat.status()).toBe('ready');
    const started = await startSend(chat, 'hello');
    expect(chat.status()).toBe('submitted');
    await act(() =>
      chat.messaging.addMessage(
        textResponse('hi there', 'r1', {
          request_id: started.sent.request.id,
        })
      )
    );
    expect(chat.status()).toBe('streaming');
    await finishSend(started);
    await waitFor(() => expect(chat.status()).toBe('ready'));
    expect(chat.messages().map((message) => message.id)).toEqual([
      started.sent.request.id,
      'r1',
    ]);
  });

  it('keeps a silent request in messages, marked history.silent', async () => {
    const chat = await makeDriver();
    const { sent } = await startSend(chat, 'quiet', { silent: true });
    expect(sent.options.silent).toBe(true);
    const messages = chat.messages();
    expect(messages.map((message) => message.id)).toEqual([sent.request.id]);
    expect(messages[0].history?.silent).toBe(true);
  });
});

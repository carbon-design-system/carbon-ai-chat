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
  createBaseConfig,
  mockCustomSendMessage,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  Message,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import type { HistoryItem } from '../../../../src/types/messaging/History';

// Fields a host keeps on a message envelope that the chat doesn't declare. The
// nested value checks that the chat keeps the whole value, not just its reference.
function hostFields(tag: string) {
  return {
    host_trace: { id: `trace-${tag}`, tags: [tag, 'kept'] },
    hostThread: `thread-${tag}`,
  };
}

function expectHostFields(message: unknown, tag: string) {
  expect(message).toMatchObject(hostFields(tag));
}

function textResponse(id: string, text: string, tag: string): MessageResponse {
  return {
    id,
    output: { generic: [{ response_type: MessageResponseTypes.TEXT, text }] },
    ...hostFields(tag),
  };
}

function publicMessage(
  instance: { state: { get(): { messages: readonly Readonly<Message>[] } } },
  id: string
) {
  return instance.state.get().messages.find((message) => message.id === id);
}

describe('host fields on message envelopes', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('keeps host fields on a sent request through events, the send handler, and state', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const preSend = jest.fn();
    const send = jest.fn();
    instance.on({ type: BusEventType.PRE_SEND, handler: preSend });
    instance.on({ type: BusEventType.SEND, handler: send });

    const request: MessageRequest = {
      id: 'request-1',
      input: { text: 'Hello' },
      ...hostFields('request'),
    };
    await act(async () => {
      await instance.send(request);
    });

    expectHostFields(preSend.mock.calls[0][0].data, 'request');
    expectHostFields(send.mock.calls[0][0].data, 'request');
    expectHostFields(mockCustomSendMessage.mock.calls[0][0], 'request');
    expectHostFields(store.getState().allMessagesByID['request-1'], 'request');
    expectHostFields(publicMessage(instance, 'request-1'), 'request');
  });

  it('keeps host fields on an added response through receive events and state', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const preReceive = jest.fn();
    const receive = jest.fn();
    instance.on({ type: BusEventType.PRE_RECEIVE, handler: preReceive });
    instance.on({ type: BusEventType.RECEIVE, handler: receive });

    await act(async () => {
      await instance.messaging.addMessage(
        textResponse('response-1', 'Hi', 'response')
      );
    });

    expectHostFields(preReceive.mock.calls[0][0].data, 'response');
    expectHostFields(receive.mock.calls[0][0].data, 'response');
    expectHostFields(
      store.getState().allMessagesByID['response-1'],
      'response'
    );
    expectHostFields(publicMessage(instance, 'response-1'), 'response');
  });

  it('keeps host fields from a streamed final response', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const receive = jest.fn();
    instance.on({ type: BusEventType.RECEIVE, handler: receive });

    await act(async () => {
      await instance.messaging.addMessageChunk({
        partial_item: {
          response_type: MessageResponseTypes.TEXT,
          text: 'Hel',
          streaming_metadata: { id: 'item-1' },
        },
        streaming_metadata: { response_id: 'streamed-1' },
      });
      await instance.messaging.addMessageChunk({
        final_response: textResponse('streamed-1', 'Hello', 'streamed'),
      });
    });

    expectHostFields(receive.mock.calls[0][0].data, 'streamed');
    expectHostFields(
      store.getState().allMessagesByID['streamed-1'],
      'streamed'
    );
    expectHostFields(publicMessage(instance, 'streamed-1'), 'streamed');
  });

  it('keeps host fields written through upsertMessage', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    await act(async () => {
      await instance.messaging.upsertMessage(
        'upserted-1',
        MessageState.STREAMING,
        () => textResponse('upserted-1', 'Draft', 'upsert-streaming')
      );
    });
    expectHostFields(publicMessage(instance, 'upserted-1'), 'upsert-streaming');

    await act(async () => {
      await instance.messaging.upsertMessage(
        'upserted-1',
        MessageState.COMPLETE,
        () => textResponse('upserted-1', 'Done', 'upsert-complete')
      );
    });
    expectHostFields(
      store.getState().allMessagesByID['upserted-1'],
      'upsert-complete'
    );
    expectHostFields(publicMessage(instance, 'upserted-1'), 'upsert-complete');
  });

  it('keeps host fields on messages loaded from history', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const historyBegin = jest.fn();
    const historyEnd = jest.fn();
    instance.on({ type: BusEventType.HISTORY_BEGIN, handler: historyBegin });
    instance.on({ type: BusEventType.HISTORY_END, handler: historyEnd });

    const history: HistoryItem[] = [
      {
        message: {
          id: 'history-request',
          input: { text: 'Earlier question' },
          ...hostFields('history-request'),
        },
        time: '2026-01-01T12:00:00.000Z',
      },
      {
        message: textResponse(
          'history-response',
          'Earlier answer',
          'history-response'
        ),
        time: '2026-01-01T12:00:01.000Z',
      },
    ];
    await act(async () => {
      await instance.messaging.insertHistory(history);
    });

    await waitFor(() => expect(historyEnd).toHaveBeenCalled());
    for (const handler of [historyBegin, historyEnd]) {
      const { messages } = handler.mock.calls[0][0];
      for (const tag of ['history-request', 'history-response']) {
        expectHostFields(
          messages.find((message: Message) => message.id === tag),
          tag
        );
      }
    }
    for (const tag of ['history-request', 'history-response']) {
      expectHostFields(store.getState().allMessagesByID[tag], tag);
      expectHostFields(publicMessage(instance, tag), tag);
    }
  });
});

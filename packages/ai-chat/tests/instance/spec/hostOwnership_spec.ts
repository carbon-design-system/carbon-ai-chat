/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import {
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';

describe('existing host ownership contracts', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('preserves chunk caller identity and mutable event edits', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const chunk = {
      streaming_metadata: { response_id: 'chunk' },
      partial_item: {
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { value: 'before' },
        streaming_metadata: { id: 'item' },
      },
    };
    instance.on({
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: (event: any) => {
        expect(event.data.chunk).toBe(chunk);
        expect(event.data.messageItem).toBe(chunk.partial_item);
        event.data.messageItem.user_defined.value = 'after';
        event.data.messageItem.response_type = MessageResponseTypes.TEXT;
      },
    });
    await instance.messaging.addMessageChunk(chunk);
    expect(chunk.partial_item.user_defined.value).toBe('after');
    expect(
      store.getState().allMessageItemsByID['chunk-item'].item.user_defined.value
    ).toBe('after');
  });

  it('preserves history caller defaults and history event identity', async () => {
    const response: MessageResponse = {
      id: 'history',
      output: { generic: [] },
    };
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        messaging: {
          customLoadHistory: async () => [
            { message: response, time: '2026-01-01T00:00:00.000Z' },
          ],
        },
      });
    let eventMessage: MessageResponse;
    instance.on({
      type: BusEventType.HISTORY_BEGIN,
      handler: (event: any) => {
        eventMessage = event.messages[0];
      },
    });
    await serviceManager.historyService.loadHistory();
    expect(eventMessage).toBe(response);
    expect(response.history.timestamp).toEqual(expect.any(Number));
    expect(response.ui_state_internal.from_history).toBe(true);
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('assigns send defaults to the caller and preserves its existing freeze', async () => {
    const { instance } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      messaging: {
        skipWelcome: true,
        customSendMessage: async () => undefined,
      },
    });
    const request: MessageRequest = { input: { text: 'hello' } };
    await instance.send(request);
    expect(request.id).toEqual(expect.any(String));
    expect(request.history.timestamp).toEqual(expect.any(Number));
    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.input)).toBe(true);
  });

  it('preserves the receive caller identity, defaults, pre-event edits and freeze', async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const response: MessageResponse = { output: { generic: [] } };
    let pre: MessageResponse;
    let post: MessageResponse;
    instance.on([
      {
        type: BusEventType.PRE_RECEIVE,
        handler: (event: any) => {
          pre = event.data;
          event.data.output.generic.push({
            response_type: MessageResponseTypes.TEXT,
            text: 'edited',
          });
        },
      },
      {
        type: BusEventType.RECEIVE,
        handler: (event: any) => {
          post = event.data;
        },
      },
    ]);
    await instance.messaging.addMessage(response);
    expect(pre).toBe(response);
    expect(post).toBe(response);
    expect(response.id).toEqual(expect.any(String));
    expect(response.history.timestamp).toEqual(expect.any(Number));
    expect(response.output.generic).toEqual([
      { response_type: MessageResponseTypes.TEXT, text: 'edited' },
    ]);
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('assigns defaults to an upsert result and keeps its receive event writable', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const response: MessageResponse = {
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'before' }],
      },
    };
    let writable: boolean;
    instance.on({
      type: BusEventType.RECEIVE,
      handler: (event: any) => {
        expect(event.data).toBe(response);
        writable = !Object.isFrozen(event.data);
        (event.data.output.generic[0] as any).text = 'edited';
      },
    });
    await instance.messaging.upsertMessage(
      'upsert',
      MessageState.COMPLETE,
      () => response
    );
    expect(response.id).toBe('upsert');
    expect(response.history.timestamp).toEqual(expect.any(Number));
    expect(response.output.generic[0]).toMatchObject({ text: 'edited' });
    expect(writable).toBe(true);
    expect(
      (store.getState().allMessagesByID.upsert as MessageResponse).output
        .generic[0]
    ).toMatchObject({ text: 'edited' });
  });

  it('keeps upsert slot wrappers writable and applies handler edits', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    let writable: boolean;
    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: (event: any) => {
        writable = !Object.isFrozen(event.data);
        event.data.message.user_defined.value = 'edited';
      },
    });
    await instance.messaging.upsertMessage(
      'slot',
      MessageState.STREAMING,
      () => ({
        id: 'slot',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: { value: 'before' },
            },
          ],
        },
      })
    );
    expect(writable).toBe(true);
    expect(
      (store.getState().allMessagesByID.slot as MessageResponse).output
        .generic[0].user_defined.value
    ).toBe('edited');
  });

  it('keeps request footer wrappers writable while their message stays frozen', async () => {
    const { instance } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      messaging: {
        skipWelcome: true,
        customSendMessage: async () => undefined,
      },
    });
    let wrapperFrozen: boolean;
    let messageFrozen: boolean;
    instance.on({
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      handler: (event: any) => {
        wrapperFrozen = Object.isFrozen(event.data);
        messageFrozen = Object.isFrozen(event.data.message);
      },
    });
    const request: MessageRequest = {
      input: { text: 'footer' },
      message_options: { custom_request_footer_slot: { is_on: true } },
    } as MessageRequest;
    await act(async () => instance.send(request));
    expect(wrapperFrozen).toBe(false);
    expect(messageFrozen).toBe(true);
  });
});

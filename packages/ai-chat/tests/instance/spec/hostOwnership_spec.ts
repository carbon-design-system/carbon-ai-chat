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
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import {
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  GenericItem,
  TextItem,
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

  it.each([false, true])(
    'discards held chunk event edits after removal and replacement (reject: %p)',
    async (reject) => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const entered = resolvablePromise<void>();
      const release = resolvablePromise<void>();
      const failure = new Error('Old callback failed');
      const chunk = {
        streaming_metadata: { response_id: 'chunk' },
        partial_item: {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { value: 'original' },
          streaming_metadata: { id: 'item' },
        },
      };
      instance.on({
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        handler: async (event: any) => {
          expect(event.data.messageItem).toBe(chunk.partial_item);
          event.data.messageItem.user_defined.value = 'Pending edit';
          entered.doResolve();
          await release;
          event.data.messageItem.user_defined.value = 'Stale edit';
          if (reject) {
            throw failure;
          }
        },
      });
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      let write: Promise<void>;
      let settled: Promise<void>;
      try {
        await act(async () => {
          write = instance.messaging.addMessageChunk(chunk);
          settled = reject ? expect(write).rejects.toBe(failure) : write;
          await entered;
        });
        const before = instance.state.get();
        const originalItem = store.getState().allMessageItemsByID['chunk-item'];
        expect(originalItem.item.user_defined).toEqual({ value: 'original' });
        await act(async () => {
          await instance.messaging.removeMessages(['chunk']);
          await instance.messaging.upsertMessage(
            'chunk',
            MessageState.STREAMING,
            () => ({
              id: 'chunk',
              output: {
                generic: [
                  {
                    response_type: MessageResponseTypes.USER_DEFINED,
                    user_defined: { value: 'Replacement' },
                    streaming_metadata: { id: 'item' },
                  },
                ],
              },
            })
          );
        });
        const replacement = store.getState().allMessageItemsByID['chunk-item'];
        const afterReplacement = instance.state.get();
        await act(async () => {
          release.doResolve();
          await settled;
        });
        expect(store.getState().allMessageItemsByID['chunk-item']).toBe(
          replacement
        );
        expect(instance.state.get().status).toBe('streaming');
        expect(
          before.messages.find((message) => message.id === 'chunk')
        ).toMatchObject({
          output: { generic: [{ user_defined: { value: 'original' } }] },
        });
        expect(
          afterReplacement.messages.find((message) => message.id === 'chunk')
        ).toMatchObject({
          output: { generic: [{ user_defined: { value: 'Replacement' } }] },
        });
        expect(originalItem.item.user_defined).toEqual({ value: 'original' });
      } finally {
        release.doResolve();
        await settled;
      }
    }
  );

  it.each([
    ['slot', false],
    ['slot', true],
    ['receive', false],
    ['receive', true],
  ] as const)(
    'keeps a same-ID legacy replacement made during an upsert %s callback (reject: %p)',
    async (phase, reject) => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const original: MessageResponse = {
        id: 'overlapping-owner',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: { value: 'original' },
              streaming_metadata: { id: 'item' },
            },
          ],
        },
      };
      const replacement: MessageResponse = {
        id: original.id,
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'replacement',
              streaming_metadata: { id: 'item' },
            },
          ],
        },
      };
      const replacementCommitted = resolvablePromise<void>();
      let replacementWrite: Promise<void>;
      let beforeReplacement: ReturnType<typeof instance.state.get>;
      const failure = new Error('Expected callback failure');
      const unsubscribe = store.subscribe(() => {
        const stored = store.getState().allMessagesByID[
          original.id
        ] as MessageResponse;
        if (
          stored?.output.generic[0]?.response_type === MessageResponseTypes.TEXT
        ) {
          replacementCommitted.doResolve();
        }
      });
      const handler = jest.fn(async (event: any) => {
        const message = phase === 'slot' ? event.data.fullMessage : event.data;
        if (message !== original) {
          return;
        }
        beforeReplacement = instance.state.get();
        replacementWrite = instance.messaging.addMessage(replacement);
        await replacementCommitted;
        original.output.generic[0].user_defined.value = 'stale callback edit';
        if (reject) {
          throw failure;
        }
      });
      instance.on({
        type:
          phase === 'slot'
            ? BusEventType.USER_DEFINED_RESPONSE
            : BusEventType.RECEIVE,
        handler,
      });
      const errorLog = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      try {
        await act(async () => {
          const write = instance.messaging.upsertMessage(
            original.id,
            MessageState.COMPLETE,
            () => original
          );
          if (phase === 'slot' && reject) {
            await expect(write).rejects.toBe(failure);
          } else {
            await write;
          }
          await replacementWrite;
        });

        const stored = store.getState().allMessagesByID[
          original.id
        ] as MessageResponse;
        expect(stored).not.toBe(replacement);
        expect(stored.output).toEqual(replacement.output);
        expect(
          beforeReplacement.messages.find(
            (message) => message.id === original.id
          )
        ).toMatchObject({
          output: { generic: [{ user_defined: { value: 'original' } }] },
        });
        expect(
          instance.state
            .get()
            .messages.find((message) => message.id === original.id)
        ).toMatchObject({
          output: { generic: [{ text: 'replacement' }] },
        });
      } finally {
        unsubscribe();
        errorLog.mockRestore();
      }
    }
  );

  it('copies host edits back through each owned pause phase and receive', async () => {
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const original: MessageResponse = {
      id: 'owned-pauses',
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: { value: 'first' },
          },
          { response_type: MessageResponseTypes.PAUSE, time: 1 },
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: { value: 'second' },
          },
        ],
      },
    };
    const pause = jest
      .spyOn(serviceManager.chunkProcessingService, 'waitForPause')
      .mockImplementation(async () => {
        const stored = store.getState().allMessagesByID[
          original.id
        ] as MessageResponse;
        expect(stored.output.generic[0].user_defined.value).toBe('first slot');
      });
    instance.on([
      {
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: (event: any) => {
          event.data.message.user_defined.value += ' slot';
        },
      },
      {
        type: BusEventType.RECEIVE,
        handler: (event: any) => {
          expect(event.data).toBe(original);
          expect(original.output.generic[0].user_defined.value).toBe(
            'first slot'
          );
          expect(original.output.generic[2].user_defined.value).toBe(
            'second slot'
          );
          original.output.generic[2].user_defined.value = 'receive edit';
        },
      },
    ]);
    try {
      await act(async () =>
        instance.messaging.upsertMessage(
          original.id,
          MessageState.COMPLETE,
          () => original
        )
      );
      expect(pause).toHaveBeenCalledTimes(1);
      const stored = store.getState().allMessagesByID[
        original.id
      ] as MessageResponse;
      expect(stored.output.generic[0].user_defined.value).toBe('first slot');
      expect(stored.output.generic[2].user_defined.value).toBe('receive edit');
      expect(stored.output).not.toBe(original.output);
    } finally {
      pause.mockRestore();
    }
  });

  it.each([false, true])(
    'keeps held and retained full-message edits separate during a pause (edit retained: %p)',
    async (editRetained) => {
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const id = 'owned-pause-siblings';
      const text = (itemID: string): GenericItem => ({
        response_type: MessageResponseTypes.TEXT,
        text: itemID,
        streaming_metadata: { id: itemID },
      });
      const custom = (value: string, itemID?: string): GenericItem => ({
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { value },
        ...(itemID ? { streaming_metadata: { id: itemID } } : {}),
      });
      await act(async () =>
        instance.messaging.upsertMessage(id, MessageState.STREAMING, () => ({
          id,
          output: { generic: [text('a'), text('z'), custom('same')] },
        }))
      );
      const initialState = store.getState();
      const previousIDs =
        initialState.assistantMessageState.localMessageIDs.filter(
          (localID) =>
            initialState.allMessageItemsByID[localID].fullMessageID === id
        );
      const retained = initialState.allMessageItemsByID[previousIDs[2]];
      let retainedDuringPause = retained;
      const next: MessageResponse = {
        id,
        output: {
          generic: [
            custom('before pause', 'c'),
            { response_type: MessageResponseTypes.PAUSE, time: 1 },
            custom('same'),
            custom('same'),
            text('a'),
          ],
        },
      };
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: (event: any) => {
          if (event.data.message.streaming_metadata?.id === 'c') {
            expect(event.data.fullMessage).toBe(next);
            event.data.fullMessage.output.generic[2].user_defined.value =
              'held edit';
            if (editRetained) {
              event.data.fullMessage.output.generic[3].user_defined.value =
                'retained edit';
              event.data.fullMessage.output.generic[4].text =
                'retained text edit';
            }
          }
        },
      });
      const pause = jest
        .spyOn(serviceManager.chunkProcessingService, 'waitForPause')
        .mockImplementation(async () => {
          const state = store.getState();
          const visibleIDs = state.assistantMessageState.localMessageIDs.filter(
            (localID) => state.allMessageItemsByID[localID].fullMessageID === id
          );
          expect(visibleIDs).toEqual([
            `${id}-c`,
            retained.ui_state.id,
            `${id}-a`,
          ]);
          retainedDuringPause = state.allMessageItemsByID[retained.ui_state.id];
          expect(retainedDuringPause.item.user_defined.value).toBe(
            editRetained ? 'retained edit' : 'same'
          );
          expect(
            (state.allMessageItemsByID[`${id}-a`].item as TextItem).text
          ).toBe(editRetained ? 'retained text edit' : 'a');
          if (!editRetained) {
            expect(retainedDuringPause).toBe(retained);
          }
          expect(retained.item.user_defined.value).toBe('same');
          expect(
            (state.allMessagesByID[id] as MessageResponse).output.generic[2]
              .user_defined.value
          ).toBe('held edit');
        });
      try {
        await act(async () =>
          instance.messaging.upsertMessage(
            id,
            MessageState.STREAMING,
            () => next
          )
        );
        expect(pause).toHaveBeenCalledTimes(1);
        const state = store.getState();
        const visible = state.assistantMessageState.localMessageIDs
          .map((localID) => state.allMessageItemsByID[localID])
          .filter((localItem) => localItem.fullMessageID === id);
        expect(visible[1].item.user_defined.value).toBe('held edit');
        expect(visible[2]).toBe(retainedDuringPause);
        expect(visible[2].item.user_defined.value).toBe(
          editRetained ? 'retained edit' : 'same'
        );
      } finally {
        pause.mockRestore();
      }
    }
  );

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

  it.each([
    ['grid', 'addMessage'],
    ['grid', MessageState.STREAMING],
    ['grid', MessageState.COMPLETE],
    ['carousel', 'addMessage'],
    ['carousel', MessageState.STREAMING],
    ['carousel', MessageState.COMPLETE],
  ])(
    'stops nested %s slot callbacks after removal during %s',
    async (containerType, operation) => {
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const createSlot = jest.spyOn(
        serviceManager.slotEventService,
        'getOrCreateUserDefinedElement'
      );
      const children = ['first', 'second'].map((value) => ({
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { value },
      }));
      const container =
        containerType === 'grid'
          ? {
              response_type: MessageResponseTypes.GRID,
              rows: [{ cells: [{ items: children }] }],
            }
          : {
              response_type: MessageResponseTypes.CAROUSEL,
              items: [
                { response_type: MessageResponseTypes.CARD, body: children },
              ],
            };
      const response = {
        id: 'nested-removal',
        output: { generic: [container] },
      } as MessageResponse;
      const remainingItems = () =>
        Object.values(store.getState().allMessageItemsByID).filter(
          (item) => item.fullMessageID === 'nested-removal'
        );
      let itemsAtRemoval: ReturnType<typeof remainingItems>;
      let slotCallsAtRemoval: number;
      const handler = jest.fn(async (event: any) => {
        expect(event.data.message.user_defined.value).toBe('first');
        await instance.messaging.removeMessages(['nested-removal']);
        itemsAtRemoval = remainingItems();
        slotCallsAtRemoval = createSlot.mock.calls.length;
      });
      instance.on({ type: BusEventType.USER_DEFINED_RESPONSE, handler });

      await act(async () => {
        if (operation === 'addMessage') {
          await instance.messaging.addMessage(response);
        } else {
          await instance.messaging.upsertMessage(
            'nested-removal',
            operation as MessageState,
            () => response
          );
        }
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(
        store.getState().allMessagesByID['nested-removal']
      ).toBeUndefined();
      expect(remainingItems()).toEqual(itemsAtRemoval);
      remainingItems().forEach((item, index) => {
        expect(item).toBe(itemsAtRemoval[index]);
      });
      expect(createSlot).toHaveBeenCalledTimes(slotCallsAtRemoval);
    }
  );

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

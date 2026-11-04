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
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../../test_helpers';
import { resolvablePromise } from '../../../../src/chat/utils/resolvablePromise';
import actions from '../../../../src/chat/store/actions';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  BusEventType,
  BusEventUserDefinedResponse,
} from '../../../../src/types/events/eventBusTypes';
import {
  MessageResponse,
  MessageResponseTypes,
  PartialItemChunk,
  TextItem,
} from '../../../../src/types/messaging/Messages';
import type { AppState } from '../../../../src/types/state/AppState';

function textResponse(text: string): MessageResponse {
  return {
    id: 'response',
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text }],
    },
  };
}

function visibleTexts(state: AppState) {
  return state.assistantMessageState.localMessageIDs
    .map((id) => state.allMessageItemsByID[id])
    .filter((item) => item.fullMessageID === 'response')
    .map((item) => (item.item as TextItem).text);
}

describe('message write lifetime', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it.each(['addMessage', 'upsertMessage'] as const)(
    'stops nested sibling events after removal during %s',
    async (method) => {
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const removed = resolvablePromise<void>();
      let stateAfterRemoval: AppState;
      let slotsAfterRemoval: number;
      const createSlot = jest.spyOn(
        serviceManager.slotEventService,
        'getOrCreateUserDefinedElement'
      );
      const slot = jest.fn(async (event: BusEventUserDefinedResponse) => {
        expect(event.data.message.user_defined.value).toBe('first');
        await instance.messaging.removeMessages(['nested-response']);
        stateAfterRemoval = store.getState();
        slotsAfterRemoval = createSlot.mock.calls.length;
        removed.doResolve();
      });
      instance.on({ type: BusEventType.USER_DEFINED_RESPONSE, handler: slot });
      const message: MessageResponse = {
        id: 'nested-response',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.CARD,
              body: ['first', 'second'].map((value) => ({
                response_type: MessageResponseTypes.USER_DEFINED,
                user_defined: { value },
              })),
            },
          ],
        },
      };

      await act(async () => {
        if (method === 'addMessage') {
          await instance.messaging.addMessage(message);
        } else {
          await instance.messaging.upsertMessage(
            message.id,
            MessageState.COMPLETE,
            () => message
          );
        }
        await removed;
        await jest.advanceTimersByTimeAsync(0);
      });

      expect(slot).toHaveBeenCalledTimes(1);
      expect(createSlot).toHaveBeenCalledTimes(slotsAfterRemoval);
      const state = store.getState();
      expect(state.allMessagesByID[message.id]).toBeUndefined();
      expect(state.assistantMessageState.messageIDs).not.toContain(message.id);
      expect(state.allMessagesByID).toBe(stateAfterRemoval.allMessagesByID);
      expect(state.allMessageItemsByID).toBe(
        stateAfterRemoval.allMessageItemsByID
      );
    }
  );

  it('isolates nested updater edits while pending and after rejection', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await act(async () => {
      await instance.messaging.addMessage(textResponse('Original'));
    });
    const previous = store.getState().allMessagesByID.response;
    const entered = resolvablePromise();
    const release = resolvablePromise();
    const failure = new Error('Updater failed');
    const write = instance.messaging.upsertMessage(
      'response',
      MessageState.COMPLETE,
      async (message) => {
        (message.output.generic[0] as TextItem).text = 'Uncommitted';
        entered.doResolve();
        await release;
        throw failure;
      }
    );
    const rejection = expect(write).rejects.toBe(failure);
    try {
      await entered;
      expect(store.getState().allMessagesByID.response).toBe(previous);
      expect((previous as MessageResponse).output.generic[0]).toMatchObject({
        text: 'Original',
      });
      expect(visibleTexts(store.getState())).toEqual(['Original']);
    } finally {
      release.doResolve();
      await rejection;
    }
    expect(store.getState().allMessagesByID.response).toBe(previous);
    expect((previous as MessageResponse).output.generic[0]).toMatchObject({
      text: 'Original',
    });
  });

  it('discards a pending updater after removal and replacement under the same ID', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await act(async () => {
      await instance.messaging.addMessage(textResponse('Original'));
    });
    const entered = resolvablePromise();
    const release = resolvablePromise();
    const receive = jest.fn();
    instance.on({ type: BusEventType.RECEIVE, handler: receive });
    const write = instance.messaging.upsertMessage(
      'response',
      MessageState.COMPLETE,
      async () => {
        entered.doResolve();
        await release;
        return textResponse('Stale');
      }
    );
    try {
      await entered;
      await act(async () => {
        await instance.messaging.removeMessages(['response']);
        await instance.messaging.addMessage(textResponse('Replacement'));
      });
      const replacement = store.getState().allMessagesByID.response;
      await act(async () => {
        release.doResolve();
        await write;
      });
      expect(store.getState().allMessagesByID.response).toBe(replacement);
      expect(visibleTexts(store.getState())).toEqual(['Replacement']);
      expect(receive).toHaveBeenCalledTimes(1);
      expect(receive).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            output: textResponse('Replacement').output,
          }),
        }),
        instance
      );
    } finally {
      release.doResolve();
      await write;
    }
  });

  it('does not reveal or emit receive for a paused COMPLETE write after its message is replaced', async () => {
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const entered = resolvablePromise();
    const release = resolvablePromise();
    const pause = jest
      .spyOn(serviceManager.chunkProcessingService, 'waitForPause')
      .mockImplementationOnce(async () => {
        entered.doResolve();
        await release;
      });
    const receive = jest.fn();
    instance.on({ type: BusEventType.RECEIVE, handler: receive });
    let write: Promise<void>;
    try {
      await act(async () => {
        write = instance.messaging.upsertMessage(
          'response',
          MessageState.COMPLETE,
          () => ({
            id: 'response',
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: 'Before pause',
                },
                {
                  response_type: MessageResponseTypes.PAUSE,
                  time: 1000,
                  typing: false,
                },
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: 'Stale after pause',
                },
              ],
            },
          })
        );
        await entered;
      });
      expect(visibleTexts(store.getState())).toEqual(['Before pause']);
      expect(receive).not.toHaveBeenCalled();
      await act(async () => {
        await instance.messaging.removeMessages(['response']);
        await instance.messaging.addMessage(textResponse('Replacement'));
      });
      const replacement = store.getState().allMessagesByID.response;
      await act(async () => {
        release.doResolve();
        await write;
      });
      expect(store.getState().allMessagesByID.response).toBe(replacement);
      expect(visibleTexts(store.getState())).toEqual(['Replacement']);
      expect(receive).toHaveBeenCalledTimes(1);
    } finally {
      release.doResolve();
      await write;
      pause.mockRestore();
    }
  });

  it('discards addMessage delayed in pre:receive after removal and replacement', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await act(async () => {
      await instance.messaging.addMessage(textResponse('Original'));
    });
    const entered = resolvablePromise();
    const release = resolvablePromise();
    const preReceive = jest.fn().mockImplementationOnce(async () => {
      entered.doResolve();
      await release;
    });
    const receive = jest.fn();
    instance.on([
      { type: BusEventType.PRE_RECEIVE, handler: preReceive },
      { type: BusEventType.RECEIVE, handler: receive },
    ]);
    const write = instance.messaging.addMessage(textResponse('Stale'));
    try {
      await entered;
      await act(async () => {
        await instance.messaging.removeMessages(['response']);
        await instance.messaging.upsertMessage(
          'response',
          MessageState.STREAMING,
          () => textResponse('Replacement')
        );
      });
      const replacement = store.getState().allMessagesByID.response;
      await act(async () => {
        release.doResolve();
        await write;
      });
      expect(store.getState().allMessagesByID.response).toBe(replacement);
      expect(visibleTexts(store.getState())).toEqual(['Replacement']);
      expect(receive).not.toHaveBeenCalled();
      await act(async () => {
        await instance.messaging.upsertMessage(
          'response',
          MessageState.COMPLETE,
          (previous) => previous
        );
      });
      expect(receive).toHaveBeenCalledTimes(1);
      expect(receive).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            output: textResponse('Replacement').output,
          }),
        }),
        instance
      );
    } finally {
      release.doResolve();
      await write;
    }
  });

  it('discards a globally queued chunk after its target is removed and replaced', async () => {
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await act(async () => {
      await instance.messaging.addMessage(textResponse('Original'));
    });
    const entered = resolvablePromise();
    const release = resolvablePromise();
    const chunkEvent = jest.fn().mockImplementationOnce(async () => {
      entered.doResolve();
      await release;
    });
    instance.on({
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: chunkEvent,
    });
    const chunk = (id: string, cancellable = false): PartialItemChunk => ({
      streaming_metadata: { response_id: id },
      partial_item: {
        response_type: MessageResponseTypes.USER_DEFINED,
        streaming_metadata: { id: 'custom', cancellable },
        user_defined: { value: id },
      },
    });
    let blocker: Promise<void>;
    let queued: Promise<void>;
    try {
      await act(async () => {
        blocker = instance.messaging.addMessageChunk(chunk('blocker'));
        await entered;
      });
      queued = instance.messaging.addMessageChunk(chunk('response', true));
      await act(async () => {
        await instance.messaging.removeMessages(['response']);
        await instance.messaging.addMessage(textResponse('Replacement'));
      });
      const before = store.getState();
      const streamingID =
        serviceManager.messageService.inboundStreaming.streamingMessageID;
      await act(async () => {
        release.doResolve();
        await Promise.all([blocker, queued]);
      });
      const after = store.getState();
      expect(after.allMessagesByID.response).toBe(
        before.allMessagesByID.response
      );
      expect(after.allMessageItemsByID['response-custom']).toBeUndefined();
      expect(visibleTexts(after)).toEqual(['Replacement']);
      expect(chunkEvent).toHaveBeenCalledTimes(1);
      expect(
        serviceManager.messageService.inboundStreaming.streamingMessageID
      ).toBe(streamingID);
      expect(after.assistantInputState.stopStreamingButtonState).toEqual(
        before.assistantInputState.stopStreamingButtonState
      );
    } finally {
      release.doResolve();
      await Promise.all([blocker, queued]);
    }
  });

  it('discards a final chunk when an active-response subscriber replaces its target', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await act(async () => {
      await instance.messaging.addMessage(textResponse('Original'));
      store.dispatch(actions.setActiveResponseId(null));
    });
    const preReceive = jest.fn();
    const receive = jest.fn();
    instance.on([
      { type: BusEventType.PRE_RECEIVE, handler: preReceive },
      { type: BusEventType.RECEIVE, handler: receive },
    ]);
    let replacement: Promise<void>;
    let replaced = false;
    const unsubscribe = store.subscribe(() => {
      if (
        !replaced &&
        store.getState().assistantMessageState.activeResponseId === 'response'
      ) {
        replaced = true;
        replacement = instance.messaging
          .removeMessages(['response'])
          .then(async () => {
            await instance.messaging.addMessage(textResponse('Replacement'));
          });
      }
    });
    try {
      await act(async () => {
        await instance.messaging.addMessageChunk({
          final_response: textResponse('Stale final'),
        });
        await replacement;
      });
      expect(replaced).toBe(true);
      expect(visibleTexts(store.getState())).toEqual(['Replacement']);
      expect(
        (store.getState().allMessagesByID.response as MessageResponse).output
      ).toEqual(textResponse('Replacement').output);
      expect(preReceive).toHaveBeenCalledTimes(1);
      expect(preReceive).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            output: textResponse('Replacement').output,
          }),
        }),
        instance
      );
      expect(receive).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
      await replacement;
    }
  });

  it('does not fire pre:receive after a loading-end callback removes a native upsert', async () => {
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await act(async () => {
      await instance.messaging.upsertMessage(
        'response',
        MessageState.STREAMING,
        () => textResponse('Original')
      );
    });
    const preReceive = jest.fn();
    const receive = jest.fn();
    instance.on([
      { type: BusEventType.PRE_RECEIVE, handler: preReceive },
      { type: BusEventType.RECEIVE, handler: receive },
    ]);
    let removal: Promise<void>;
    const end = jest
      .spyOn(serviceManager.messageService.messageLoadingManager, 'end')
      .mockImplementationOnce(() => {
        removal = instance.messaging.removeMessages(['response']);
      });
    try {
      await act(async () => {
        await instance.messaging.upsertMessage(
          'response',
          MessageState.COMPLETE,
          () => textResponse('Stale completion')
        );
        await removal;
      });
      expect(end).toHaveBeenCalledTimes(1);
      expect(store.getState().allMessagesByID.response).toBeUndefined();
      expect(visibleTexts(store.getState())).toEqual([]);
      expect(preReceive).not.toHaveBeenCalled();
      expect(receive).not.toHaveBeenCalled();
    } finally {
      end.mockRestore();
      await removal;
    }
  });
});

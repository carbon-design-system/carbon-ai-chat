/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import actions from '../../../src/chat/store/actions';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
import { PublicChatState } from '../../../src/types/instance/PublicChatState';
import {
  BusEventStateChange,
  BusEventType,
} from '../../../src/types/events/eventBusTypes';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

describe('ChatInstance.state', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('retains slot edits when the handler throws without changing the old snapshot', async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    let snapshot: PublicChatState;
    const failure = new Error('slot handler failed');
    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: (event: any) => {
        snapshot = instance.state.get();
        event.data.message.user_defined.value = 'after';
        throw failure;
      },
    });
    await expect(
      instance.messaging.upsertMessage(
        'throwing-slot',
        MessageState.STREAMING,
        () => ({
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.USER_DEFINED,
                user_defined: { value: 'before' },
              },
            ],
          },
        })
      )
    ).rejects.toThrow(failure);
    expect(
      (
        snapshot.messages.find(
          (message) => message.id === 'throwing-slot'
        ) as MessageResponse
      ).output.generic[0].user_defined.value
    ).toBe('before');
    expect(
      (
        instance.state
          .get()
          .messages.find(
            (message) => message.id === 'throwing-slot'
          ) as MessageResponse
      ).output.generic[0].user_defined.value
    ).toBe('after');
  });

  it('keeps local item edits aligned across successive mutable slot handlers', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    instance.on([
      {
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: (event: any) => {
          event.data.message.user_defined.first = true;
        },
      },
      {
        type: BusEventType.CUSTOM_FOOTER_SLOT,
        handler: (event: any) => {
          event.data.message.output.generic[0].user_defined.second = true;
        },
      },
    ]);
    await instance.messaging.upsertMessage(
      'successive',
      MessageState.STREAMING,
      () => ({
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: {},
              message_item_options: {
                custom_footer_slot: { is_on: true, slot_name: 'test-footer' },
              },
            },
          ],
        },
      })
    );
    const local = Object.values(store.getState().allMessageItemsByID).find(
      (item) => item.fullMessageID === 'successive'
    );
    expect(local.item.user_defined).toEqual({ first: true, second: true });
    expect(
      (store.getState().allMessagesByID.successive as MessageResponse).output
        .generic[0]
    ).toBe(local.item);
  });

  it('captures an unread snapshot before mutable chunk event edits', async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    let snapshot: PublicChatState;
    instance.on({
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: (event: any) => {
        snapshot = instance.state.get();
        event.data.messageItem.user_defined.value = 'after';
      },
    });
    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: 'chunk-owned' },
      partial_item: {
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { value: 'before' },
        streaming_metadata: { id: 'item' },
      },
    });
    const oldMessage = snapshot.messages.find(
      (message) => message.id === 'chunk-owned'
    ) as MessageResponse;
    const currentMessage = instance.state
      .get()
      .messages.find(
        (message) => message.id === 'chunk-owned'
      ) as MessageResponse;
    expect(oldMessage.output.generic[0].user_defined.value).toBe('before');
    expect(currentMessage.output.generic[0].user_defined.value).toBe('after');
  });

  it.each([BusEventType.USER_DEFINED_RESPONSE, BusEventType.RECEIVE])(
    'captures unread snapshots before supported edits in %s',
    async (type) => {
      const { instance } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      let snapshot: PublicChatState;
      instance.on({
        type,
        handler: (event: any) => {
          snapshot = instance.state.get();
          const item =
            type === BusEventType.RECEIVE
              ? event.data.output.generic[0]
              : event.data.message;
          item.user_defined.value = 'after';
        },
      });
      await instance.messaging.upsertMessage(
        'owned',
        MessageState.COMPLETE,
        () => ({
          id: 'owned',
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
      const oldMessage = snapshot.messages.find(
        (message) => message.id === 'owned'
      ) as MessageResponse;
      const currentMessage = instance.state
        .get()
        .messages.find((message) => message.id === 'owned') as MessageResponse;
      expect(oldMessage.output.generic[0].user_defined.value).toBe('before');
      expect(currentMessage.output.generic[0].user_defined.value).toBe('after');
      expect(Object.isFrozen(oldMessage.output.generic[0].user_defined)).toBe(
        true
      );
    }
  );

  it.each(['unread', 'fresh'])(
    'keeps a %s snapshot isolated from customSendMessage mutations',
    async (snapshotKind) => {
      let snapshot: PublicChatState;
      let requestID: string;
      const customSendMessage = jest.fn((request, _options, instance) => {
        requestID = request.id;
        const unread = instance.state.get();
        request.input.text = 'Changed by the host';
        snapshot = snapshotKind === 'unread' ? unread : instance.state.get();
      });
      const { instance } = await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        messaging: { customSendMessage, skipWelcome: true },
      });

      await act(async () => {
        await instance.send('Original request');
      });

      expect(customSendMessage).toHaveBeenCalledTimes(1);
      expect(
        snapshot.messages.find((message) => message.id === requestID)
      ).toMatchObject({ input: { text: 'Original request' } });
    }
  );

  it('keeps legacy reads live without replacing the snapshot being published', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const pinned: number[] = [];
    const later: number[] = [];
    let live: number;
    let nested = false;
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: () => {
        if (!nested) {
          nested = true;
          instance.updateIsMessageLoadingCounter('increase');
          live = instance.getState().isMessageLoadingCounter;
          pinned.push(instance.state.get().isMessageLoadingCounter);
        }
      },
    });
    instance.state.subscribe(() =>
      later.push(instance.state.get().isMessageLoadingCounter)
    );
    act(() =>
      store.dispatch(
        actions.updatePersistedState({ showUnreadIndicator: true })
      )
    );
    expect(live).toBe(1);
    expect(pinned).toEqual([0]);
    expect(later).toEqual([0, 1]);
  });

  it('provides stable bound reads and agrees with getState', async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const { get, subscribe } = instance.state;

    expect(get()).toBe(get());
    expect(get()).toBe(instance.getState());
    expect(typeof subscribe(jest.fn())).toBe('function');
  });

  it('notifies independent registrations only for public changes', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const listener = jest.fn();
    const nextUnread = !instance.state.get().showUnreadIndicator;
    const unsubscribeFirst = instance.state.subscribe(listener);
    instance.state.subscribe(listener);

    expect(listener).not.toHaveBeenCalled();
    act(() => {
      store.dispatch(
        actions.setAppStateValue('announceMessage', {
          messageText: 'Private update',
        })
      );
    });
    expect(listener).not.toHaveBeenCalled();

    unsubscribeFirst();
    unsubscribeFirst();
    act(() => {
      store.dispatch(
        actions.updatePersistedState({ showUnreadIndicator: nextUnread })
      );
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith();
  });

  it('selects changed values with default and custom equality', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const selected = jest.fn();
    const buckets = jest.fn();
    const nextUnread = !instance.state.get().showUnreadIndicator;
    instance.state.select((state) => state.showUnreadIndicator, selected);
    instance.state.select((state) => state.isMessageLoadingCounter, buckets, {
      isEqual: (left, right) => Math.floor(left / 2) === Math.floor(right / 2),
    });

    expect(selected).not.toHaveBeenCalled();
    expect(buckets).not.toHaveBeenCalled();
    act(() => {
      store.dispatch(
        actions.updatePersistedState({ showUnreadIndicator: nextUnread })
      );
      instance.updateIsMessageLoadingCounter('increase');
    });
    expect(selected).toHaveBeenCalledWith(nextUnread);
    expect(buckets).not.toHaveBeenCalled();

    act(() => instance.updateIsMessageLoadingCounter('increase'));
    expect(buckets).toHaveBeenCalledWith(2);
  });

  it('throws an initial selector error and allows unsubscribe during delivery', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    expect(() =>
      instance.state.select(() => {
        throw new Error('initial selector failure');
      }, jest.fn())
    ).toThrow('initial selector failure');

    const listener = jest.fn();
    const firstUnread = !instance.state.get().showUnreadIndicator;
    let unsubscribe = () => {};
    unsubscribe = instance.state.select(
      (state) => state.showUnreadIndicator,
      (value) => {
        listener(value);
        unsubscribe();
      }
    );
    act(() => {
      store.dispatch(
        actions.updatePersistedState({ showUnreadIndicator: firstUnread })
      );
      store.dispatch(
        actions.updatePersistedState({ showUnreadIndicator: !firstUnread })
      );
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps the legacy event snapshots aligned with the state reader', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const events: BusEventStateChange[] = [];
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event) => events.push(event as BusEventStateChange),
    });
    const previous = instance.state.get();
    const nextUnread = !previous.showUnreadIndicator;

    act(() => {
      store.dispatch(
        actions.updatePersistedState({ showUnreadIndicator: nextUnread })
      );
    });

    const lastEvent = events[events.length - 1];
    expect(lastEvent?.previousState).toBe(previous);
    expect(lastEvent?.newState).toBe(instance.state.get());
    expect(instance.getState()).toBe(instance.state.get());
  });
  it('does not notify a messages selector for a status-only change', async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const listener = jest.fn();
    const initial = instance.state.get().messages;
    const unsubscribe = instance.state.select(
      (state) => state.messages,
      listener
    );
    act(() =>
      serviceManager.conversationLifecycleService.requestStarted('request')
    );
    expect(instance.state.get().status).toBe('submitted');
    expect(instance.state.get().messages).toBe(initial);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

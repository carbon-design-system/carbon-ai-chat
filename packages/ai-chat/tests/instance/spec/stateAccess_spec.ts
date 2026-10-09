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
});

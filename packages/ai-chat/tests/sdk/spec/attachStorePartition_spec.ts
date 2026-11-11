/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  attachStorePartition,
  type PartitionReducer,
} from '../../../src/sdk/internal';
import {
  createAppStore,
  type AppStore,
  type UnknownAction,
} from '../../../src/sdk/store/appStore';

interface ConversationShape {
  count: number;
  label: string;
}

interface PartShape {
  seenCount: number;
  opened: boolean;
}

const conversationReducer = (
  state: ConversationShape,
  action: UnknownAction
): ConversationShape => {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1 };
    case 'rename':
      return { ...state, label: action.label as string };
    case 'replace':
      // Builds a fresh object, so it drops any partition value.
      return { count: state.count, label: 'replaced' };
    default:
      return state;
  }
};

// Mirrors each conversation count it sees, and opens on its own action.
const partReducer: PartitionReducer<PartShape, ConversationShape> = (
  state,
  action,
  after
) => {
  if (action.type === 'open') {
    return { ...state, opened: true };
  }
  if (after.count !== state.seenCount) {
    return { ...state, seenCount: after.count };
  }
  return state;
};

type Root = ConversationShape & { view?: PartShape };

function createChat() {
  const store = createAppStore<ConversationShape>(conversationReducer, {
    count: 0,
    label: 'start',
  });
  return { store };
}

const viewOf = (store: AppStore<ConversationShape>) =>
  (store.getState() as Root).view;

describe('attachStorePartition', () => {
  it('adds the partition under its key and notifies once', () => {
    const chat = createChat();
    const listener = jest.fn();
    chat.store.subscribe(listener);

    const added = attachStorePartition(chat, 'view', partReducer, {
      seenCount: 0,
      opened: false,
    });

    expect(added).toBe(true);
    expect(viewOf(chat.store)).toEqual({ seenCount: 0, opened: false });
    expect(chat.store.getState().count).toBe(0);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('calls the reducer with the conversation state after the dispatch', () => {
    const chat = createChat();
    const reducer = jest.fn(partReducer);
    attachStorePartition(chat, 'view', reducer, {
      seenCount: 0,
      opened: false,
    });

    chat.store.dispatch({ type: 'increment' });

    expect(reducer).toHaveBeenCalledTimes(1);
    const [part, action, after] = reducer.mock.calls[0];
    expect(part).toEqual({ seenCount: 0, opened: false });
    expect(action).toEqual({ type: 'increment' });
    expect(after.count).toBe(1);
    expect(viewOf(chat.store).seenCount).toBe(1);
  });

  it('notifies once when one dispatch changes both, with both current', () => {
    const chat = createChat();
    attachStorePartition(chat, 'view', partReducer, {
      seenCount: 0,
      opened: false,
    });
    const seen: Array<[number, number]> = [];
    chat.store.subscribe(() => {
      seen.push([chat.store.getState().count, viewOf(chat.store).seenCount]);
    });

    chat.store.dispatch({ type: 'increment' });

    expect(seen).toEqual([[1, 1]]);
  });

  it('notifies for a partition-only change and keeps unchanged references', () => {
    const chat = createChat();
    attachStorePartition(chat, 'view', partReducer, {
      seenCount: 0,
      opened: false,
    });
    const listener = jest.fn();
    chat.store.subscribe(listener);
    const before = chat.store.getState();
    const partBefore = viewOf(chat.store);

    chat.store.dispatch({ type: 'unknown' });
    expect(chat.store.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();

    chat.store.dispatch({ type: 'rename', label: 'next' });
    expect(viewOf(chat.store)).toBe(partBefore);
    expect(listener).toHaveBeenCalledTimes(1);

    chat.store.dispatch({ type: 'open' });
    expect(viewOf(chat.store)).toEqual({ seenCount: 0, opened: true });
    expect(chat.store.getState().label).toBe('next');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the same key is attached to the same chat again', () => {
    const chat = createChat();
    attachStorePartition(chat, 'view', partReducer, {
      seenCount: 0,
      opened: false,
    });
    chat.store.dispatch({ type: 'open' });
    const state = chat.store.getState();
    const listener = jest.fn();
    chat.store.subscribe(listener);
    const second = jest.fn(partReducer);

    const added = attachStorePartition(chat, 'view', second, {
      seenCount: 99,
      opened: false,
    });
    chat.store.dispatch({ type: 'increment' });

    expect(added).toBe(false);
    expect(second).not.toHaveBeenCalled();
    expect(state).not.toBe(chat.store.getState());
    expect(viewOf(chat.store)).toEqual({ seenCount: 1, opened: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps the partition when the conversation reducer builds a fresh state', () => {
    const chat = createChat();
    attachStorePartition(chat, 'view', partReducer, {
      seenCount: 0,
      opened: true,
    });

    chat.store.dispatch({ type: 'replace' });

    expect(chat.store.getState().label).toBe('replaced');
    expect(viewOf(chat.store)).toEqual({ seenCount: 0, opened: true });
  });

  it('keeps partitions per chat', () => {
    const first = createChat();
    const second = createChat();
    attachStorePartition(first, 'view', partReducer, {
      seenCount: 0,
      opened: false,
    });

    expect(viewOf(second.store)).toBeUndefined();
    expect(
      attachStorePartition(second, 'view', partReducer, {
        seenCount: 0,
        opened: false,
      })
    ).toBe(true);
  });

  it('refuses a key the conversation state already uses', () => {
    const chat = createChat();
    expect(() =>
      attachStorePartition(chat, 'count', partReducer, {
        seenCount: 0,
        opened: false,
      })
    ).toThrow('The store already has a "count" value.');
  });

  it('refuses a store that createAppStore did not make', () => {
    const store: AppStore<ConversationShape> = {
      getState: () => ({ count: 0, label: 'mock' }),
      dispatch: (action) => action,
      subscribe: () => () => {},
    };
    expect(() =>
      attachStorePartition({ store }, 'view', partReducer, {
        seenCount: 0,
        opened: false,
      })
    ).toThrow('Only a store from createAppStore takes partitions.');
  });
});

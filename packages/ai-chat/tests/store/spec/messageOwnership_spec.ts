/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';
import { makeConfigStore } from '../../test_helpers';
import { createAppStore } from '../../../src/chat/store/appStore';
import actions from '../../../src/chat/store/actions';
import {
  captureMessageOwnership,
  enableMessageOwnership,
  isHumanAgentLocalOwner,
  isHumanAgentMessageOwner,
  markHumanAgentIngress,
  retainHistoryOwnership,
} from '../../../src/chat/store/messageOwnership';
import {
  MessageResponseTypes,
  HumanAgentMessageType,
  type MessageResponse,
} from '../../../src/types/messaging/Messages';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import type { AppStateMessages } from '../../../src/types/state/AppState';

function pair(id = 'message', localID = 'local') {
  const item = { response_type: MessageResponseTypes.TEXT as const, text: id };
  const message: MessageResponse = {
    id,
    history: {},
    output: { generic: [item] },
  };
  const local: LocalMessageItem = {
    fullMessageID: id,
    item,
    ui_state: { id: localID },
  };
  return { message, local };
}

it('classifies ingress independently of caller flags and keeps callback/metadata clones owned', () => {
  const store = makeConfigStore({});
  const assistant = pair('assistant', 'assistant-local');
  assistant.local.item.agent_message_type =
    HumanAgentMessageType.FROM_HUMAN_AGENT;
  store.dispatch(
    actions.addLocalMessageItem(assistant.local, assistant.message, true)
  );
  expect(isHumanAgentMessageOwner(store, 'assistant')).toBe(false);
  expect(isHumanAgentLocalOwner(store, 'assistant-local')).toBe(false);
  const agent = pair(); // The HAA caller's pre-receive handler may remove its display flag.
  store.dispatch(
    markHumanAgentIngress(
      actions.addLocalMessageItem(agent.local, agent.message, true)
    )
  );
  store.dispatch(actions.updateMessage(cloneDeep(agent.message)));
  store.dispatch(actions.updateLocalMessageItem(cloneDeep(agent.local)));
  store.dispatch(
    actions.mergeMessageHistory('message', {
      feedback: { vote: { is_positive: true } },
    })
  );
  expect(isHumanAgentMessageOwner(store, 'message')).toBe(true);
  expect(isHumanAgentLocalOwner(store, 'local')).toBe(true);
});

it('publishes core takeover before subscribers and respects reentrant removal/recreation', () => {
  const store = makeConfigStore({});
  const { local, message } = pair();
  store.dispatch(
    markHumanAgentIngress(actions.addLocalMessageItem(local, message, true))
  );
  const seen: boolean[] = [];
  let reentered = false;
  store.subscribe(() => {
    seen.push(isHumanAgentMessageOwner(store, message.id));
    if (!reentered) {
      reentered = true;
      store.dispatch(actions.removeMessages([message.id]));
      store.dispatch(
        markHumanAgentIngress(actions.addLocalMessageItem(local, message, true))
      );
    }
  });
  store.dispatch(actions.upsertMessage(message));
  expect(seen).toEqual([false, false, true]);
  expect(isHumanAgentMessageOwner(store, message.id)).toBe(true);
  expect(isHumanAgentLocalOwner(store, local.ui_state.id)).toBe(true);
  store.dispatch(actions.removeLocalMessageItem(local.ui_state.id));
  expect(isHumanAgentLocalOwner(store, local.ui_state.id)).toBe(false);
  store.dispatch(actions.restartConversation());
  expect(isHumanAgentMessageOwner(store, message.id)).toBe(false);
});

it('separates a later HAA local insertion from an already replaced core full message', () => {
  const store = makeConfigStore({});
  const { local, message } = pair();
  store.dispatch(
    markHumanAgentIngress(actions.addLocalMessageItem(local, message, true))
  );
  store.dispatch(actions.upsertMessage(message));
  store.dispatch(
    markHumanAgentIngress(actions.addLocalMessageItem(local, message, false))
  );
  expect(isHumanAgentMessageOwner(store, message.id)).toBe(false);
  expect(isHumanAgentLocalOwner(store, local.ui_state.id)).toBe(true);
});

it('retains captured current ownership in inserted history but treats restored history as core', () => {
  const store = makeConfigStore({});
  const { local, message } = pair();
  store.dispatch(
    markHumanAgentIngress(actions.addLocalMessageItem(local, message, true))
  );
  const captured = captureMessageOwnership(store);
  const state = store.getState();
  const history: AppStateMessages = cloneDeep({
    allMessagesByID: state.allMessagesByID,
    allMessageItemsByID: state.allMessageItemsByID,
    assistantMessageState: state.assistantMessageState,
  });
  const loaded = pair('loaded', 'loaded-local');
  loaded.local.item.agent_message_type = HumanAgentMessageType.FROM_HUMAN_AGENT;
  history.allMessagesByID.loaded = loaded.message;
  history.allMessageItemsByID['loaded-local'] = loaded.local;
  store.dispatch(actions.upsertMessage(message));
  store.dispatch(
    retainHistoryOwnership(actions.hydrateMessageHistory(history), captured)
  );
  expect(isHumanAgentMessageOwner(store, message.id)).toBe(true);
  expect(isHumanAgentLocalOwner(store, local.ui_state.id)).toBe(true);
  expect(isHumanAgentMessageOwner(store, 'loaded')).toBe(false);
  expect(isHumanAgentLocalOwner(store, 'loaded-local')).toBe(false);
  store.dispatch(actions.hydrateMessageHistory(history));
  expect(isHumanAgentMessageOwner(store, message.id)).toBe(false);
  expect(isHumanAgentLocalOwner(store, local.ui_state.id)).toBe(false);
});

it('transfers ownership for same-state core writes without scanning sibling message content', () => {
  const seed = makeConfigStore({}).getState();
  const first = pair();
  const sibling = pair('sibling', 'sibling-local');
  const noScan = <T extends object>(value: T): T =>
    new Proxy(value, {
      ownKeys: () => {
        throw new Error('transcript scan');
      },
    });
  seed.allMessagesByID = noScan({
    message: first.message,
    sibling: sibling.message,
  });
  seed.allMessageItemsByID = noScan({
    local: first.local,
    'sibling-local': sibling.local,
  });
  const reducer = jest.fn((state) => state);
  const store = createAppStore(reducer, seed);
  enableMessageOwnership(store);
  store.dispatch(
    markHumanAgentIngress(
      actions.addLocalMessageItem(first.local, first.message, true)
    )
  );
  store.dispatch(
    markHumanAgentIngress(
      actions.addLocalMessageItem(sibling.local, sibling.message, true)
    )
  );
  const listener = jest.fn();
  store.subscribe(listener);
  const visited: unknown[] = [];
  const setIterator = Set.prototype[Symbol.iterator];
  const mapIterator = Map.prototype[Symbol.iterator];
  const sets = jest
    .spyOn(Set.prototype, Symbol.iterator)
    .mockImplementation(function* (
      this: Set<unknown>
    ): Generator<unknown, undefined, unknown> {
      for (const value of setIterator.call(this)) {
        visited.push(value);
        yield value;
      }
      return undefined;
    });
  const maps = jest
    .spyOn(Map.prototype, Symbol.iterator)
    .mockImplementation(function* (
      this: Map<unknown, unknown>
    ): Generator<[unknown, unknown], undefined, unknown> {
      for (const value of mapIterator.call(this)) {
        visited.push(value);
        yield value;
      }
      return undefined;
    });
  try {
    for (let index = 0; index < 100; index++) {
      store.dispatch(actions.upsertMessage(first.message, true));
    }
  } finally {
    sets.mockRestore();
    maps.mockRestore();
  }
  expect(visited).toEqual(['local']);
  expect(listener).not.toHaveBeenCalled();
  expect(store.getState()).toBe(seed);
  expect(reducer).toHaveBeenCalledTimes(102);
  expect(isHumanAgentMessageOwner(store, first.message.id)).toBe(false);
  expect(isHumanAgentLocalOwner(store, first.local.ui_state.id)).toBe(false);
  expect(isHumanAgentMessageOwner(store, sibling.message.id)).toBe(true);
  expect(isHumanAgentLocalOwner(store, sibling.local.ui_state.id)).toBe(true);
});

it('leaves generic stores unregistered and does not transfer ownership when the reducer throws', () => {
  const seed = makeConfigStore({}).getState();
  const { local, message } = pair();
  seed.allMessagesByID = { message };
  seed.allMessageItemsByID = { local };
  const reducer = jest.fn((state) => state);
  const store = createAppStore(reducer, seed);
  const ingress = markHumanAgentIngress(
    actions.addLocalMessageItem(local, message, true)
  );
  expect(store.dispatch(ingress)).toBe(ingress);
  expect(isHumanAgentMessageOwner(store, message.id)).toBe(false);
  expect(reducer).toHaveBeenCalledTimes(1);
  enableMessageOwnership(store);
  store.dispatch(ingress);
  expect(isHumanAgentMessageOwner(store, message.id)).toBe(true);
  const failure = new Error('reducer failed');
  reducer.mockImplementationOnce(() => {
    throw failure;
  });
  const listener = jest.fn();
  store.subscribe(listener);
  expect(() => store.dispatch(actions.upsertMessage(message))).toThrow(failure);
  expect(store.getState()).toBe(seed);
  expect(isHumanAgentMessageOwner(store, message.id)).toBe(true);
  expect(listener).not.toHaveBeenCalled();
  expect(reducer).toHaveBeenCalledTimes(3);
});

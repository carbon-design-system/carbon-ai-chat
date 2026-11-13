/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { makeConfigStore } from '../../test_helpers';
import actions from '../../../src/sdk/store/actions';
import {
  isHumanAgentLocalOwner,
  isHumanAgentMessageOwner,
  markHumanAgentIngress,
} from '../../../src/sdk/store/messageOwnership';
import {
  MessageResponseTypes,
  type MessageResponse,
} from '../../../src/types/messaging/Messages';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';

function messagePair() {
  const message: MessageResponse = {
    id: 'reused-message',
    history: {},
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Answer' }],
    },
  };
  const local: LocalMessageItem = {
    fullMessageID: message.id,
    item: message.output.generic[0],
    ui_state: { id: 'reused-local' },
  };
  return { message, local };
}

it('clears live full and local HAA ownership on restart before assistant ID reuse', () => {
  const store = makeConfigStore({});
  const { message, local } = messagePair();
  store.dispatch(
    markHumanAgentIngress(actions.addLocalMessageItem(local, message, true))
  );
  expect(store.getState().allMessageItemsByID[local.ui_state.id]).toBe(local);
  expect(isHumanAgentMessageOwner(store, message.id)).toBe(true);
  expect(isHumanAgentLocalOwner(store, local.ui_state.id)).toBe(true);

  store.dispatch(actions.restartConversation());

  expect(store.getState().allMessagesByID[message.id]).toBeUndefined();
  expect(
    store.getState().allMessageItemsByID[local.ui_state.id]
  ).toBeUndefined();
  expect(isHumanAgentMessageOwner(store, message.id)).toBe(false);
  expect(isHumanAgentLocalOwner(store, local.ui_state.id)).toBe(false);

  const replacement = messagePair();
  store.dispatch(
    actions.addLocalMessageItem(replacement.local, replacement.message, true)
  );
  expect(store.getState().allMessagesByID[message.id]).toBe(
    replacement.message
  );
  expect(store.getState().allMessageItemsByID[local.ui_state.id]).toBe(
    replacement.local
  );
  expect(isHumanAgentMessageOwner(store, message.id)).toBe(false);
  expect(isHumanAgentLocalOwner(store, local.ui_state.id)).toBe(false);
});

it('publishes full and local ownership before listeners remove and recreate the same IDs', () => {
  const store = makeConfigStore({});
  const { message, local } = messagePair();
  store.dispatch(
    markHumanAgentIngress(actions.addLocalMessageItem(local, message, true))
  );
  const observed: {
    messagePresent: boolean;
    fullOwner: boolean;
    localOwner: boolean;
  }[] = [];
  let reentered = false;
  const unsubscribe = store.subscribe(() => {
    observed.push({
      messagePresent: Boolean(store.getState().allMessagesByID[message.id]),
      fullOwner: isHumanAgentMessageOwner(store, message.id),
      localOwner: isHumanAgentLocalOwner(store, local.ui_state.id),
    });
    if (!reentered) {
      reentered = true;
      store.dispatch(actions.removeMessages([message.id]));
      store.dispatch(
        markHumanAgentIngress(actions.addLocalMessageItem(local, message, true))
      );
    }
  });

  try {
    store.dispatch(actions.upsertMessage(message));
    expect(observed).toEqual([
      { messagePresent: true, fullOwner: false, localOwner: false },
      { messagePresent: false, fullOwner: false, localOwner: false },
      { messagePresent: true, fullOwner: true, localOwner: true },
    ]);
    expect(store.getState().allMessagesByID[message.id]).toBe(message);
    expect(store.getState().allMessageItemsByID[local.ui_state.id]).toBe(local);
    expect(isHumanAgentMessageOwner(store, message.id)).toBe(true);
    expect(isHumanAgentLocalOwner(store, local.ui_state.id)).toBe(true);
  } finally {
    unsubscribe();
  }
});

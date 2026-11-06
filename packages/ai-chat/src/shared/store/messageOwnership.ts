/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ConversationState } from '../../types/state/ConversationState';
import type { Message, MessageResponse } from '../../types/messaging/Messages';
import type { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import type { AppStore, UnknownAction } from './appStore';
import {
  ADD_MESSAGE,
  ADD_LOCAL_MESSAGE_ITEM,
  UPSERT_MESSAGE,
  HYDRATE_MESSAGE_HISTORY,
  REMOVE_MESSAGES,
  REMOVE_LOCAL_MESSAGE_ITEM,
  RESTART_CONVERSATION,
  UPDATE_MESSAGE,
  UPDATE_LOCAL_MESSAGE_ITEM,
} from './messageActionTypes';

interface Ownership {
  messages: Set<string>;
  locals: Map<string, string>;
  localsByMessage: Map<string, Set<string>>;
}

const stores = new WeakMap<object, Ownership>();
const humanAgentIngress = new WeakSet<object>();
const retainedCloneOwnership = new WeakMap<object, boolean>();
const retainedHistory = new WeakMap<object, Ownership>();

function emptyOwnership(): Ownership {
  return { messages: new Set(), locals: new Map(), localsByMessage: new Map() };
}

function removeLocal(ownership: Ownership, localID: string) {
  const messageID = ownership.locals.get(localID);
  if (messageID !== undefined) {
    const ids = ownership.localsByMessage.get(messageID);
    ids?.delete(localID);
    if (!ids?.size) {
      ownership.localsByMessage.delete(messageID);
    }
    ownership.locals.delete(localID);
  }
}

function addLocal(ownership: Ownership, localID: string, messageID: string) {
  removeLocal(ownership, localID);
  ownership.locals.set(localID, messageID);
  let ids = ownership.localsByMessage.get(messageID);
  if (!ids) {
    ids = new Set();
    ownership.localsByMessage.set(messageID, ids);
  }
  ids.add(localID);
}

function clearMessage(ownership: Ownership, messageID: string) {
  ownership.messages.delete(messageID);
  const ids = ownership.localsByMessage.get(messageID);
  if (ids) {
    for (const id of ids) {
      ownership.locals.delete(id);
    }
    ownership.localsByMessage.delete(messageID);
  }
}

/** Tags the actual HAA insertion action without adding fields to its payload. */
export function markHumanAgentIngress<T extends object>(action: T): T {
  humanAgentIngress.add(action);
  return action;
}

/** Captured once with history's current state, before its asynchronous load. */
export function captureMessageOwnership(
  store: AppStore<ConversationState>
): Ownership {
  const current = stores.get(store);
  const captured = emptyOwnership();
  if (current) {
    captured.messages = new Set(current.messages);
    for (const [localID, messageID] of current.locals) {
      addLocal(captured, localID, messageID);
    }
  }
  return captured;
}

export function retainHistoryOwnership<T extends object>(
  action: T,
  ownership: Ownership
): T {
  retainedHistory.set(action, ownership);
  return action;
}

export function isHumanAgentMessageOwner(
  store: AppStore<ConversationState>,
  messageID: string
): boolean {
  return stores.get(store)?.messages.has(messageID) ?? false;
}

export function isHumanAgentLocalOwner(
  store: AppStore<ConversationState>,
  localID: string
): boolean {
  return stores.get(store)?.locals.has(localID) ?? false;
}

/** Keeps the source entity's current owner when a mutable callback changes IDs. */
export function retainMessageCloneOwnership<T extends object>(
  action: T,
  store: AppStore<ConversationState>,
  sourceID: string
): T {
  retainedCloneOwnership.set(action, isHumanAgentMessageOwner(store, sourceID));
  return action;
}

export function retainLocalCloneOwnership<T extends object>(
  action: T,
  store: AppStore<ConversationState>,
  sourceID: string
): T {
  retainedCloneOwnership.set(action, isHumanAgentLocalOwner(store, sourceID));
  return action;
}

function applyOwnership(
  ownership: Ownership,
  state: ConversationState,
  action: UnknownAction
) {
  switch (action.type) {
    case RESTART_CONVERSATION:
    case HYDRATE_MESSAGE_HISTORY: {
      const retained =
        action.type === HYDRATE_MESSAGE_HISTORY
          ? retainedHistory.get(action)
          : undefined;
      ownership.messages = new Set();
      ownership.locals = new Map();
      ownership.localsByMessage = new Map();
      if (retained) {
        for (const id of retained.messages) {
          if (state.allMessagesByID[id]) {
            ownership.messages.add(id);
          }
        }
        for (const [id, messageID] of retained.locals) {
          if (state.allMessageItemsByID[id]?.fullMessageID === messageID) {
            addLocal(ownership, id, messageID);
          }
        }
      }
      break;
    }
    case REMOVE_MESSAGES:
      for (const id of action.messageIDs as string[]) {
        clearMessage(ownership, id);
      }
      break;
    case REMOVE_LOCAL_MESSAGE_ITEM:
      removeLocal(ownership, action.localMessageItemID as string);
      break;
    case UPDATE_MESSAGE:
      if (retainedCloneOwnership.has(action)) {
        const id = (action.message as Message).id;
        if (retainedCloneOwnership.get(action)) {
          ownership.messages.add(id);
        } else {
          ownership.messages.delete(id);
        }
      }
      break;
    case UPDATE_LOCAL_MESSAGE_ITEM: {
      const local = action.messageItem as LocalMessageItem;
      const isHumanAgent =
        retainedCloneOwnership.get(action) ??
        ownership.locals.has(local.ui_state.id);
      if (isHumanAgent) {
        addLocal(ownership, local.ui_state.id, local.fullMessageID);
      } else {
        removeLocal(ownership, local.ui_state.id);
      }
      break;
    }
    case ADD_MESSAGE:
      ownership.messages.delete((action.message as Message).id);
      break;
    case UPSERT_MESSAGE: {
      const message = action.message as Message;
      // A request passed to this reducer is ignored; valid core writes transfer
      // ownership even when the reducer retains the previous message/local refs.
      if ((message as MessageResponse).output !== undefined) {
        clearMessage(ownership, message.id);
      }
      break;
    }
    case ADD_LOCAL_MESSAGE_ITEM: {
      const message = action.message as Message;
      const local = action.messageItem as LocalMessageItem;
      const isHumanAgent = humanAgentIngress.has(action);
      if (action.addMessage) {
        if (isHumanAgent) {
          ownership.messages.add(message.id);
        } else {
          ownership.messages.delete(message.id);
        }
      }
      if (state.allMessageItemsByID[local.ui_state.id] === local) {
        if (isHumanAgent) {
          addLocal(ownership, local.ui_state.id, message.id);
        } else {
          removeLocal(ownership, local.ui_state.id);
        }
      }
      break;
    }
  }
}

/** Enables private ownership bookkeeping only for the chat's store. */
export function enableMessageOwnership(
  store: AppStore<ConversationState>
): void {
  stores.set(store, emptyOwnership());
}

/** Called by native store dispatch after commit and before subscriber delivery. */
export function commitMessageOwnership(
  store: object,
  nextState: unknown,
  action: UnknownAction
): void {
  const ownership = stores.get(store);
  if (ownership) {
    applyOwnership(ownership, nextState as ConversationState, action);
  }
}

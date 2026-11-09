/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ConversationState } from '../../types/state/AppState';
import type { AppStore, UnknownAction } from './appStore';

export type MessageOwnershipReceipt =
  | { kind: 'reset' | 'history' }
  | { kind: 'remove'; messageIDs: string[]; localIDs: string[] }
  | { kind: 'removeLocal'; localID: string }
  | { kind: 'updateMessage' | 'addMessage' | 'upsert'; messageID: string }
  | { kind: 'updateLocal'; localID: string; parentID: string }
  | {
      kind: 'addLocal';
      messageID?: string;
      local?: { id: string; parentID: string };
    };

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

function restoreOwnership(ownership: Ownership, retained?: Ownership) {
  ownership.messages = new Set(retained?.messages);
  ownership.locals = new Map();
  ownership.localsByMessage = new Map();
  if (retained) {
    for (const [id, parentID] of retained.locals) {
      addLocal(ownership, id, parentID);
    }
  }
}

function transferMessage(ownership: Ownership, id: string, action: object) {
  if (!retainedCloneOwnership.has(action)) {
    return;
  }
  if (retainedCloneOwnership.get(action)) {
    ownership.messages.add(id);
  } else {
    ownership.messages.delete(id);
  }
}

function transferLocal(
  ownership: Ownership,
  localID: string,
  parentID: string,
  action: object
) {
  const isHumanAgent =
    retainedCloneOwnership.get(action) ?? ownership.locals.has(localID);
  if (isHumanAgent) {
    addLocal(ownership, localID, parentID);
  } else {
    removeLocal(ownership, localID);
  }
}

function applyInsertion(
  ownership: Ownership,
  receipt: Extract<MessageOwnershipReceipt, { kind: 'addLocal' }>,
  action: object
) {
  const isHumanAgent = humanAgentIngress.has(action);
  if (receipt.messageID !== undefined) {
    if (isHumanAgent) {
      ownership.messages.add(receipt.messageID);
    } else {
      ownership.messages.delete(receipt.messageID);
    }
  }
  if (receipt.local) {
    if (isHumanAgent) {
      addLocal(ownership, receipt.local.id, receipt.local.parentID);
    } else {
      removeLocal(ownership, receipt.local.id);
    }
  }
}

function applyOwnership(
  ownership: Ownership,
  receipt: MessageOwnershipReceipt,
  action: UnknownAction
) {
  switch (receipt.kind) {
    case 'reset':
      return restoreOwnership(ownership);
    case 'history':
      return restoreOwnership(ownership, retainedHistory.get(action));
    case 'remove':
      receipt.messageIDs.forEach((id) => clearMessage(ownership, id));
      receipt.localIDs.forEach((id) => removeLocal(ownership, id));
      return;
    case 'removeLocal':
      return removeLocal(ownership, receipt.localID);
    case 'updateMessage':
      return transferMessage(ownership, receipt.messageID, action);
    case 'updateLocal':
      return transferLocal(
        ownership,
        receipt.localID,
        receipt.parentID,
        action
      );
    case 'addMessage':
      ownership.messages.delete(receipt.messageID);
      return;
    case 'upsert':
      return clearMessage(ownership, receipt.messageID);
    case 'addLocal':
      return applyInsertion(ownership, receipt, action);
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
  receipt: MessageOwnershipReceipt | undefined,
  action: UnknownAction
): void {
  const ownership = stores.get(store);
  if (ownership && receipt) {
    applyOwnership(ownership, receipt, action);
  }
}

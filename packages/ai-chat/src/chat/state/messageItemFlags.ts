/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The view's per-item flags, keyed by public item ID. The chat's conversation
 * actions write them, so they keep the lifetime they had on the item's local
 * copy: an option chosen in an item stays chosen until the chat builds a new
 * copy of that item, removes it, or loads new history.
 */

import { conversationActions } from '../../sdk/store/conversationActions';
import { isResponse } from '../../sdk/utils/messageUtils';
import {
  itemIDsByLocalID,
  planStateMessageItems,
} from '../../sdk/utils/publicMessageItems';
import type { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import type { Message, MessageRequest } from '../../types/messaging/Messages';
import type { ConversationState } from '../../types/state/AppState';
import type { ViewPartitionState } from '../../types/state/ViewPartitionState';
import type ObjectMap from '../../types/utilities/ObjectMap';

type ItemFlags = ViewPartitionState['messageItemFlags'];

/** No flags, for a cleared list and for a state made before the list existed. */
const NO_FLAGS: ItemFlags = Object.freeze({});

/** The local item each item ID of one message draws. */
function drawnItems(
  state: ConversationState,
  messageID: string
): Map<string, LocalMessageItem> {
  return new Map(
    planStateMessageItems(state, [messageID]).map((plan) => [
      plan.id,
      plan.local,
    ])
  );
}

function withoutItems(flags: ItemFlags, itemIDs: readonly string[]) {
  if (!itemIDs.length) {
    return flags;
  }
  const next = { ...flags };
  itemIDs.forEach((itemID) => delete next[itemID]);
  return next;
}

/** The item IDs that have flags and belong to one of `messageIDs`. */
function flaggedItemsOf(flags: ItemFlags, messageIDs: ReadonlySet<string>) {
  return Object.keys(flags).filter((itemID) =>
    messageIDs.has(flags[itemID].messageID)
  );
}

/** Records the request a choice in a local item sent, under the item's ID. */
function setOptionSelected(
  flags: ItemFlags,
  after: ConversationState,
  localID: string,
  request: MessageRequest
): ItemFlags {
  const messageID = after.allMessageItemsByID[localID]?.fullMessageID;
  const itemID =
    messageID &&
    itemIDsByLocalID(planStateMessageItems(after, [messageID])).get(localID);
  if (!itemID) {
    return flags;
  }
  return {
    ...flags,
    [itemID]: { ...flags[itemID], messageID, optionSelected: request },
  };
}

/** Records each choice loaded history shows, after it replaced or joined the transcript. */
function loadHistory(
  flags: ItemFlags,
  after: ConversationState,
  insertsHistory: boolean,
  optionsSelected: ObjectMap<MessageRequest> = {}
): ItemFlags {
  const kept = insertsHistory || !Object.keys(flags).length ? flags : NO_FLAGS;
  const selected = Object.entries(optionsSelected);
  if (!selected.length) {
    return kept;
  }
  const itemIDs = itemIDsByLocalID(planStateMessageItems(after));
  const next = { ...kept };
  selected.forEach(([localID, request]) => {
    const itemID = itemIDs.get(localID);
    if (itemID) {
      next[itemID] = {
        ...next[itemID],
        messageID: after.allMessageItemsByID[localID].fullMessageID,
        optionSelected: request,
      };
    }
  });
  return next;
}

/**
 * Fits the flags of `message`'s items to a write. A flag follows the local
 * copy it was set on: it stays when the write kept that copy, moves with it
 * when the copy is now drawn under another item ID (such as after an item
 * was added before it), and goes when the write built a new copy or stopped
 * drawing the item.
 */
function followLocalCopies(
  flags: ItemFlags,
  message: Message,
  before: ConversationState,
  after: ConversationState
): ItemFlags {
  const flagged = flaggedItemsOf(flags, new Set([message.id]));
  if (!flagged.length) {
    return flags;
  }
  const was = drawnItems(before, message.id);
  const now = drawnItems(after, message.id);
  const idOfCopy = new Map(
    Array.from(now, ([itemID, local]) => [local, itemID])
  );
  const moved: [string, ItemFlags[string]][] = [];
  const changed = flagged.filter((itemID) => {
    const copy = was.get(itemID);
    const nextID = copy && idOfCopy.get(copy);
    if (nextID === itemID) {
      return false;
    }
    if (nextID) {
      moved.push([nextID, flags[itemID]]);
    }
    return true;
  });
  if (!changed.length) {
    return flags;
  }
  const next = { ...withoutItems(flags, changed) };
  moved.forEach(([itemID, itemFlags]) => {
    next[itemID] = itemFlags;
  });
  return next;
}

interface ItemWriteAction {
  type: string;
  message?: Message;
  isStreaming?: boolean;
  options?: { origin?: string };
}

/** Whether a write builds new local copies of a message's items. */
function rebuildsItems(action: ItemWriteAction): boolean {
  if (action.type === conversationActions.ADD_LOCAL_MESSAGE_ITEM) {
    return true;
  }
  // A streamed chunk only adds to an item's copy or adds a new item, which
  // keeps every flag the item has.
  return (
    action.type === conversationActions.UPSERT_MESSAGE &&
    isResponse(action.message) &&
    !(action.options?.origin === 'chunk' && action.isStreaming)
  );
}

/**
 * The flags after a conversation action. Each case keeps the lifetime the
 * flag had on the item's local copy.
 */
function reactToItemWrites(
  flags: ItemFlags,
  action: any,
  after: ConversationState,
  before: ConversationState
): ItemFlags {
  const current = flags ?? NO_FLAGS;
  const next = nextFlags(current, action, after, before);
  return next === current ? flags : next;
}

function nextFlags(
  flags: ItemFlags,
  action: any,
  after: ConversationState,
  before: ConversationState
): ItemFlags {
  switch (action.type) {
    case conversationActions.MESSAGE_SET_OPTION_SELECTED:
      return setOptionSelected(
        flags,
        after,
        action.messageID,
        action.sentMessage
      );
    case conversationActions.HYDRATE_MESSAGE_HISTORY:
      return loadHistory(
        flags,
        after,
        action.insertsHistory,
        action.optionsSelected
      );
    case conversationActions.RESTART_CONVERSATION:
      return Object.keys(flags).length ? NO_FLAGS : flags;
    case conversationActions.REMOVE_MESSAGES:
      return withoutItems(
        flags,
        flaggedItemsOf(flags, new Set(action.messageIDs))
      );
    default:
      return rebuildsItems(action)
        ? followLocalCopies(flags, action.message, before, after)
        : flags;
  }
}

export { reactToItemWrites };

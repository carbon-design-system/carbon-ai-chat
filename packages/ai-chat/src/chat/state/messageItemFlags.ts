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
 * copy of that item, removes it, or loads new history. A new copy of a live
 * response's item waits to be announced once it shows settled.
 */

import { conversationActions } from '../../sdk/store/conversationActions';
import { SET_MESSAGE_ITEM_ANNOUNCED } from './actions';
import { isResponse } from '../../sdk/utils/messageUtils';
import {
  itemIDsByLocalID,
  planStateMessageItems,
  type ItemPlan,
} from '../../sdk/utils/publicMessageItems';
import type { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import type { Message, MessageRequest } from '../../types/messaging/Messages';
import type { ConversationState } from '../../types/state/AppState';
import type { ViewPartitionState } from '../../types/state/ViewPartitionState';
import type ObjectMap from '../../types/utilities/ObjectMap';

type ItemFlags = ViewPartitionState['messageItemFlags'];

/** No flags, for a cleared list and for a state made before the list existed. */
const NO_FLAGS: ItemFlags = Object.freeze({});

/**
 * The item plans of the message a write touched, in the states before and
 * after it, each planned at most once per write.
 */
interface WritePlans {
  before(): readonly ItemPlan[];
  after(): readonly ItemPlan[];
}

function writePlans(
  messageID: string,
  before: ConversationState,
  after: ConversationState
): WritePlans {
  const planned: { before?: ItemPlan[]; after?: ItemPlan[] } = {};
  return {
    before: () =>
      (planned.before ??= planStateMessageItems(before, [messageID])),
    after: () => (planned.after ??= planStateMessageItems(after, [messageID])),
  };
}

/** The local item each item ID of a plan list draws. */
function drawnItems(plans: readonly ItemPlan[]): Map<string, LocalMessageItem> {
  return new Map(plans.map((plan) => [plan.id, plan.local]));
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

/** The message and the public item ID of the item a local item draws, if it's drawn. */
function drawnItemOf(state: ConversationState, localID: string) {
  const messageID = state.allMessageItemsByID[localID]?.fullMessageID;
  const itemID =
    messageID &&
    itemIDsByLocalID(planStateMessageItems(state, [messageID])).get(localID);
  return itemID ? { messageID, itemID } : undefined;
}

/** Records the request a choice in a local item sent, under the item's ID. */
function setOptionSelected(
  flags: ItemFlags,
  after: ConversationState,
  localID: string,
  request: MessageRequest
): ItemFlags {
  const drawn = drawnItemOf(after, localID);
  if (!drawn) {
    return flags;
  }
  const { messageID, itemID } = drawn;
  return {
    ...flags,
    [itemID]: { ...flags[itemID], messageID, optionSelected: request },
  };
}

/** Records that a screen reader announced the item a local item draws. */
function setAnnounced(
  flags: ItemFlags,
  state: ConversationState,
  localID: string
): ItemFlags {
  const drawn = drawnItemOf(state, localID);
  if (!drawn) {
    return flags;
  }
  const { messageID, itemID } = drawn;
  const current = flags[itemID];
  if (current?.wasAnnounced && !current.needsAnnouncement) {
    return flags;
  }
  const announced = { ...current, messageID, wasAnnounced: true };
  delete announced.needsAnnouncement;
  return { ...flags, [itemID]: announced };
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
  flagged: readonly string[],
  plans: WritePlans
): ItemFlags {
  if (!flagged.length) {
    return flags;
  }
  const was = drawnItems(plans.before());
  const now = drawnItems(plans.after());
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
  options?: { origin?: string; received?: unknown };
}

/** Whether the chat announces a new copy of an item of `message`. */
function announcesNewCopy(message: Message | undefined, isStreaming: boolean) {
  return Boolean(
    message &&
    isResponse(message) &&
    !message.ui_state_internal?.from_history &&
    !isStreaming
  );
}

/**
 * Sets the announcement flags of the top-level copies a write built for
 * `message`, as the copies' builders did. A live response's new copy waits to
 * be announced unless it's still streaming. An upsert carries `wasAnnounced`
 * from the copy it replaced, which had the same local ID, so an item already
 * announced isn't announced again. Other writes start the flags over.
 *
 * @param flags The flags after they followed the write's local copies.
 * @param flagsBefore The flags before the write.
 * @param hadFlags Whether the message's items had flags before the write.
 */
function markNewCopies(
  flags: ItemFlags,
  flagsBefore: ItemFlags,
  hadFlags: boolean,
  action: ItemWriteAction,
  before: ConversationState,
  after: ConversationState,
  plans: WritePlans
): ItemFlags {
  const messageID = action.message.id;
  const isUpsert =
    action.type === conversationActions.UPSERT_MESSAGE &&
    !action.options?.received;
  const stored = isUpsert ? after.allMessagesByID[messageID] : action.message;
  const announces = announcesNewCopy(
    stored,
    isUpsert && Boolean(action.isStreaming)
  );
  const inherits = isUpsert && hadFlags;
  if (!announces && !inherits) {
    return flags;
  }
  const itemIDBefore = inherits ? itemIDsByLocalID(plans.before()) : undefined;
  const marked: Record<string, ItemFlags[string]> = {};
  plans.after().forEach(({ id, parentID, local }) => {
    const localID = local.ui_state.id;
    if (
      parentID !== undefined ||
      before.allMessageItemsByID[localID] === local
    ) {
      return;
    }
    const idBefore = itemIDBefore?.get(localID);
    const wasAnnounced = Boolean(
      idBefore && flagsBefore[idBefore]?.wasAnnounced
    );
    if (!announces && !wasAnnounced) {
      return;
    }
    marked[id] = wasAnnounced
      ? { messageID, wasAnnounced }
      : { messageID, needsAnnouncement: true };
  });
  return Object.keys(marked).length ? { ...flags, ...marked } : flags;
}

/**
 * Fits the flags of a message's items to a write that builds new copies of
 * them: flags follow the copies they were set on, and the new copies get
 * their announcement flags. Each state's plan of the message is made once.
 */
function reactToRebuild(
  flags: ItemFlags,
  action: ItemWriteAction,
  before: ConversationState,
  after: ConversationState
): ItemFlags {
  const messageID = action.message.id;
  const plans = writePlans(messageID, before, after);
  const flagged = flaggedItemsOf(flags, new Set([messageID]));
  return markNewCopies(
    followLocalCopies(flags, flagged, plans),
    flags,
    flagged.length > 0,
    action,
    before,
    after,
    plans
  );
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
 * The flags after a conversation action, or after the view recorded an
 * announcement. Each case keeps the lifetime the flag had on the item's local
 * copy.
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
    case SET_MESSAGE_ITEM_ANNOUNCED:
      return setAnnounced(flags, after, action.localItemID);
    default:
      return rebuildsItems(action)
        ? reactToRebuild(flags, action, before, after)
        : flags;
  }
}

export { reactToItemWrites };

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKMessageItem } from '../../types/instance/ChatSDKState';
import type { Message } from '../../types/messaging/Messages';

type MessageItems = readonly Readonly<ChatSDKMessageItem>[];

/**
 * Which of its parent's lists a nested item is in: `body` for a carousel's or a card's items, `footer`
 * for a card's buttons, or a grid cell by row and column.
 */
type NestedList = 'body' | 'footer' | { row: number; column: number };

const NO_ITEMS: MessageItems = Object.freeze([]);

/** The key of a nested list, as the item ID writes it after the parent's ID. */
function listKey(list: NestedList): string {
  if (typeof list === 'string') {
    return list;
  }
  return `cell:${list.row}.${list.column}`;
}

/**
 * The list a nested item's ID puts it in: `<parentID>:i:<index>` for a body item,
 * `<parentID>:f:<index>` for a footer item, and `<parentID>:i:<row>.<column>.<index>` for a grid cell
 * item.
 */
function listKeyOf(item: Readonly<ChatSDKMessageItem>): string {
  const [marker, position] = item.id.slice(item.parentID.length + 1).split(':');
  if (marker === 'f') {
    return 'footer';
  }
  const parts = position.split('.');
  return parts.length === 3 ? `cell:${parts[0]}.${parts[1]}` : 'body';
}

interface ItemIndex {
  topLevel: MessageItems;
  byID: ReadonlyMap<string, Readonly<ChatSDKMessageItem>>;
  /** Each parent's nested items, by list key, in order. */
  children: Map<string, Map<string, Readonly<ChatSDKMessageItem>[]>>;
}

/** Each `messageItems` array's index, built once per array. */
const indexes = new WeakMap<MessageItems, ItemIndex>();

function indexOf(messageItems: MessageItems): ItemIndex {
  let index = indexes.get(messageItems);
  if (!index) {
    const topLevel: Readonly<ChatSDKMessageItem>[] = [];
    const byID = new Map<string, Readonly<ChatSDKMessageItem>>();
    const children = new Map<
      string,
      Map<string, Readonly<ChatSDKMessageItem>[]>
    >();
    messageItems.forEach((item) => {
      byID.set(item.id, item);
      if (item.parentID === undefined) {
        topLevel.push(item);
        return;
      }
      const lists = children.get(item.parentID) ?? new Map();
      const key = listKeyOf(item);
      const list = lists.get(key) ?? [];
      list.push(item);
      lists.set(key, list);
      children.set(item.parentID, lists);
    });
    children.forEach((lists) => lists.forEach((list) => Object.freeze(list)));
    index = { topLevel: Object.freeze(topLevel), byID, children };
    indexes.set(messageItems, index);
  }
  return index;
}

/**
 * The items the message list draws as rows: those with no parent, in order. The same array comes back
 * for the same `messageItems`.
 */
function topLevelMessageItems(messageItems: MessageItems | undefined) {
  return messageItems ? indexOf(messageItems).topLevel : NO_ITEMS;
}

/**
 * The items nested in one list of a parent item, in order. The same array comes back for the same
 * `messageItems`.
 */
function nestedMessageItems(
  messageItems: MessageItems | undefined,
  parentID: string | undefined,
  list: NestedList
): MessageItems {
  if (!messageItems || parentID === undefined) {
    return NO_ITEMS;
  }
  return (
    indexOf(messageItems).children.get(parentID)?.get(listKey(list)) ?? NO_ITEMS
  );
}

/** The item with an ID, or `undefined`. */
function messageItemByID(
  messageItems: MessageItems | undefined,
  itemID: string | undefined
): Readonly<ChatSDKMessageItem> | undefined {
  return messageItems && itemID !== undefined
    ? indexOf(messageItems).byID.get(itemID)
    : undefined;
}

/** Each `messages` array by message ID, built once per array. */
const messageIndexes = new WeakMap<
  readonly Readonly<Message>[],
  ReadonlyMap<string, Readonly<Message>>
>();

/** The messages in public state, by ID. The same map comes back for the same `messages`. */
function messagesByID(
  messages: readonly Readonly<Message>[]
): ReadonlyMap<string, Readonly<Message>> {
  let index = messageIndexes.get(messages);
  if (!index) {
    index = new Map(messages.map((message) => [message.id, message]));
    messageIndexes.set(messages, index);
  }
  return index;
}

export {
  type NestedList,
  messageItemByID,
  messagesByID,
  nestedMessageItems,
  topLevelMessageItems,
};

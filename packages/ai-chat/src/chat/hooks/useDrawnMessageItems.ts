/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback, useRef } from 'react';

import type { ChatSDKMessageItem } from '../../types/instance/ChatSDKState';
import type { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import type { Message } from '../../types/messaging/Messages';
import type { AppState } from '../../types/state/AppState';
import {
  type NestedList,
  messageItemByID,
  nestedMessageItems,
} from '../utils/drawnMessageItems';
import { usePublicChatState } from './usePublicChatState';
import { useSelector } from './useSelector';
import { useServiceManager } from './useServiceManager';

/**
 * One item the message list draws: its entry in `instance.state.messageItems`, and the chat's own
 * local item and message behind it.
 */
interface DrawnMessageItem {
  /** The item's entry in `instance.state.messageItems`. */
  readonly messageItem: Readonly<ChatSDKMessageItem>;

  /** The chat's own local item the entry is built from. */
  readonly localMessageItem: LocalMessageItem;

  /** The chat's own message the item belongs to. */
  readonly message: Message;
}

function sameDrawnItems(
  left: readonly DrawnMessageItem[],
  right: readonly DrawnMessageItem[]
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (drawn, index) =>
        drawn.messageItem === right[index].messageItem &&
        drawn.localMessageItem === right[index].localMessageItem &&
        drawn.message === right[index].message
    )
  );
}

/**
 * The items to draw for these entries of `instance.state.messageItems`, in their order, each with the
 * chat's own local item and message. An entry the store no longer has is left out.
 *
 * The renderers still get the chat's own objects, not the public entry's frozen copies: the feedback
 * and custom events, the workspace panel, and the agent service hand them to the host, who can keep
 * them or edit them, and the chat writes back by local item ID. They also read a few internal flags
 * the entry doesn't carry, such as the welcome response mark and a streamed chunk's state. So this is
 * the list's one read of conversation data from the store, listed as a gap.
 *
 * The same array comes back while no entry, local item, or message changes.
 */
function useDrawnMessageItems(
  messageItems: readonly Readonly<ChatSDKMessageItem>[]
): readonly DrawnMessageItem[] {
  const { publicStateService } = useServiceManager();
  const selectDrawn = useCallback(
    (state: AppState) => {
      const drawn: DrawnMessageItem[] = [];
      messageItems.forEach((messageItem) => {
        const localID = publicStateService.localItemIDOf(messageItem.id, state);
        const localMessageItem =
          localID === undefined
            ? undefined
            : state.allMessageItemsByID[localID];
        const message = state.allMessagesByID[messageItem.messageID];
        if (localMessageItem && message) {
          drawn.push({ messageItem, localMessageItem, message });
        }
      });
      return drawn;
    },
    [messageItems, publicStateService]
  );
  const drawn = useSelector(selectDrawn, sameDrawnItems);
  // A new list of entries makes a new selector, which compares with the last value the hook
  // committed, not the last one it returned, so keep that here too.
  const last = useRef(drawn);
  if (last.current !== drawn && !sameDrawnItems(last.current, drawn)) {
    last.current = drawn;
  }
  return last.current;
}

/**
 * The public item ID of a local item the list draws, or `undefined` when it draws none.
 *
 * @param localItemID The local item's ID (`ui_state.id`).
 */
function useMessageItemID(localItemID: string): string | undefined {
  const { publicStateService } = useServiceManager();
  return useSelector((state: AppState) =>
    publicStateService.messageItemIDOf(localItemID, state)
  );
}

/**
 * The entry in `instance.state.messageItems` for a local item the list draws, or `undefined`.
 *
 * @param localItemID The local item's ID (`ui_state.id`).
 */
function useMessageItem(
  localItemID: string
): Readonly<ChatSDKMessageItem> | undefined {
  const itemID = useMessageItemID(localItemID);
  return usePublicChatState((state) =>
    messageItemByID(state.messageItems, itemID)
  );
}

/**
 * The items nested in one list of a drawn item, from `instance.state.messageItems`, in order.
 *
 * @param localItemID The parent's local item ID (`ui_state.id`).
 * @param list Which of the parent's lists.
 */
function useNestedMessageItems(
  localItemID: string,
  list: NestedList
): readonly DrawnMessageItem[] {
  const parentID = useMessageItemID(localItemID);
  const row = typeof list === 'string' ? undefined : list.row;
  const column = typeof list === 'string' ? undefined : list.column;
  const kind = typeof list === 'string' ? list : undefined;
  const nested = usePublicChatState((state) =>
    nestedMessageItems(state.messageItems, parentID, kind ?? { row, column })
  );
  return useDrawnMessageItems(nested);
}

export {
  type DrawnMessageItem,
  useDrawnMessageItems,
  useMessageItem,
  useNestedMessageItems,
};

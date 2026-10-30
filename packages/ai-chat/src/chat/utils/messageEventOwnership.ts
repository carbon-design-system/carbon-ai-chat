/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';
import cloneDeepWith from 'lodash-es/cloneDeepWith.js';
import isEqual from 'lodash-es/isEqual.js';
import type { Message } from '../../types/messaging/Messages';
import type { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import type { ServiceManager } from '../services/ServiceManager';
import actions from '../store/actions';

/** Keep writable event values separate from snapshots, then accept edits without retaining host aliases. */
export function captureMessageEvent(
  serviceManager: ServiceManager,
  message: Message,
  localItems: Record<string, LocalMessageItem>,
  values?: { message: Message; localItems: Record<string, LocalMessageItem> },
  isCurrent: () => boolean = () => true
) {
  const { store, restartCount } = serviceManager;
  const before = store.getState();
  const working = values ?? cloneDeep({ message, localItems });
  return {
    ...working,
    commit(onMessageCommit?: (message: Message) => void) {
      if (!isCurrent() || restartCount !== serviceManager.restartCount) {
        return;
      }
      let owned: typeof working;
      const own = () => (owned ??= cloneDeep(working));
      if (
        before.allMessagesByID[message.id] ===
          store.getState().allMessagesByID[message.id] &&
        !isEqual(message, working.message)
      ) {
        const committedMessage = own().message;
        onMessageCommit?.(committedMessage);
        store.dispatch(actions.updateMessage(committedMessage));
      }
      for (const [id, item] of Object.entries(localItems)) {
        if (!item || !working.localItems[id]) {
          continue;
        }
        if (!isCurrent() || restartCount !== serviceManager.restartCount) {
          return;
        }
        const current = store.getState().allMessageItemsByID[id];
        if (
          before.allMessageItemsByID[id] === current &&
          !isEqual(item, working.localItems[id])
        ) {
          store.dispatch(actions.updateLocalMessageItem(own().localItems[id]));
        } else if (
          current?.item === item.item &&
          !isEqual(item.item, working.localItems[id].item)
        ) {
          store.dispatch(
            actions.updateLocalMessageItem({
              ...current,
              item: own().localItems[id].item,
            })
          );
        }
      }
    },
  };
}

/** Retain caller message objects in event items while copying the chat's local metadata. */
export function eventLocalItems(
  storedMessage: object,
  message: object,
  localItems: Record<string, LocalMessageItem>,
  itemPairs: [object, object][] = []
) {
  return cloneDeepWith(
    localItems,
    eventValueMapper(storedMessage, message, itemPairs)
  );
}

/** Capture matching references before a handler can replace a caller field. */
export function eventValueMapper(
  storedMessage: object,
  message: object,
  itemPairs: [object, object][] = []
) {
  const counterparts = new WeakMap<object, object>();
  const pair = (stored: unknown, working: unknown) => {
    if (
      !stored ||
      !working ||
      typeof stored !== 'object' ||
      typeof working !== 'object' ||
      counterparts.has(stored)
    ) {
      return;
    }
    counterparts.set(stored, working);
    Object.keys(stored).forEach((key) =>
      pair(
        (stored as Record<string, unknown>)[key],
        (working as Record<string, unknown>)[key]
      )
    );
  };
  pair(storedMessage, message);
  itemPairs.forEach(([stored, working]) => pair(stored, working));
  return (value: unknown) =>
    value && typeof value === 'object' ? counterparts.get(value) : undefined;
}

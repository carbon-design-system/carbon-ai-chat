/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Which messages a store write changed, so the public projections rebuild only those. A writer that
 * knows which keys it replaced builds the new map with {@link withChangedKeys}. A reader holding
 * two versions of the message slices asks {@link changedMessageIDs}, and gets `undefined` when no
 * record links them, so it compares every message as before.
 */

import type { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import type { Message } from '../../types/messaging/Messages';
import type ObjectMap from '../../types/utilities/ObjectMap';

/** The store slices the message projections read. */
interface MessageSlices {
  messageIDs: readonly string[];
  allMessagesByID: ObjectMap<Message>;
  allMessageItemsByID: ObjectMap<LocalMessageItem>;
  localMessageIDs: readonly string[];
}

interface KeyChange {
  base: number;
  keys: readonly string[];
}

/**
 * How many writes are kept. A reader more writes behind than this compares every message. Versions
 * are numbers, so a record never keeps a map alive.
 */
const KEPT_CHANGES = 64;

let nextVersion = 1;
const versions = new WeakMap<object, number>();
const changes = new Map<number, KeyChange>();

function versionOf(map: object): number {
  let version = versions.get(map);
  if (version === undefined) {
    version = nextVersion++;
    versions.set(map, version);
  }
  return version;
}

/** `{ ...map, ...changed }`, recorded as changing only the keys in `changed`. */
function withChangedKeys<T>(
  map: ObjectMap<T>,
  changed: ObjectMap<T>
): ObjectMap<T> {
  const next = { ...map, ...changed };
  changes.set(versionOf(next), {
    base: versionOf(map),
    keys: Object.keys(changed),
  });
  if (changes.size > KEPT_CHANGES) {
    changes.delete(changes.keys().next().value);
  }
  return next;
}

/** The keys changed from `before` to `after`, or `undefined` when no record links them. */
function changedKeys(before: object, after: object): Set<string> | undefined {
  const keys = new Set<string>();
  if (before === after) {
    return keys;
  }
  const target = versions.get(before);
  let version = versions.get(after);
  for (
    let step = 0;
    target !== undefined && version !== undefined && step < KEPT_CHANGES;
    step++
  ) {
    const change = changes.get(version);
    if (!change) {
      return undefined;
    }
    change.keys.forEach((key) => keys.add(key));
    if (change.base === target) {
      return keys;
    }
    version = change.base;
  }
  return undefined;
}

/**
 * The IDs of the messages whose message or local items changed from `before` to `after`, or
 * `undefined` when only comparing every message can tell: the message or local ID lists changed,
 * a write wasn't recorded, or a local item moved to another message.
 */
function changedMessageIDs(
  before: MessageSlices,
  after: MessageSlices
): ReadonlySet<string> | undefined {
  if (
    before.messageIDs !== after.messageIDs ||
    before.localMessageIDs !== after.localMessageIDs
  ) {
    return undefined;
  }
  const messageIDs = changedKeys(before.allMessagesByID, after.allMessagesByID);
  const localIDs = changedKeys(
    before.allMessageItemsByID,
    after.allMessageItemsByID
  );
  if (!messageIDs || !localIDs) {
    return undefined;
  }
  for (const localID of localIDs) {
    const was = before.allMessageItemsByID[localID]?.fullMessageID;
    const now = after.allMessageItemsByID[localID]?.fullMessageID;
    if (was !== undefined && now !== undefined && was !== now) {
      return undefined;
    }
    messageIDs.add(now ?? was);
  }
  messageIDs.delete(undefined);
  return messageIDs;
}

/** Each local ID list's top-level local IDs by message, built once per list. */
const localIDIndexes = new WeakMap<
  readonly string[],
  ReadonlyMap<string, readonly string[]> | null
>();

/**
 * The top-level local IDs of each message, in list order, or `undefined` when a listed local item
 * is missing. A local item always belongs to the message it was made for, so the index holds for
 * as long as the list does.
 */
function localIDsByMessage(
  localMessageIDs: readonly string[],
  allMessageItemsByID: ObjectMap<LocalMessageItem>
): ReadonlyMap<string, readonly string[]> | undefined {
  let index = localIDIndexes.get(localMessageIDs);
  if (index === undefined) {
    const built = new Map<string, string[]>();
    const complete = localMessageIDs.every((localID) => {
      const messageID = allMessageItemsByID[localID]?.fullMessageID;
      if (messageID === undefined) {
        return false;
      }
      const localIDs = built.get(messageID) ?? [];
      localIDs.push(localID);
      built.set(messageID, localIDs);
      return true;
    });
    index = complete ? built : null;
    localIDIndexes.set(localMessageIDs, index);
  }
  return index ?? undefined;
}

export { changedMessageIDs, localIDsByMessage, withChangedKeys };
export type { MessageSlices };

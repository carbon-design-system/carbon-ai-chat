/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';
import merge from 'lodash-es/merge.js';
import isEqual from 'lodash-es/isEqual.js';

import type {
  LocalMessageItem,
  LocalMessageItemStreamingState,
} from '../../types/messaging/LocalMessageItem';
import {
  GenericItem,
  TextItem,
  ConversationalSearchItem,
  Message,
  MessageResponse,
  MessageResponseTypes,
} from '../../types/messaging/Messages';
import type ObjectMap from '../../types/utilities/ObjectMap';
import { deepFreeze } from './lang/objectUtils';
import {
  isHiddenOutputItem,
  isPause,
  isResponse,
  streamItemID,
} from './messageUtils';
import { deriveStreamingItemText } from './streamingUtils';

interface CachedMessage {
  sources: readonly unknown[];
  get(): Readonly<Message>;
}

interface CachedMessageArray {
  messages: readonly CachedMessage[];
  get(): readonly Readonly<Message>[];
}

export interface PreparedPublicMessages {
  get(): readonly Readonly<Message>[];
}

function sameSources(
  left: readonly unknown[],
  right: readonly unknown[]
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  );
}

function publicMessageValueSources(message: Message): readonly unknown[] {
  return Object.entries(message).flatMap(([key, value]) => {
    if (key === 'ui_state_internal' || key === 'ui_state') {
      return [];
    }
    if (key === 'history' && value) {
      return [
        key,
        ...Object.entries(value).flatMap(([historyKey, historyValue]) =>
          historyKey === 'file_upload_status' ? [] : [historyKey, historyValue]
        ),
      ];
    }
    return [key, value];
  });
}

function messageSources(
  message: Message,
  localItems: readonly LocalMessageItem[]
): readonly unknown[] {
  return [
    ...publicMessageValueSources(message),
    ...localItems.flatMap((localItem) => [
      localItem.item,
      localItem.ui_state.streamingState?.chunks,
      localItem.ui_state.streamingState?.isDone,
    ]),
  ];
}

function getLocalItemsByMessage(
  messageIDs: readonly string[],
  allMessageItemsByID: ObjectMap<LocalMessageItem>,
  localMessageIDs: readonly string[]
): Map<string, LocalMessageItem[]> {
  const currentIDs = new Set(messageIDs);
  const localItemsByMessage = new Map<string, LocalMessageItem[]>();
  localMessageIDs.forEach((localID) => {
    const localItem = allMessageItemsByID[localID];
    if (localItem && currentIDs.has(localItem.fullMessageID)) {
      const items = localItemsByMessage.get(localItem.fullMessageID) ?? [];
      items.push(localItem);
      localItemsByMessage.set(localItem.fullMessageID, items);
    }
  });
  return localItemsByMessage;
}

export function publicMessagesSources(
  messageIDs: readonly string[],
  allMessagesByID: ObjectMap<Message>,
  allMessageItemsByID: ObjectMap<LocalMessageItem>,
  localMessageIDs: readonly string[]
): readonly unknown[] {
  const localItemsByMessage = getLocalItemsByMessage(
    messageIDs,
    allMessageItemsByID,
    localMessageIDs
  );
  return messageIDs.flatMap((id) => {
    const message = allMessagesByID[id];
    return message
      ? [id, ...messageSources(message, localItemsByMessage.get(id) ?? [])]
      : [id, undefined];
  });
}

function assembleStreamingItem(localItem: LocalMessageItem): GenericItem {
  const { streamingState } = localItem.ui_state;
  if (!streamingState || streamingState.isDone) {
    return localItem.item;
  }

  if (
    localItem.item.response_type === MessageResponseTypes.TEXT ||
    localItem.item.response_type === MessageResponseTypes.CONVERSATIONAL_SEARCH
  ) {
    return {
      ...localItem.item,
      text: deriveStreamingItemText(
        (localItem.item as TextItem).text,
        streamingState as LocalMessageItemStreamingState<
          TextItem | ConversationalSearchItem
        >
      ),
    };
  }
  return merge({}, localItem.item, ...streamingState.chunks) as GenericItem;
}

function assembleResponseItems(
  message: MessageResponse,
  localItems: readonly LocalMessageItem[]
): GenericItem[] {
  const projected = localItems.map(assembleStreamingItem);
  const generic = message.output?.generic ?? [];
  const nonRendering = generic
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) => item && (isPause(item) || isHiddenOutputItem(message, item))
    );
  if (
    !generic.length ||
    (!nonRendering.length &&
      generic.length === localItems.length &&
      generic.every(
        (item, index) =>
          streamItemID(message.id, item) ===
          streamItemID(message.id, localItems[index].item)
      ))
  ) {
    return projected;
  }

  // Local items omit silent entries and can stop at a pause; snapshots retain the full payload.
  const matched = new Map<number, number>();
  const reserved = new Set<number>();
  // A received write can retain a streamed suffix before its new earlier items show.
  const localByStreamID = new Map<string, number>();
  localItems.forEach((local, index) => {
    const id = streamItemID(message.id, local.item);
    if (id) {
      localByStreamID.set(id, index);
    }
  });
  generic.forEach((item, genericIndex) => {
    const id = streamItemID(message.id, item);
    const index = id ? localByStreamID.get(id) : undefined;
    if (index !== undefined && !reserved.has(index)) {
      matched.set(genericIndex, index);
      reserved.add(index);
    }
  });
  nonRendering.forEach(({ item, index: genericIndex }) => {
    if (streamItemID(message.id, item)) {
      return;
    }
    const index = localItems.findIndex(
      (local, position) =>
        !reserved.has(position) &&
        !streamItemID(message.id, local.item) &&
        isEqual(local.item, item)
    );
    if (index !== -1) {
      matched.set(genericIndex, index);
      reserved.add(index);
    }
  });

  const consumed = new Set<number>();
  let nextLocal = 0;
  const result = generic.flatMap((item, genericIndex) => {
    if (!item) {
      return [];
    }
    const index = matched.get(genericIndex);
    if (index !== undefined) {
      consumed.add(index);
      return [projected[index]];
    }
    if (
      isPause(item) ||
      isHiddenOutputItem(message, item) ||
      streamItemID(message.id, item)
    ) {
      return [item];
    }
    while (
      nextLocal < localItems.length &&
      (reserved.has(nextLocal) ||
        streamItemID(message.id, localItems[nextLocal].item))
    ) {
      nextLocal++;
    }
    if (nextLocal < projected.length) {
      consumed.add(nextLocal);
      return [projected[nextLocal++]];
    }
    return [item];
  });
  return result.concat(
    projected.filter((_item, index) => !consumed.has(index))
  );
}

function clonePublicMessage(
  message: Message,
  localItems: readonly LocalMessageItem[]
): Readonly<Message> {
  let projected = message;
  // Local items cover empty responses and retained streaming state, including the final frame before receive rebuilds them.
  if (
    isResponse(message) &&
    localItems.length &&
    (message.output?.generic?.length === 0 ||
      localItems.some((item) => item.ui_state.streamingState))
  ) {
    projected = {
      ...message,
      output: {
        ...message.output,
        generic: assembleResponseItems(message as MessageResponse, localItems),
      },
    } as MessageResponse;
  }

  const clone = cloneDeep(projected) as Message & { ui_state?: unknown };
  delete clone.ui_state_internal;
  delete clone.ui_state;
  if (clone.history) {
    delete clone.history.file_upload_status;
  }
  return deepFreeze(clone);
}

export class PublicMessagesProjection {
  private messages = new Map<string, CachedMessage>();
  private array: CachedMessageArray = {
    messages: [],
    get: () => Object.freeze([]),
  };

  project(
    messageIDs: readonly string[],
    allMessagesByID: ObjectMap<Message>,
    allMessageItemsByID: ObjectMap<LocalMessageItem>,
    localMessageIDs: readonly string[]
  ): readonly Readonly<Message>[] {
    return this.prepare(
      messageIDs,
      allMessagesByID,
      allMessageItemsByID,
      localMessageIDs
    ).get();
  }

  prepare(
    messageIDs: readonly string[],
    allMessagesByID: ObjectMap<Message>,
    allMessageItemsByID: ObjectMap<LocalMessageItem>,
    localMessageIDs: readonly string[]
  ): PreparedPublicMessages {
    const localItemsByMessage = getLocalItemsByMessage(
      messageIDs,
      allMessageItemsByID,
      localMessageIDs
    );
    const currentIDs = new Set<string>();

    const next = messageIDs.flatMap((id) => {
      const message = allMessagesByID[id];
      if (!message) {
        return [];
      }
      currentIDs.add(id);
      const localItems = localItemsByMessage.get(id) ?? [];
      const sources = messageSources(message, localItems);
      const cached = this.messages.get(id);
      if (cached && sameSources(cached.sources, sources)) {
        return [cached];
      }
      let projected = false;
      let value: Readonly<Message>;
      const entry: CachedMessage = {
        sources,
        get: () => {
          if (!projected) {
            value = clonePublicMessage(message, localItems);
            projected = true;
          }
          return value;
        },
      };
      this.messages.set(id, entry);
      return [entry];
    });

    this.messages.forEach((_message, id) => {
      if (!currentIDs.has(id)) {
        this.messages.delete(id);
      }
    });

    if (
      this.array.messages.length === next.length &&
      this.array.messages.every((message, index) => message === next[index])
    ) {
      return this.array;
    }

    let projected = false;
    let value: readonly Readonly<Message>[];
    this.array = {
      messages: next,
      get: () => {
        if (!projected) {
          value = Object.freeze(next.map((message) => message.get()));
          projected = true;
        }
        return value;
      },
    };
    return this.array;
  }
}

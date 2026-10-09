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

import type { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import {
  GenericItem,
  Message,
  MessageResponse,
  MessageResponseTypes,
  TextItem,
} from '../../types/messaging/Messages';
import type ObjectMap from '../../types/utilities/ObjectMap';
import { deepFreeze } from './lang/objectUtils';
import { isResponse } from './messageUtils';

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

  const assembled = merge(
    {},
    localItem.item,
    ...streamingState.chunks
  ) as GenericItem;
  if (assembled.response_type === MessageResponseTypes.TEXT) {
    (assembled as TextItem).text = streamingState.chunks
      .map((chunk) => (chunk as Partial<TextItem>).text ?? '')
      .join('');
  }
  return assembled;
}

function clonePublicMessage(
  message: Message,
  localItems: readonly LocalMessageItem[]
): Readonly<Message> {
  let projected = message;
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
        generic: localItems.map(assembleStreamingItem),
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

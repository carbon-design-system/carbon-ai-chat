/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// The demo shows both ways to write a response. It sends through
// `addMessage` / `addMessageChunk` by default, and through `upsertMessage`
// when `?useUpsertMessage` is set on a pre-release build. This module makes
// that choice so that no `do*.ts` file has to.

import type {
  ChatInstance,
  CompleteItemChunk,
  DeepPartial,
  GenericItem,
  MessageResponse,
  MessageResponseOptions,
  PartialItemChunk,
} from '@carbon/ai-chat';
// The main entry registers web components on import, so the enums come from
// the side-effect-free server entry. That keeps this module loadable in Node
// for the Playwright unit cases.
import { MessageResponseTypes, MessageState } from '@carbon/ai-chat/server';

type DemoLocation = Pick<Location, 'hostname' | 'pathname' | 'search'>;

type IdentifiedResponse = MessageResponse & { id: string };

interface ResponseStream {
  partial: (chunk: PartialItemChunk) => Promise<void>;
  complete: (chunk: CompleteItemChunk) => Promise<void>;
  final: (finalResponse: MessageResponse) => Promise<void>;
}

// Location.hostname keeps the brackets on an IPv6 literal.
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const PRE_RELEASE_PATH = /\/tag\/(next|alpha)\//;

const USE_UPSERT_MESSAGE_PARAM = 'useUpsertMessage';

function isPreReleaseDemo(location: Pick<Location, 'hostname' | 'pathname'>) {
  return (
    LOCAL_HOSTNAMES.has(location.hostname) ||
    PRE_RELEASE_PATH.test(location.pathname)
  );
}

function usesUpsertMessage(location: DemoLocation = window.location) {
  return (
    isPreReleaseDemo(location) &&
    new URLSearchParams(location.search).has(USE_UPSERT_MESSAGE_PARAM)
  );
}

function sendResponse(instance: ChatInstance, message: IdentifiedResponse) {
  if (usesUpsertMessage()) {
    return instance.messaging.upsertMessage(
      message.id,
      MessageState.COMPLETE,
      () => message
    );
  }
  return instance.messaging.addMessage(message);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Matches the lodash `merge` the chat applies to `partial_response.message_options`
// in chunk mode: objects and arrays merge by key or index, and undefined never
// overwrites. It copies as it goes, because the streaming engines mutate
// objects they have already sent.
function mergeOptions(target: unknown, source: unknown): unknown {
  if (Array.isArray(source)) {
    const result: unknown[] = Array.isArray(target) ? [...target] : [];
    source.forEach((value, index) => {
      if (value !== undefined) {
        result[index] = mergeOptions(result[index], value);
      }
    });
    return result;
  }
  if (!isPlainObject(source)) {
    return source;
  }
  const result: Record<string, unknown> = isPlainObject(target)
    ? { ...target }
    : {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      result[key] = mergeOptions(result[key], value);
    }
  }
  return result;
}

type StreamedItem = GenericItem & {
  text?: string;
  user_defined?: Record<string, unknown>;
};

function appendPartial(
  previous: StreamedItem,
  partial: DeepPartial<GenericItem>
): GenericItem {
  const next = { ...previous, ...partial } as StreamedItem;
  const addition = partial as DeepPartial<StreamedItem>;
  switch (next.response_type) {
    case MessageResponseTypes.TEXT:
    case MessageResponseTypes.CONVERSATIONAL_SEARCH:
      next.text = `${previous.text ?? ''}${addition.text ?? ''}`;
      break;
    case MessageResponseTypes.USER_DEFINED:
      next.user_defined = {
        ...previous.user_defined,
        ...addition.user_defined,
        text: `${previous.user_defined?.text ?? ''}${addition.user_defined?.text ?? ''}`,
      };
      break;
    default:
      break;
  }
  return next;
}

function upsertItem(
  items: GenericItem[],
  item: DeepPartial<GenericItem>,
  combine: (previous: StreamedItem) => GenericItem
): GenericItem[] {
  const itemID = item.streaming_metadata?.id;
  const index =
    itemID === undefined
      ? -1
      : items.findIndex(
          (existing) => existing.streaming_metadata?.id === itemID
        );
  if (index === -1) {
    return [...items, item as GenericItem];
  }
  const next = [...items];
  next[index] = combine(items[index] as StreamedItem);
  return next;
}

function createUpsertStream(
  instance: ChatInstance,
  responseID: string
): ResponseStream {
  let snapshot: IdentifiedResponse = {
    id: responseID,
    output: { generic: [] },
  };

  const upsertStreaming = (
    generic: GenericItem[],
    options: DeepPartial<MessageResponseOptions> | undefined
  ) => {
    const next: IdentifiedResponse = {
      ...snapshot,
      output: { ...snapshot.output, generic },
    };
    if (options) {
      next.message_options = mergeOptions(
        snapshot.message_options,
        options
      ) as MessageResponseOptions;
    }
    snapshot = next;
    return instance.messaging.upsertMessage(
      responseID,
      MessageState.STREAMING,
      () => next
    );
  };

  return {
    partial: (chunk) =>
      upsertStreaming(
        upsertItem(
          snapshot.output.generic ?? [],
          chunk.partial_item,
          (previous) => appendPartial(previous, chunk.partial_item)
        ),
        chunk.partial_response?.message_options
      ),
    complete: (chunk) =>
      upsertStreaming(
        upsertItem(
          snapshot.output.generic ?? [],
          chunk.complete_item,
          (previous) => ({
            ...previous,
            ...chunk.complete_item,
          })
        ),
        chunk.partial_response?.message_options
      ),
    final: (finalResponse) =>
      instance.messaging.upsertMessage(
        responseID,
        MessageState.COMPLETE,
        () => finalResponse
      ),
  };
}

function createResponseStream(
  instance: ChatInstance,
  responseID: string
): ResponseStream {
  if (usesUpsertMessage()) {
    return createUpsertStream(instance, responseID);
  }
  return {
    partial: (chunk) => instance.messaging.addMessageChunk(chunk),
    complete: (chunk) => instance.messaging.addMessageChunk(chunk),
    final: (finalResponse) =>
      instance.messaging.addMessageChunk({ final_response: finalResponse }),
  };
}

export {
  createResponseStream,
  isPreReleaseDemo,
  sendResponse,
  USE_UPSERT_MESSAGE_PARAM,
  usesUpsertMessage,
  type ResponseStream,
};

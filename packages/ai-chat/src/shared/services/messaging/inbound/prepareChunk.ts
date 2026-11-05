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
import type {
  GenericItem,
  MessageResponse,
  PartialOrCompleteItemChunk,
} from '../../../../types/messaging/Messages';
import type { DeepPartial } from '../../../../types/utilities/DeepPartial';

/** Copies the values used by the targeted write without copying the event chunk. */
function prepareChunkValues(
  chunk: PartialOrCompleteItemChunk,
  item: DeepPartial<GenericItem> | undefined
) {
  const ownedItem = cloneDeep(item);
  const ownedChunk = {
    ...chunk,
    partial_response: cloneDeep(chunk.partial_response),
  };
  return { ownedItem, ownedChunk };
}

/**
 * Returns the message `addMessageChunk` stores for a `partial_item` or `complete_item`
 * chunk. Item content never reaches it before `final_response`: a new stream starts from
 * an empty placeholder, and a chunk only deep-merges its `message_options` in, ignoring
 * any other `partial_response` field. With nothing to merge, `prev` comes back as is.
 *
 * @param prev The message stored under `messageID`, if any.
 * @param chunk The chunk being applied.
 * @param messageID The resolved message ID, which the chunk itself may not carry.
 * @param firstChunkTime The core clock value when no prior response exists.
 */
function applyChunkData(
  prev: MessageResponse | undefined,
  chunk: PartialOrCompleteItemChunk,
  messageID: string,
  firstChunkTime: number | undefined
): MessageResponse {
  const message: MessageResponse = prev ?? {
    id: messageID,
    output: { generic: [] },
    history: { timestamp: firstChunkTime },
  };
  const messageOptions = chunk.partial_response?.message_options;
  return messageOptions
    ? {
        ...message,
        message_options: merge({}, message.message_options, messageOptions),
      }
    : message;
}

export { prepareChunkValues, applyChunkData };

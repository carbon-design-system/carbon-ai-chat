/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from "../store/actions";
import {
  CompleteItemChunk,
  FinalResponseChunk,
  GenericItem,
  PartialItemChunk,
  PartialOrCompleteItemChunk,
  StreamChunk,
} from "../../types/messaging/Messages";
import { DeepPartial } from "../../types/utilities/DeepPartial";
import {
  isStreamCompleteItem,
  isStreamFinalResponse,
  isStreamPartialItem,
} from "./messageUtils";

type StoreLike = {
  dispatch: (action: any) => void;
  getState: () => any;
};

export interface ChunkContext {
  messageID?: string;
  item?: DeepPartial<GenericItem>;
  isCompleteItem: boolean;
  isPartialItem: boolean;
  isFinalResponse: boolean;
}

interface StreamingResponseMeta {
  requestId?: string;
  itemIds: Set<string>;
  controller?: AbortController;
}

/**
 * Tracks streaming response/item IDs and related metadata.
 */
class StreamingTracker {
  private responseToMeta = new Map<string, StreamingResponseMeta>();
  private itemToResponse = new Map<string, string>();

  resolveResponseId(id: string) {
    return this.itemToResponse.get(id) ?? id;
  }

  track(
    responseId: string,
    requestId?: string,
    controller?: AbortController,
    itemId?: string,
  ) {
    const existing = this.responseToMeta.get(responseId);
    if (existing) {
      if (requestId && !existing.requestId) {
        existing.requestId = requestId;
      }
      if (controller && !existing.controller) {
        existing.controller = controller;
      }
      if (itemId) {
        existing.itemIds.add(itemId);
        this.itemToResponse.set(itemId, responseId);
      }
      return existing;
    }

    const entry: StreamingResponseMeta = {
      requestId,
      controller,
      itemIds: new Set<string>(),
    };

    if (itemId) {
      entry.itemIds.add(itemId);
      this.itemToResponse.set(itemId, responseId);
    }

    this.responseToMeta.set(responseId, entry);
    return entry;
  }

  getMeta(responseId: string) {
    return this.responseToMeta.get(responseId);
  }

  clear(responseId: string) {
    const entry = this.responseToMeta.get(responseId);
    if (entry) {
      entry.itemIds.forEach((itemId) => this.itemToResponse.delete(itemId));
      this.responseToMeta.delete(responseId);
    }
    return entry;
  }
}

/**
 * Resolve chunk metadata and the associated message/item IDs.
 */
function resolveChunkContext(
  chunk: StreamChunk,
  providedMessageID?: string,
): ChunkContext {
  const isPartialItem = isStreamPartialItem(chunk);
  const isCompleteItem = isStreamCompleteItem(chunk);
  const isFinalResponse = isStreamFinalResponse(chunk);

  let messageID = providedMessageID;
  if (!messageID) {
    if ("streaming_metadata" in chunk && chunk.streaming_metadata) {
      messageID = chunk.streaming_metadata.response_id;
    } else if (isFinalResponse && chunk.final_response?.id) {
      messageID = chunk.final_response.id;
    }
  }

  let item: DeepPartial<GenericItem>;
  if (isPartialItem || isCompleteItem) {
    item =
      (chunk as PartialItemChunk).partial_item ||
      (chunk as CompleteItemChunk).complete_item;
  }

  return { messageID, item, isPartialItem, isCompleteItem, isFinalResponse };
}

/**
 * Returns true if the stop streaming button should be shown for this chunk.
 */
function shouldShowStopStreaming(
  streamingData: { cancellable?: boolean } | undefined,
  isStopGeneratingVisible: boolean,
) {
  return Boolean(streamingData?.cancellable && !isStopGeneratingVisible);
}

/**
 * Hides and re-enables the stop streaming button if currently visible.
 */
function resetStopStreamingButton(store: StoreLike) {
  const stopStreamingState =
    store.getState().assistantInputState.stopStreamingButtonState;
  if (stopStreamingState.isVisible) {
    store.dispatch(actions.setStopStreamingButtonDisabled(false));
    store.dispatch(actions.setStopStreamingButtonVisible(false));
  }
}

/**
 * Merge message options only, ignoring unexpected partial_response fields.
 */
function mergePartialResponseOptions(
  store: StoreLike,
  messageID: string | undefined,
  chunk: PartialOrCompleteItemChunk,
) {
  if (chunk.partial_response?.message_options && messageID) {
    store.dispatch(
      actions.streamingMergeMessageOptions(
        messageID,
        chunk.partial_response.message_options,
      ),
    );
  }
}

export {
  FinalResponseChunk,
  StreamingTracker,
  mergePartialResponseOptions,
  resetStopStreamingButton,
  resolveChunkContext,
  shouldShowStopStreaming,
};

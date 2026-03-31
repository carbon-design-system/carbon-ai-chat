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
  MessageResponseTypes,
  PartialItemChunk,
  PartialOrCompleteItemChunk,
  StreamChunk,
  TextItem,
  UserDefinedItem,
} from "../../types/messaging/Messages";
import { DeepPartial } from "../../types/utilities/DeepPartial";
import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
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
 *
 * If the button is already visible (e.g., from showStopButtonImmediately), this will
 * return false to avoid redundant state updates. The button will remain visible unless
 * the streaming metadata explicitly marks it as non-cancellable.
 */
function shouldShowStopStreaming(
  streamingData: { cancellable?: boolean } | undefined,
  isStopGeneratingVisible: boolean,
) {
  // If button is already visible, don't show it again (avoid redundant dispatch)
  if (isStopGeneratingVisible) {
    return false;
  }

  // Show button if streaming data indicates it's cancellable
  return Boolean(streamingData?.cancellable);
}

/**
 * Hides and re-enables the stop streaming button if currently visible.
 *
 * @param store - The store instance
 * @param streamingMessageID - Optional ID of currently streaming message. If provided and not null,
 *                             the button will remain visible (used with showStopButtonImmediately
 *                             to keep button visible during active streaming).
 */
function resetStopStreamingButton(
  store: StoreLike,
  streamingMessageID?: string | null,
) {
  const stopStreamingState =
    store.getState().assistantInputState.stopStreamingButtonState;
  if (stopStreamingState.isVisible) {
    // If there's an active streaming message, keep the button visible
    if (streamingMessageID) {
      return;
    }
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

/**
 * Internal helper function to check if an item has displayable content.
 * This is the core logic shared by both chunk and message content detection.
 *
 * @param item - The item to check (can be partial)
 * @param responseType - The response type of the item
 * @returns true if the item has displayable content
 */
function hasDisplayableContentForItem(
  item: DeepPartial<GenericItem> | undefined,
  responseType: string | undefined,
): boolean {
  if (!item || !responseType) {
    return false;
  }

  // TEXT: Must have non-empty trimmed text
  if (responseType === MessageResponseTypes.TEXT) {
    const text = (item as Partial<TextItem>).text;
    return Boolean(text && text.trim().length > 0);
  }

  // USER_DEFINED: Check for user_defined object
  if (responseType === MessageResponseTypes.USER_DEFINED) {
    return Boolean((item as Partial<UserDefinedItem>).user_defined);
  }

  // Other types: If response_type is set, consider it as having content
  return true;
}

/**
 * Determines if a streaming chunk has displayable content.
 * This is used to decide when to announce that streaming has started.
 *
 * For TEXT items: Returns true only if text is non-empty after trimming
 * For USER_DEFINED items: Returns true if user_defined object exists
 * For other types: Returns true if response_type is set
 *
 * @param chunk - The streaming chunk to check
 * @returns true if the chunk has content that should be displayed
 */
function chunkHasDisplayableContent(chunk: StreamChunk): boolean {
  if (!isStreamPartialItem(chunk)) {
    return false;
  }

  const item = chunk.partial_item;
  return hasDisplayableContentForItem(item, item.response_type);
}

/**
 * Determines if a local message item has displayable content.
 * This is used to decide when to close the reasoning steps UI.
 *
 * For TEXT items: Checks both the item text and streaming chunks
 * For other types: Uses the same logic as chunkHasDisplayableContent
 *
 * @param localMessageItem - The local message item to check
 * @returns true if the message has content that should be displayed
 */
function messageHasDisplayableContent(
  localMessageItem: LocalMessageItem | undefined,
): boolean {
  if (!localMessageItem || !localMessageItem.item?.response_type) {
    return false;
  }

  const { item, ui_state: uiState } = localMessageItem;

  // For TEXT items, check streaming chunks if available
  if (item.response_type === MessageResponseTypes.TEXT) {
    const textFromStreaming = uiState.streamingState
      ? uiState.streamingState.chunks
          .map((chunk) => (chunk as Partial<TextItem>).text ?? "")
          .join("")
      : undefined;
    const text = (item as TextItem).text.length
      ? (item as TextItem).text
      : textFromStreaming;
    return Boolean(text && text.trim());
  }

  return hasDisplayableContentForItem(item, item.response_type);
}

export {
  chunkHasDisplayableContent,
  FinalResponseChunk,
  mergePartialResponseOptions,
  messageHasDisplayableContent,
  resetStopStreamingButton,
  resolveChunkContext,
  shouldShowStopStreaming,
  StreamingTracker,
};

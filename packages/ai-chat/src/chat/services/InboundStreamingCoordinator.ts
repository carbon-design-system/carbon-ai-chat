/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { StreamingTracker } from "../utils/streamingUtils";
import { MessageRequest } from "../../types/messaging/Messages";

type StreamingCurrent =
  | {
      message: MessageRequest<any>;
      sendMessageController?: AbortController;
      isStreaming?: boolean;
    }
  | null
  | undefined;

class InboundStreamingCoordinator {
  /**
   * Tracks the ID of the message that is currently streaming. This is set when the first chunk arrives
   * and cleared when the FinalResponseChunk is processed. Used to handle cancellation even after queue is cleared.
   */
  public streamingMessageID: string | null = null;

  /**
   * Tracks streaming response/item mappings.
   */
  private streamingTracker = new StreamingTracker();

  constructor(
    private messageAbortControllers: Map<string, AbortController>,
    private moveToNextQueueItem: () => void,
  ) {}

  /**
   * Resolve a responseId from a provided id (could be an item_id or response_id).
   */
  resolveResponseId(id: string) {
    return this.streamingTracker.resolveResponseId(id);
  }

  /**
   * Returns metadata for a streaming response.
   */
  getStreamingMeta(responseId: string) {
    return this.streamingTracker.getMeta(responseId);
  }

  /**
   * Marks the current message as streaming and tracks response/item IDs.
   */
  markStreaming(
    current: StreamingCurrent,
    messageID?: string,
    itemID?: string,
    lastProcessedMessageID?: string | null,
  ) {
    // Set the messageID (from the chunk); otherwise fall back to the current queued message id.
    const responseId = messageID ?? current?.message.id;
    this.streamingMessageID = responseId;

    // If we have the last processed message ID, copy its controller to the response_id
    if (responseId && lastProcessedMessageID) {
      const controller = this.messageAbortControllers.get(
        lastProcessedMessageID,
      );
      if (controller) {
        this.messageAbortControllers.set(responseId, controller);
      }
    }

    if (!current || !responseId) {
      return;
    }

    current.isStreaming = true;

    // If messageID is provided (from chunk response_id), also store the controller under that ID
    // because the chunk's response_id may differ from message.id
    if (responseId && responseId !== current.message.id) {
      const controller = current.sendMessageController;
      if (controller) {
        this.messageAbortControllers.set(responseId, controller);
      }
    }

    // Track streaming metadata so item-level cancellation can be handled.
    const controller =
      this.messageAbortControllers.get(responseId) ||
      this.messageAbortControllers.get(current.message.id);
    this.streamingTracker.track(
      responseId,
      current.message.id,
      controller,
      itemID,
    );
  }

  /**
   * Called when a FinalResponseChunk is processed to clear the streaming message from the queue.
   */
  finalizeStreamingMessage(messageID: string) {
    const responseId = this.resolveResponseId(messageID);
    if (this.streamingMessageID === responseId) {
      this.moveToNextQueueItem();
    }

    // Clean up tracking for this streaming response
    const cleared = this.streamingTracker.clear(responseId);
    this.messageAbortControllers.delete(responseId);
    if (cleared?.requestId && cleared.requestId !== responseId) {
      this.messageAbortControllers.delete(cleared.requestId);
    }
    if (this.streamingMessageID === responseId) {
      this.streamingMessageID = null;
    }
  }

  /**
   * Clear tracking (without queue movement) and return metadata for the response.
   */
  clearStreamingResponse(responseId: string) {
    const cleared = this.streamingTracker.clear(responseId);
    this.messageAbortControllers.delete(responseId);
    if (cleared?.requestId && cleared.requestId !== responseId) {
      this.messageAbortControllers.delete(cleared.requestId);
    }
    if (this.streamingMessageID === responseId) {
      this.streamingMessageID = null;
    }
    return cleared;
  }

  /**
   * Returns false if the chunk is from an outdated generation. If true, the chunk should be processed.
   */
  public validateChunkGeneration(
    messageID: string | undefined,
    messageGenerations: Map<string, number>,
    currentGeneration: number,
    hideStopStreaming: () => void,
  ): boolean {
    if (!messageID) {
      return true;
    }

    const messageGeneration = messageGenerations.get(messageID);
    if (
      messageGeneration !== undefined &&
      messageGeneration !== currentGeneration
    ) {
      hideStopStreaming();
      return false;
    }

    if (messageGeneration === undefined) {
      messageGenerations.set(messageID, currentGeneration);
    }

    return true;
  }
}

export { InboundStreamingCoordinator };

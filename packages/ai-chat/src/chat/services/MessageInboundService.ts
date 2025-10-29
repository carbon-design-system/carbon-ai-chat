/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ServiceManager } from "./ServiceManager";
import actions from "../store/actions";
import {
  isStreamCompleteItem,
  isStreamFinalResponse,
  isStreamPartialItem,
  renderAsUserDefinedMessage,
  streamItemID,
} from "../utils/messageUtils";
import { consoleError, debugLog } from "../utils/miscUtils";
import {
  ResolvablePromise,
  resolvablePromise,
} from "../utils/resolvablePromise";
import {
  CompleteItemChunk,
  GenericItem,
  PartialItemChunk,
  PartialOrCompleteItemChunk,
  StreamChunk,
} from "../../types/messaging/Messages";
import { AddMessageOptions } from "../../types/config/MessagingConfig";
import {
  BusEventChunkUserDefinedResponse,
  BusEventType,
} from "../../types/events/eventBusTypes";
import { DeepPartial } from "../../types/utilities/DeepPartial";

/**
 * Service responsible for receiving and processing streaming chunks from the backend.
 * Handles chunk queue management, generation-based filtering, and coordination with
 * the outbound message service.
 */
export class MessageInboundService {
  private serviceManager: ServiceManager;

  /**
   * Tracks the current restart generation. This is incremented each time restartConversation() is called
   * and is used to filter out stale chunks from previous conversation generations.
   */
  private restartGeneration = 0;

  /**
   * Maps message IDs to the generation they were created in. This is used to filter out chunks from
   * messages that were started before a restart.
   */
  private messageGenerations = new Map<string, number>();

  /**
   * Queue of received chunks waiting to be processed.
   */
  private chunkQueue: {
    chunk: StreamChunk;
    messageID?: string;
    options: AddMessageOptions;
    chunkPromise: ResolvablePromise<void>;
  }[] = [];

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Increments the restart generation counter. Should be called when a conversation restart occurs.
   */
  incrementGeneration() {
    this.restartGeneration++;
  }

  /**
   * Receives a chunk from a stream and adds it to the processing queue.
   */
  async receiveChunk(
    chunk: StreamChunk,
    messageID?: string,
    options: AddMessageOptions = {},
  ) {
    // Mark message as streaming IMMEDIATELY when first chunk arrives (before queuing)
    // This prevents MessageService from clearing the queue before chunks are processed
    if (isStreamPartialItem(chunk)) {
      // Extract messageID from chunk if not provided
      const extractedMessageID =
        messageID ||
        ("streaming_metadata" in chunk &&
          chunk.streaming_metadata?.response_id);
      this.serviceManager.messageOutboundService.markCurrentMessageAsStreaming(
        extractedMessageID,
      );
    }

    const chunkPromise = resolvablePromise();
    this.chunkQueue.push({ chunk, messageID, options, chunkPromise });
    if (this.chunkQueue.length === 1) {
      this.processChunkQueue();
    }
    return chunkPromise;
  }

  /**
   * Processes chunks from the queue one at a time.
   *
   * The processing flow:
   * 1. Extracts the message ID from the chunk if not already provided
   * 2. Checks if the chunk is from a previous generation (stale) and skips if so
   * 3. For partial/complete chunks, adds them to streaming state and handles user-defined responses
   * 4. For final response chunks, delegates to MessageLifecycleService and finalizes streaming
   * 5. Manages the stop streaming button visibility based on chunk state
   * 6. Advances to the next chunk in the queue
   */
  private async processChunkQueue() {
    const { chunk, options, chunkPromise } = this.chunkQueue[0];
    let { messageID } = this.chunkQueue[0];
    const { store } = this.serviceManager;

    try {
      const isCompleteItem = isStreamCompleteItem(chunk);
      const isPartialItem = isStreamPartialItem(chunk);
      const isFinalResponse = isStreamFinalResponse(chunk);

      // Extract message ID from various chunk types
      messageID = this.extractMessageIDFromChunk(
        chunk,
        messageID,
        isFinalResponse,
      );

      // Check if this chunk is from a previous generation and should be skipped
      if (messageID && this.isStaleChunk(messageID)) {
        this.handleStaleChunk(
          messageID,
          isCompleteItem,
          isFinalResponse,
          chunkPromise,
        );
        return;
      }

      // Record the generation for this message if it's the first chunk
      if (messageID) {
        const messageGeneration = this.messageGenerations.get(messageID);
        if (messageGeneration === undefined) {
          this.messageGenerations.set(messageID, this.restartGeneration);
        }
      }

      const isStopGeneratingVisible =
        store.getState().assistantInputState.stopStreamingButtonState.isVisible;

      if (isPartialItem) {
        const streamingData = chunk.partial_item.streaming_metadata;
        if (streamingData?.cancellable && !isStopGeneratingVisible) {
          store.dispatch(actions.setStopStreamingButtonVisible(true));
        }
      }

      if (isCompleteItem || isPartialItem) {
        await this.processPartialOrCompleteChunk(
          chunk,
          messageID,
          isCompleteItem,
          options,
        );
      } else if (isFinalResponse) {
        await this.processFinalResponseChunk(chunk, messageID, options);
      }

      // Reset stop streaming button when a complete/final chunk arrives
      if (
        (isCompleteItem || isFinalResponse) &&
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ) {
        store.dispatch(actions.setStopStreamingButtonDisabled(false));
        store.dispatch(actions.setStopStreamingButtonVisible(false));
      }

      this.advanceQueue(chunkPromise);
    } catch (error) {
      consoleError("Error processing stream chunk", error);
      this.advanceQueue(chunkPromise, error);
    }
  }

  /**
   * Extracts the message ID from a chunk if not already provided.
   * Checks streaming_metadata first, then falls back to final_response.id.
   *
   * @param chunk The chunk to extract from
   * @param existingMessageID The message ID if already known
   * @param isFinalResponse Whether this is a final response chunk
   * @returns The extracted or existing message ID
   */
  private extractMessageIDFromChunk(
    chunk: StreamChunk,
    existingMessageID: string | undefined,
    isFinalResponse: boolean,
  ): string | undefined {
    if (existingMessageID) {
      return existingMessageID;
    }

    if ("streaming_metadata" in chunk && chunk.streaming_metadata) {
      return chunk.streaming_metadata.response_id;
    }

    if (
      isFinalResponse &&
      "final_response" in chunk &&
      chunk.final_response?.id
    ) {
      return chunk.final_response.id;
    }

    return undefined;
  }

  /**
   * Checks if a chunk belongs to a message from a previous generation (before a restart).
   *
   * @param messageID The message ID to check
   * @returns True if the chunk is stale and should be skipped
   */
  private isStaleChunk(messageID: string): boolean {
    const messageGeneration = this.messageGenerations.get(messageID);
    return (
      messageGeneration !== undefined &&
      messageGeneration !== this.restartGeneration
    );
  }

  /**
   * Handles a stale chunk by logging it, hiding the stop streaming button if needed,
   * and advancing the queue.
   *
   * @param messageID The message ID of the stale chunk
   * @param isCompleteItem Whether this is a complete item chunk
   * @param isFinalResponse Whether this is a final response chunk
   * @param chunkPromise The promise to resolve for this chunk
   */
  private handleStaleChunk(
    messageID: string,
    isCompleteItem: boolean,
    isFinalResponse: boolean,
    chunkPromise: ResolvablePromise<void>,
  ): void {
    const { store } = this.serviceManager;
    const messageGeneration = this.messageGenerations.get(messageID);

    debugLog(
      `[ChunkQueue] Skipping stale chunk (${isCompleteItem ? "complete" : isFinalResponse ? "final" : "partial"}) for message ${messageID} from generation ${messageGeneration} (current: ${this.restartGeneration})`,
    );

    // If this is a complete or final chunk from an old message, hide the stop streaming button
    if (
      (isCompleteItem || isFinalResponse) &&
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ) {
      store.dispatch(actions.setStopStreamingButtonDisabled(false));
      store.dispatch(actions.setStopStreamingButtonVisible(false));
    }

    this.advanceQueue(chunkPromise);
  }

  /**
   * Processes a partial or complete chunk by starting streaming if needed,
   * adding the chunk to the store, merging message options, and handling user-defined responses.
   *
   * @param chunk The chunk to process
   * @param messageID The message ID
   * @param isCompleteItem Whether this is a complete item
   * @param options The options for adding the message
   */
  private async processPartialOrCompleteChunk(
    chunk: PartialOrCompleteItemChunk,
    messageID: string | undefined,
    isCompleteItem: boolean,
    options: AddMessageOptions,
  ): Promise<void> {
    const { store } = this.serviceManager;

    if (messageID && !store.getState().allMessagesByID[messageID]) {
      store.dispatch(actions.streamingStart(messageID));
    }

    const item =
      (chunk as PartialItemChunk).partial_item ||
      (chunk as CompleteItemChunk).complete_item;

    if (messageID && item) {
      store.dispatch(
        actions.streamingAddChunk(
          messageID,
          item,
          isCompleteItem,
          options.disableFadeAnimation ?? true,
        ),
      );
    }

    // Only merge message_options; ignore any other unexpected fields in partial_response
    if (chunk.partial_response?.message_options && messageID) {
      store.dispatch(
        actions.streamingMergeMessageOptions(
          messageID,
          chunk.partial_response.message_options,
        ),
      );
    }

    // Now make sure to handle any user_defined response items in the chunk.
    if (messageID && item) {
      await this.handleUserDefinedResponseItemsChunk(messageID, chunk, item);
    }
  }

  /**
   * Processes a final response chunk by delegating to MessageLifecycleService
   * and finalizing the streaming message.
   *
   * @param chunk The final response chunk
   * @param messageID The message ID
   * @param options The options for receiving the message
   */
  private async processFinalResponseChunk(
    chunk: StreamChunk,
    messageID: string | undefined,
    options: AddMessageOptions,
  ): Promise<void> {
    if (!("final_response" in chunk)) {
      return;
    }

    // Delegate to MessageLifecycleService to receive the final response
    await this.serviceManager.actions.receive(
      chunk.final_response,
      options.isLatestWelcomeNode,
      null,
      {
        disableFadeAnimation: true,
      },
    );

    // Notify MessageService that streaming is complete so it can clear the queue
    if (messageID) {
      this.serviceManager.messageOutboundService.finalizeStreamingMessage(
        messageID,
      );
    }
  }

  /**
   * Advances the queue by removing the current chunk and processing the next one.
   * Resolves or rejects the chunk promise based on whether an error occurred.
   *
   * @param chunkPromise The promise to resolve or reject
   * @param error Optional error if processing failed
   */
  private advanceQueue(
    chunkPromise: ResolvablePromise<void>,
    error?: any,
  ): void {
    this.chunkQueue.shift();

    if (error) {
      chunkPromise.doReject(error);
    } else {
      chunkPromise.doResolve();
    }

    if (this.chunkQueue[0]) {
      this.processChunkQueue();
    }
  }

  /**
   * If the given message should be rendered as a user defined message, this will create a host element for the message
   * and fire the {@link BusEventType.CHUNK_USER_DEFINED_RESPONSE} event so that the event listeners can attach whatever
   * they want to the host element.
   *
   * Note, this function does not currently support nested items inside the chunk.
   */
  private async handleUserDefinedResponseItemsChunk(
    messageID: string,
    chunk: PartialOrCompleteItemChunk,
    messageItem: DeepPartial<GenericItem>,
  ) {
    if (renderAsUserDefinedMessage(messageItem)) {
      const itemID = streamItemID(messageID, messageItem);

      let slotName: string;
      if (!messageItem.user_defined?.silent) {
        // If the message is silent, don't create a host element for it since it's not going to be rendered.
        ({ slotName } =
          this.serviceManager.userDefinedResponseService.getOrCreateUserDefinedElement(
            itemID,
          ));
      }

      const userDefinedResponseEvent: BusEventChunkUserDefinedResponse = {
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        data: {
          messageItem,
          chunk,
          slot: slotName,
        },
      };

      await this.serviceManager.fire(userDefinedResponseEvent);
    }
  }

  /**
   * Clears the chunk queue. Should be called when restarting conversation.
   */
  clearQueue() {
    this.chunkQueue = [];
  }
}

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from 'lodash-es/isEqual.js';

import actions from '../store/actions';
import {
  applyChunk,
  chunkHasDisplayableContent,
  FinalResponseChunk,
  resolveChunkContext,
} from '../utils/streamingUtils';
import { consoleError, consoleWarn } from '../utils/miscUtils';
import {
  ResolvablePromise,
  resolvablePromise,
} from '../utils/resolvablePromise';
import {
  isStreamFinalResponse,
  isStreamPartialItem,
  isTyping,
} from '../utils/messageUtils';
import { sleep } from '../utils/lang/promiseUtils';
import {
  AddMessageOptions,
  MessageState,
} from '../../types/config/MessagingConfig';
import {
  GenericItem,
  ItemStreamingMetadata,
  MessageResponse,
  PartialItemChunk,
  PartialOrCompleteItemChunk,
  PauseItem,
  StreamChunk,
} from '../../types/messaging/Messages';
import { DeepPartial } from '../../types/utilities/DeepPartial';
import type { ServiceManager } from './ServiceManager';

class ChunkProcessingService {
  private serviceManager: ServiceManager;

  /**
   * Queue of received chunks.
   */
  private chunkQueue: {
    chunk: StreamChunk;
    messageID?: string;
    options: AddMessageOptions;
    chunkPromise: ResolvablePromise<void>;
  }[] = [];

  /**
   * Tracks the current restart generation. Incremented each time
   * `bumpRestartGeneration()` is called so stale chunks from a previous
   * conversation can be detected and discarded.
   */
  private restartGeneration = 0;

  /**
   * Maps message IDs to the generation they were created in. Used to filter
   * out chunks from messages started before a restart.
   */
  private messageGenerations = new Map<string, number>();

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Increments the restart generation counter. Called by `restartConversation`
   * so any in-flight chunks from the previous conversation are discarded.
   */
  bumpRestartGeneration() {
    this.restartGeneration++;
  }

  /**
   * Waits out a "pause" item, with the typing indicator up for the duration when the pause
   * asks for it.
   *
   * @param pause The pause item.
   * @param initialRestartCount The restart count when the message arrived. A restart
   * during the pause resets the indicator itself, so it is not lowered again.
   */
  async waitForPause(pause: PauseItem, initialRestartCount: number) {
    const { store } = this.serviceManager;
    const showIsTyping = isTyping(pause);
    if (showIsTyping) {
      store.dispatch(actions.addIsLoadingCounter(1));
    }

    await sleep(pause.time);

    if (
      showIsTyping &&
      initialRestartCount === this.serviceManager.restartCount
    ) {
      store.dispatch(actions.addIsLoadingCounter(-1));
    }
  }

  /**
   * Receives a chunk from a stream.
   */
  async receiveChunk(
    chunk: StreamChunk,
    messageID?: string,
    options: AddMessageOptions = {}
  ) {
    if (isStreamPartialItem(chunk)) {
      const extractedMessageID =
        messageID ||
        ('streaming_metadata' in chunk &&
          chunk.streaming_metadata?.response_id);

      this.serviceManager.messageService.markCurrentMessageAsStreaming(
        extractedMessageID,
        chunk.partial_item?.streaming_metadata?.id
      );

      this.serviceManager.messageUpsertCoordinator.markStreaming(
        extractedMessageID || undefined
      );

      if (extractedMessageID) {
        this.serviceManager.streamAnnouncerService.announceStreamStarts(
          extractedMessageID,
          {
            hasReasoning: Boolean(
              chunk.partial_response?.message_options?.reasoning
            ),
            hasDisplayableContent: chunkHasDisplayableContent(chunk),
            responseUserProfile:
              chunk.partial_response?.message_options?.response_user_profile,
          }
        );
      }
    }

    const chunkPromise = resolvablePromise();
    this.chunkQueue.push({ chunk, messageID, options, chunkPromise });
    if (this.chunkQueue.length === 1) {
      this.processChunkQueue();
    }
    return chunkPromise;
  }

  async processChunkQueue() {
    const { chunk, options, chunkPromise } = this.chunkQueue[0];
    const { store } = this.serviceManager;

    try {
      const {
        messageID,
        item,
        isCompleteItem,
        isPartialItem,
        isFinalResponse,
      } = resolveChunkContext(chunk, this.chunkQueue[0].messageID);
      const stopStreamingState =
        store.getState().assistantInputState.stopStreamingButtonState;
      const hideStopStreaming = () => {
        if (
          (isCompleteItem || isFinalResponse) &&
          stopStreamingState.isVisible
        ) {
          this.serviceManager.messageService.hideStopStreamingButtonIfNoUpsertStreaming();
        }
      };

      if (this.shouldSkipChunkDueToGeneration(messageID, hideStopStreaming)) {
        this.advanceChunkQueue(chunkPromise);
        return;
      }

      if (isPartialItem) {
        this.serviceManager.messageService.updateStreamingCancellation(
          messageID ??
            this.serviceManager.messageService.inboundStreaming
              .streamingMessageID ??
            '',
          (chunk as PartialItemChunk).partial_item?.streaming_metadata
            ?.cancellable
        );
      }

      if (messageID) {
        store.dispatch(actions.setActiveResponseId(messageID));
      }

      if (isCompleteItem || isPartialItem) {
        await this.handleStreamingChunk(
          chunk as PartialOrCompleteItemChunk,
          messageID,
          item,
          isCompleteItem
        );
      } else if (isStreamFinalResponse(chunk)) {
        await this.handleFinalResponseChunk(chunk, messageID, options);
      }

      this.resetStopStreamingIfNeeded(isCompleteItem, chunk, messageID);

      this.advanceChunkQueue(chunkPromise);
    } catch (error) {
      consoleError('Error processing stream chunk', error);
      this.advanceChunkQueue(chunkPromise, error);
    }
  }

  private shouldSkipChunkDueToGeneration(
    messageID: string | undefined,
    hideStopStreaming: () => void
  ) {
    const inboundStreaming =
      this.serviceManager.messageService.inboundStreaming;
    if (
      messageID &&
      inboundStreaming &&
      !inboundStreaming.validateChunkGeneration(
        messageID,
        this.messageGenerations,
        this.restartGeneration,
        hideStopStreaming
      )
    ) {
      return true;
    }
    return false;
  }

  private async handleStreamingChunk(
    chunk: PartialOrCompleteItemChunk,
    messageID: string | undefined,
    item: DeepPartial<GenericItem> | undefined,
    isCompleteItem: boolean
  ) {
    if (isCompleteItem) {
      this.warnIfMissingCompleteItemStreamingId(messageID, item);
    }

    if (!messageID) {
      return;
    }

    const initialRestartCount = this.serviceManager.restartCount;
    const initialGeneration = this.restartGeneration;
    await this.serviceManager.messageUpsertCoordinator.upsert(
      messageID,
      MessageState.STREAMING,
      (prev) => applyChunk(prev, chunk, messageID),
      { origin: 'chunk', chunk: { item, isComplete: isCompleteItem } }
    );

    if (
      item &&
      initialRestartCount === this.serviceManager.restartCount &&
      initialGeneration === this.restartGeneration
    ) {
      await this.serviceManager.slotEventService.handleUserDefinedResponseItemsChunk(
        messageID,
        chunk,
        item
      );
    }
  }

  private async handleFinalResponseChunk(
    chunk: FinalResponseChunk,
    messageID: string | undefined,
    options: AddMessageOptions
  ) {
    this.warnIfMissingFinalResponseStreamingIds(
      messageID,
      chunk.final_response
    );
    const finalResponse = this.maybePatchFinalResponseItemIds(
      messageID,
      chunk.final_response
    );
    await this.serviceManager.receiveService.receive(
      finalResponse,
      options.isLatestWelcomeNode,
      null,
      'chunk'
    );

    if (messageID) {
      this.serviceManager.messageService.finalizeStreamingMessage(messageID);
    }
  }

  private warnIfMissingCompleteItemStreamingId(
    messageID: string | undefined,
    item: DeepPartial<GenericItem> | undefined
  ) {
    if (!item || item.streaming_metadata?.id) {
      return;
    }
    const idLabel = messageID ? ` for message "${messageID}"` : '';
    consoleWarn(
      `complete_item${idLabel} is missing streaming_metadata.id. ` +
        'Include streaming_metadata.id to preserve item identity and avoid remounts.'
    );
  }

  private warnIfMissingFinalResponseStreamingIds(
    messageID: string | undefined,
    response: MessageResponse
  ) {
    if (!messageID || !response?.output?.generic?.length) {
      return;
    }
    const state = this.serviceManager.store.getState();
    const { localMessageIDs } = state.assistantMessageState;
    const { allMessageItemsByID } = state;
    const hasStreamedItems = localMessageIDs.some(
      (localMessageID) =>
        allMessageItemsByID[localMessageID]?.fullMessageID === messageID
    );
    if (!hasStreamedItems) {
      return;
    }
    const missingCount = response.output.generic.filter(
      (item) => !item?.streaming_metadata?.id
    ).length;
    if (missingCount > 0) {
      consoleWarn(
        `final_response for message "${messageID}" contains ${missingCount} item(s) ` +
          'without streaming_metadata.id. If this response was streamed, include streaming_metadata.id ' +
          'for streamed items to preserve identity and avoid remounts.'
      );
    }
  }

  private maybePatchFinalResponseItemIds(
    messageID: string | undefined,
    response: MessageResponse
  ): MessageResponse {
    if (!messageID || !response?.output?.generic?.length) {
      return response;
    }

    const state = this.serviceManager.store.getState();
    const responseItems = response.output.generic;
    const existingItems = state.assistantMessageState.localMessageIDs
      .map((localMessageID) => state.allMessageItemsByID[localMessageID])
      .filter(
        (localMessage) =>
          localMessage && localMessage.fullMessageID === messageID
      )
      .map((localMessage) => localMessage.item);

    if (!existingItems.length) {
      return response;
    }

    if (existingItems.length !== responseItems.length) {
      return response;
    }

    const normalizeItem = (item: GenericItem) => {
      if (!item) {
        return item;
      }
      const { streaming_metadata: _streamingMetadata, ...rest } =
        item as GenericItem & { streaming_metadata?: ItemStreamingMetadata };
      return rest;
    };

    const itemsMatch = existingItems.every((existingItem, index) =>
      isEqual(normalizeItem(existingItem), normalizeItem(responseItems[index]))
    );

    if (!itemsMatch) {
      return response;
    }

    let didPatch = false;
    const nextItems = responseItems.map((item, index) => {
      const existingId = existingItems[index]?.streaming_metadata?.id;
      if (!existingId || item?.streaming_metadata?.id) {
        return item;
      }
      didPatch = true;
      return {
        ...item,
        streaming_metadata: {
          ...(item.streaming_metadata ?? {}),
          id: existingId,
        },
      };
    });

    if (!didPatch) {
      return response;
    }

    return {
      ...response,
      output: {
        ...response.output,
        generic: nextItems,
      },
    };
  }

  private resetStopStreamingIfNeeded(
    isCompleteItem: boolean,
    chunk: StreamChunk,
    messageID?: string
  ) {
    if (isCompleteItem || isStreamFinalResponse(chunk)) {
      this.serviceManager.messageService.clearStreamingCancellation(
        messageID ??
          this.serviceManager.messageService.inboundStreaming
            .streamingMessageID ??
          ''
      );
      this.serviceManager.messageService.hideStopStreamingButtonIfNoUpsertStreaming();
    }
  }

  private advanceChunkQueue(
    chunkPromise: ResolvablePromise<void>,
    error?: unknown
  ) {
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
}

export { ChunkProcessingService };

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from 'lodash-es/isEqual.js';
import cloneDeep from 'lodash-es/cloneDeep.js';
import cloneDeepWith from 'lodash-es/cloneDeepWith.js';
import {
  captureMessageEvent,
  eventValueMapper,
} from '../utils/messageEventOwnership';

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
  renderAsUserDefinedMessage,
  streamItemID,
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
import { OnErrorType } from '../../types/config/ErrorConfig';
import type { ServiceManager } from './ServiceManager';

interface RequestChunkErrors {
  restartGeneration: number;
  formattingErrors: Set<unknown>;
  reportedErrors: Set<unknown>;
}

class ChunkProcessingService {
  private serviceManager: ServiceManager;

  // A sender can still await chunks after its response advances the send queue.
  private pendingSendErrors = new Map<string, RequestChunkErrors>();

  trackRequestErrors(requestID: string, signal: AbortSignal) {
    const tracking: RequestChunkErrors = {
      restartGeneration: this.restartGeneration,
      formattingErrors: new Set(),
      reportedErrors: new Set(),
    };
    const finish = () => {
      if (this.pendingSendErrors.get(requestID) === tracking) {
        this.pendingSendErrors.delete(requestID);
      }
      signal.removeEventListener('abort', finish);
    };
    if (!signal.aborted) {
      this.pendingSendErrors.set(requestID, tracking);
      signal.addEventListener('abort', finish, { once: true });
    }
    return { ...tracking, finish };
  }

  /**
   * Queue of received chunks.
   */
  private chunkQueue: {
    chunk: StreamChunk;
    messageID?: string;
    requestID?: string;
    requestErrors?: RequestChunkErrors;
    isCurrent: () => boolean;
    options: AddMessageOptions;
    chunkPromise: ResolvablePromise<void>;
    restartGeneration: number;
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
    const restartGeneration = this.restartGeneration;
    const requestID = isStreamFinalResponse(chunk)
      ? chunk.final_response.request_id
      : chunk.streaming_metadata?.request_id;
    if (
      this.serviceManager.messageService.isRequestFromPreviousConversation(
        requestID
      )
    ) {
      return;
    }
    const { messageID: extractedMessageID } = resolveChunkContext(
      chunk,
      messageID
    );
    const lifecycle = this.serviceManager.conversationLifecycleService;
    if (
      requestID &&
      lifecycle.isRequestStopped(requestID) &&
      !lifecycle.isResponseOwnedByRequest(extractedMessageID, requestID)
    ) {
      return;
    }
    if (this.shouldSkipChunkDueToGeneration(extractedMessageID)) {
      return;
    }

    const write =
      this.serviceManager.messageUpsertCoordinator.trackWrite(
        extractedMessageID
      );
    try {
      this.serviceManager.messageService.messageLoadingManager.end();
      if (!write.isCurrent()) {
        return;
      }

      if (isStreamPartialItem(chunk)) {
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

      const ownerRequestID =
        requestID ??
        this.serviceManager.messageService.inboundStreaming.getStreamingMeta(
          extractedMessageID
        )?.requestId ??
        this.serviceManager.messageService.currentRequestID;
      const tracking = this.pendingSendErrors.get(ownerRequestID);
      const chunkPromise = resolvablePromise();
      this.chunkQueue.push({
        chunk,
        messageID,
        requestID: ownerRequestID,
        requestErrors:
          tracking?.restartGeneration === restartGeneration
            ? tracking
            : undefined,
        options,
        chunkPromise,
        restartGeneration,
        isCurrent: write.isCurrent,
      });
      if (this.chunkQueue.length === 1) {
        this.processChunkQueue();
      }
      return await chunkPromise;
    } finally {
      write.release();
    }
  }

  async processChunkQueue() {
    const {
      chunk,
      options,
      chunkPromise,
      restartGeneration,
      requestID,
      requestErrors,
      isCurrent: isWriteCurrent,
    } = this.chunkQueue[0];
    const { store, restartCount: initialRestartCount } = this.serviceManager;
    const isCurrent = () =>
      isWriteCurrent() &&
      restartGeneration === this.restartGeneration &&
      initialRestartCount === this.serviceManager.restartCount;
    let messageID: string | undefined;
    let terminalConversationFailure = false;

    const runCoreOperation = <T>(operation: () => T) => {
      try {
        return operation();
      } catch (error) {
        terminalConversationFailure = true;
        throw error;
      }
    };

    try {
      const context = resolveChunkContext(chunk, this.chunkQueue[0].messageID);
      ({ messageID } = context);
      const { item, isCompleteItem, isPartialItem } = context;
      if (!isCurrent()) {
        this.advanceChunkQueue(chunkPromise);
        return;
      }

      if (messageID && (isPartialItem || isCompleteItem)) {
        runCoreOperation(() =>
          this.serviceManager.conversationLifecycleService.responseStreaming(
            messageID,
            undefined,
            requestID
          )
        );
      }

      if (messageID && isStreamFinalResponse(chunk) && isCurrent()) {
        runCoreOperation(() =>
          this.serviceManager.conversationLifecycleService.responseReceived(
            messageID,
            undefined,
            requestID
          )
        );
      }
      if (!isCurrent()) {
        this.advanceChunkQueue(chunkPromise);
        return;
      }
      if (
        isPartialItem &&
        !this.serviceManager.conversationLifecycleService.isRequestStopped(
          requestID
        )
      ) {
        runCoreOperation(() =>
          this.serviceManager.messageService.updateStreamingCancellation(
            messageID ??
              this.serviceManager.messageService.inboundStreaming
                .streamingMessageID ??
              '',
            (chunk as PartialItemChunk).partial_item?.streaming_metadata
              ?.cancellable
          )
        );
      }

      if (!isCurrent()) {
        this.advanceChunkQueue(chunkPromise);
        return;
      }
      if (messageID) {
        runCoreOperation(() =>
          store.dispatch(actions.setActiveResponseId(messageID))
        );
      }

      if (!isCurrent()) {
        this.advanceChunkQueue(chunkPromise);
        return;
      }
      if (isCompleteItem || isPartialItem) {
        let ownedItem: DeepPartial<GenericItem>;
        try {
          ownedItem = await this.commitStreamingChunk(
            chunk as PartialOrCompleteItemChunk,
            messageID,
            item,
            isCompleteItem,
            isCurrent,
            requestID
          );
        } catch (error) {
          terminalConversationFailure = true;
          throw error;
        }
        if (isCurrent()) {
          await this.notifyStreamingChunk(
            chunk as PartialOrCompleteItemChunk,
            messageID,
            item,
            ownedItem,
            isCurrent
          );
        }
      } else if (isStreamFinalResponse(chunk)) {
        await this.handleFinalResponseChunk(
          chunk,
          messageID,
          options,
          isCurrent
        );
        if (messageID && isCurrent()) {
          runCoreOperation(() =>
            this.serviceManager.messageService.finalizeStreamingMessage(
              messageID
            )
          );
        }
      }

      if (isCurrent()) {
        runCoreOperation(() =>
          this.resetStopStreamingIfNeeded(isCompleteItem, chunk, messageID)
        );
      }

      this.advanceChunkQueue(chunkPromise);
    } catch (error) {
      // Callback errors can outlive response routing; formatting does not suppress reports.
      this.pendingSendErrors.forEach(({ formattingErrors }) => {
        formattingErrors.add(error);
      });
      consoleError('Error processing stream chunk', error);
      if (!isCurrent()) {
        this.advanceChunkQueue(chunkPromise, { error });
        return;
      }
      const responseID = messageID
        ? this.serviceManager.messageService.inboundStreaming.resolveResponseId(
            messageID
          )
        : undefined;
      if (responseID) {
        this.serviceManager.messageService.markStreamingResponseError(
          responseID
        );
      }
      if (terminalConversationFailure) {
        this.serviceManager.conversationLifecycleService.fail({
          messageID: requestID ?? messageID,
        });
        requestErrors?.reportedErrors.add(error);
        this.serviceManager.actions.errorOccurred({
          errorType: OnErrorType.MESSAGE_COMMUNICATION,
          message: 'The chat could not process a streamed response.',
          otherData: error,
        });
      }
      this.advanceChunkQueue(chunkPromise, { error });
    }
  }

  private shouldSkipChunkDueToGeneration(messageID: string | undefined) {
    const inboundStreaming =
      this.serviceManager.messageService.inboundStreaming;
    if (
      messageID &&
      inboundStreaming &&
      !inboundStreaming.validateChunkGeneration(
        messageID,
        this.messageGenerations,
        this.restartGeneration
      )
    ) {
      return true;
    }
    return false;
  }

  private async commitStreamingChunk(
    chunk: PartialOrCompleteItemChunk,
    messageID: string | undefined,
    item: DeepPartial<GenericItem> | undefined,
    isCompleteItem: boolean,
    isCurrent: () => boolean,
    requestID?: string
  ) {
    if (isCompleteItem) {
      this.warnIfMissingCompleteItemStreamingId(messageID, item);
    }
    if (!messageID) {
      return undefined;
    }
    const ownedItem = cloneDeep(item);
    const ownedChunk = {
      ...chunk,
      partial_response: cloneDeep(chunk.partial_response),
    };
    await this.serviceManager.messageUpsertCoordinator.upsert(
      messageID,
      MessageState.STREAMING,
      (prev) => applyChunk(prev, ownedChunk, messageID),
      {
        origin: 'chunk',
        chunk: { item: ownedItem, isComplete: isCompleteItem, requestID },
        isCurrent,
      }
    );
    return ownedItem;
  }

  private async notifyStreamingChunk(
    chunk: PartialOrCompleteItemChunk,
    messageID: string | undefined,
    item: DeepPartial<GenericItem> | undefined,
    ownedItem: DeepPartial<GenericItem> | undefined,
    isCurrent: () => boolean
  ) {
    if (!messageID || !item) {
      return;
    }
    const { store } = this.serviceManager;
    const id = streamItemID(messageID, ownedItem);
    const stored = store.getState();
    const localItem = stored.allMessageItemsByID[id];
    const message = stored.allMessagesByID[messageID];
    const event =
      renderAsUserDefinedMessage(item) && localItem && message
        ? captureMessageEvent(
            this.serviceManager,
            message,
            { [id]: localItem },
            {
              message,
              localItems: {
                [id]: cloneDeepWith(
                  localItem,
                  eventValueMapper(ownedItem, item)
                ),
              },
            },
            isCurrent
          )
        : undefined;
    try {
      await this.serviceManager.slotEventService.handleUserDefinedResponseItemsChunk(
        messageID,
        chunk,
        item,
        isCurrent
      );
    } finally {
      event?.commit();
    }
  }

  private async handleFinalResponseChunk(
    chunk: FinalResponseChunk,
    messageID: string | undefined,
    options: AddMessageOptions,
    isCurrent: () => boolean
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
      'chunk',
      isCurrent
    );
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
    failure?: { error: unknown }
  ) {
    this.chunkQueue.shift();
    if (failure) {
      chunkPromise.doReject(failure.error);
    } else {
      chunkPromise.doResolve();
    }
    if (this.chunkQueue[0]) {
      this.processChunkQueue();
    }
  }
}

export { ChunkProcessingService };

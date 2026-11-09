/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * MessageService orchestrates outbound sends and inbound streaming for the chat widget.
 *
 * High-level flow:
 * 1) `send()` queues a `MessageRequest` and kicks off the queue.
 * 2) `SendWorkflow.runQueueIfReady()` pulls the next pending request, fires PRE_SEND/SEND events, starts loading/timeout timers,
 *    and delegates the actual send to `customSendMessage` via `OutboundMessageCoordinator`.
 * 3) OutboundCoordinator clones/updates the message in store, calls `customSendMessage` (sync or async), and on success
 *    calls back into `processSuccess`; on error/cancel it resolves/rejects and advances the queue.
 * 4) Incoming stream chunks are handled through `ChunkProcessingService`, which marks streaming and finalization via
 *    `InboundStreamingCoordinator`. InboundCoordinator tracks response_id/item_id pairs so cancellations and
 *    finalization can advance the queue even when response_id differs from the original request id.
 * 5) FinalResponseChunk or cancellation clears streaming tracking and moves to the next queued message.
 *
 * Responsibilities:
 * - MessageCoordinator: queue membership and pending request lookup.
 * - SendWorkflow: queue execution, PRE_SEND/SEND events, loading and settlement.
 * - MessageService: queue entry, controller and stream tracking, cancellation entrypoints.
 * - OutboundMessageCoordinator: send lifecycle (store updates, calling customSendMessage, resolving/rejecting/canceling).
 * - InboundStreamingCoordinator: streaming id tracking (response_id/item_id), finalization, cancellation cleanup.
 */
import actions from '../../store/actions';
import {
  ResolvablePromise,
  resolvablePromise,
} from '../../utils/resolvablePromise';
import {
  resetStopStreamingButton,
  syncStopStreamingButton,
} from '../../utils/streamingUtils';
import { ServiceManager } from '../ServiceManager';
import { InboundStreamingCoordinator } from './InboundStreamingCoordinator';
import type { StreamResponseMeta } from './state/StreamState';
import {
  MessageInputType,
  MessageRequest,
  MessageResponse,
} from '../../../types/messaging/Messages';
import { SendOptions } from '../../../types/instance/ChatInstance';
import { MessageSendSource } from '../../../types/events/eventBusTypes';
import { PublicConfig } from '../../../types/config/PublicConfig';
import { OnErrorType } from '../../../types/config/ErrorConfig';
import { CancellationReason } from '../../../types/config/MessagingConfig';

/**
 * Extra data about a message response that we want included in the track event when the response is received.
 */
interface ResponseTrackData {
  /**
   * The amount of time the last request took.
   */
  lastRequestTime: number;

  /**
   * The number of errors that occurred. This does not include JWT errors or session expired errors.
   */
  numErrors: number;

  /**
   * The total time that all the requests took, in milliseconds.
   */
  totalRequestTime: number;
}

interface SendMessageRequest {
  /**
   * The message being sent.
   */
  message: MessageRequest<any>;

  /**
   * The promise to resolve once the send is complete.
   */
  sendMessagePromise: ResolvablePromise<void>;
}

// In order to be able to resolve the correct message in the queue, we pass along the promise we will return with the
// message and call resolve/reject on "resolvablePromise".
export interface PendingMessageRequest extends SendMessageRequest {
  /** Conversation generation in which this request was accepted. */
  generation?: number;

  restartGeneration: number;

  /**
   * The ID of the {@link LocalMessageItem} created from the current request.
   */
  localMessageID: string;

  /**
   * The time the message started the send process. This occurs after the message was in the queue and is now the
   * next message to be sent.
   */
  timeFirstRequest: number;

  /**
   * The time the most recent request started.
   */
  timeLastRequest: number;

  /**
   * The AbortController for when using customSendMessage.
   */
  sendMessageController?: AbortController;

  /**
   * The options that were included when the request was sent.
   */
  requestOptions: SendOptions;

  /**
   * The source of the message.
   */
  source: MessageSendSource;

  /**
   * The tracking data for this message.
   */
  trackData: ResponseTrackData;

  /**
   * Indicates if the response has been processed.
   */
  isProcessed: boolean;

  /**
   * Indicates if this message is streaming and we should wait for FinalResponseChunk before clearing from queue.
   */
  isStreaming?: boolean;
}

class MessageService {
  private nonCancellableResponseIDs = new Set<string>();

  /**
   * The service manager to use to access services.
   */
  private serviceManager: ServiceManager;

  /**
   * Handles inbound streaming tracking and lifecycle.
   */
  public inboundStreaming: InboundStreamingCoordinator;

  /**
   * Maps message IDs to their AbortControllers. This persists even after messages are cleared from the queue,
   * allowing cancellation of streaming messages that have already "completed" from MessageService's perspective.
   */
  private messageAbortControllers = new Map<string, AbortController>();

  get messageLoadingManager() {
    return this.serviceManager.messageCoordinator.messageLoadingManager;
  }

  get timeoutMS() {
    return this.serviceManager.messageCoordinator.timeoutMS;
  }

  set timeoutMS(value: number) {
    this.serviceManager.messageCoordinator.timeoutMS = value;
  }

  get currentRequestID() {
    const current = this.serviceManager.messageCoordinator.getCurrentRequest();
    return current && !current.isProcessed ? current.message.id : undefined;
  }
  public registerRequestGeneration(
    requestID: string,
    restartGeneration: number
  ) {
    this.serviceManager.messageCoordinator.registerRequestGeneration(
      requestID,
      restartGeneration
    );
  }
  public isRequestFromPreviousConversation(
    requestID: string | undefined
  ): boolean {
    return this.serviceManager.messageCoordinator.isRequestFromPreviousConversation(
      requestID
    );
  }

  constructor(serviceManager: ServiceManager, publicConfig: PublicConfig) {
    this.serviceManager = serviceManager;
    this.inboundStreaming = new InboundStreamingCoordinator(
      this.messageAbortControllers
    );

    this.serviceManager.messageCoordinator.configureMessageTimeout(
      publicConfig
    );
  }

  /**
   * Add a new message to the message queue.
   *
   * @param message A new message to add to the message queue.
   @param source The source of the message.
   * @param localMessageID The ID of the {@link LocalMessageItem} created from the current request.
   * @param sendMessagePromise A promise that we will resolve or reject if the message is sent.
   * @param requestOptions The options that were included when the request was sent.
   */
  private addToMessageQueue(
    message: MessageRequest<any>,
    source: MessageSendSource,
    localMessageID: string,
    sendMessagePromise: ResolvablePromise<void>,
    requestOptions: SendOptions = {}
  ) {
    // Create AbortController immediately so it can be aborted even if message is still waiting
    const controller = new AbortController();

    // Store controller in map so it persists even after message is cleared from queue
    this.messageAbortControllers.set(message.id, controller);

    const newPendingMessage: PendingMessageRequest = {
      generation: this.serviceManager.messageCoordinator.currentGeneration,
      restartGeneration: this.serviceManager.restartCount,
      localMessageID,
      message,
      sendMessagePromise,
      requestOptions: requestOptions || {},
      timeFirstRequest: 0,
      timeLastRequest: 0,
      trackData: {
        numErrors: 0,
        lastRequestTime: 0,
        totalRequestTime: 0,
      },
      isProcessed: false,
      source,
      sendMessageController: controller,
    };

    this.serviceManager.messageCoordinator.enqueueRequest(newPendingMessage);
  }

  /**
   * Performs any finishes steps necessary to complete the current queue item.
   */
  private clearCurrentQueueItem() {
    this.serviceManager.messageCoordinator.clearCurrentRequest();
  }
  private moveToNextQueueItem() {
    this.serviceManager.messageCoordinator.advanceRequestQueue();
  }

  /**
   * Send a message to the backend. Returns "any" in the error case.
   *
   * @param message Takes a {@link MessageRequest} object.
   * @param source The source of the message.
   * @param localMessageID The ID of the {@link LocalMessageItem} created from the current request.
   * @param requestOptions The options that were included when the request was sent.
   */
  public send(
    message: MessageRequest<any>,
    source: MessageSendSource,
    localMessageID?: string,
    requestOptions?: SendOptions
  ): Promise<MessageResponse | any> {
    message.history.timestamp = message.history.timestamp || Date.now();

    // The messageService does different things based off the message type so lets make sure one exists.
    message.input = message.input || {};
    message.input.message_type =
      message.input.message_type || MessageInputType.TEXT;

    // Create a Promise that the caller can wait on that we'll resolve if/when the message is finally successfully sent
    // to the assistant. This gets resolved or rejected by the core success or error workflow.
    const sendMessagePromise = resolvablePromise<void>();

    // Add our new message to the queue and kick off the queue.
    this.addToMessageQueue(
      message,
      source,
      localMessageID,
      sendMessagePromise,
      requestOptions
    );
    this.serviceManager.messageCoordinator.runQueueIfReady();

    // Return the promise that is either successfully resolve or rejected in this.processSuccess or this.processError.
    return sendMessagePromise;
  }

  /**
   * Cancels all message requests including any that are running now and any that are waiting in the queue.
   */
  public async cancelAllMessageRequests(
    reason: string = CancellationReason.CONVERSATION_RESTARTED
  ) {
    this.clearAllStreamingCancellation();
    // Abort listeners can remove controllers from tracking before cancellation finishes.
    const messageAbortControllers = Array.from(this.messageAbortControllers);

    while (this.serviceManager.messageCoordinator.getWaitingRequestCount()) {
      await this.cancelMessageRequestByID(
        this.serviceManager.messageCoordinator.getFirstWaitingRequest().message
          .id,
        false,
        reason
      );
    }
    if (this.serviceManager.messageCoordinator.getCurrentRequest()) {
      await this.cancelMessageRequestByID(
        this.serviceManager.messageCoordinator.getCurrentRequest().message.id,
        false,
        reason
      );
      this.clearCurrentQueueItem();
    }

    // Settle every upsert-driven stream. Mirror cancelCurrentMessageRequest's
    // cleanup: if any upsert stream was running, the stop button must come down
    // now that nothing in the send-queue remains either.
    const settledUpsertStreams =
      this.serviceManager.messageUpsertCoordinator.endAllStreaming(reason);
    if (settledUpsertStreams) {
      this.hideStopStreamingButtonIfIdle();
    }

    for (const [messageID, controller] of messageAbortControllers) {
      controller.abort(reason);
      this.inboundStreaming.clearStreamingResponse(messageID);
    }
  }

  /**
   * Marks the current message as streaming so we don't clear it from the queue until FinalResponseChunk arrives.
   * Also tracks the streaming message ID in case the queue gets cleared before finalization.
   *
   * Streaming chunks can arrive with response_id/item_id values that differ from the original request message.id.
   * We record those IDs (and their AbortController) so later cancel calls can target either id.
   */
  public markCurrentMessageAsStreaming(messageID?: string, itemID?: string) {
    this.inboundStreaming.markStreaming(
      this.serviceManager.messageCoordinator.getCurrentRequest(),
      messageID,
      itemID,
      this.serviceManager.messageCoordinator.lastProcessedMessageID
    );
  }

  /**
   * Called when a FinalResponseChunk is processed to clear the streaming message from the queue.
   */
  public finalizeStreamingMessage(messageID: string) {
    const responseId = this.inboundStreaming.resolveResponseId(messageID);
    if (this.inboundStreaming.streamingMessageID === responseId) {
      this.moveToNextQueueItem();
    }
    this.inboundStreaming.clearStreamingResponse(responseId);
    this.serviceManager.messageCoordinator.responseFinished(messageID);
  }

  /** Ends response streaming without treating the associated transport as complete. */
  public markStreamingResponseError(messageID: string) {
    const responseID = this.inboundStreaming.resolveResponseId(messageID);
    const streamingMeta = this.inboundStreaming.getStreamingMeta(responseID);
    const current = this.serviceManager.messageCoordinator.getCurrentRequest();
    const isCurrentResponse = Boolean(
      current &&
      (current.message.id === responseID ||
        current.message.id === streamingMeta?.requestId ||
        (current.isStreaming &&
          this.inboundStreaming.streamingMessageID === responseID))
    );
    this.serviceManager.messageUpsertCoordinator.endStreamingMessage(
      responseID,
      isCurrentResponse ? current.generation : undefined
    );
    this.inboundStreaming.clearStreamingResponse(responseID);
    if (isCurrentResponse) {
      current.isStreaming = false;
      if (current.isProcessed) {
        this.moveToNextQueueItem();
      }
    }
    this.hideStopStreamingButtonIfIdle();
  }

  public finishFailedStreamingResponse(pendingRequest: PendingMessageRequest) {
    this.serviceManager.messageUpsertCoordinator.endStreamingForRequest(
      pendingRequest.message.id,
      pendingRequest.generation
    );
    this.serviceManager.messageCoordinator.requestStopped(
      pendingRequest.message.id,
      pendingRequest.generation
    );
    if (!pendingRequest.isStreaming) {
      return;
    }
    const responseID =
      this.inboundStreaming.streamingMessageID || pendingRequest.message.id;
    pendingRequest.isStreaming = false;
    const streamingMeta = this.inboundStreaming.getStreamingMeta(responseID);
    if (streamingMeta?.requestId !== pendingRequest.message.id) {
      return;
    }
    this.inboundStreaming.clearStreamingResponse(responseID);
    this.serviceManager.messageCoordinator.responseFinished(
      responseID,
      pendingRequest.generation
    );
  }

  getCurrentMessageController() {
    return this.serviceManager.messageCoordinator.getCurrentRequest()
      ?.sendMessageController;
  }

  /**
   * Returns true when any message is still streaming, whichever API is driving it —
   * `addMessageChunk` (tracked by {@link inboundStreaming}) or `upsertMessage` (tracked
   * by the upsert coordinator). This is the single source of truth for "is the chat still
   * producing output", so the stop streaming button does not vanish when one of several
   * concurrent streams finishes.
   */
  public isAnyMessageStreaming(): boolean {
    if (this.inboundStreaming.streamingMessageID) {
      return true;
    }
    return this.serviceManager.messageUpsertCoordinator.hasStreamingMessages();
  }

  /**
   * Hides the stop streaming button unless something is still streaming.
   */
  public hideStopStreamingButtonIfIdle() {
    if (
      !this.isAnyMessageStreaming() &&
      (!this.serviceManager.messageCoordinator.getCurrentRequest() ||
        this.serviceManager.messageCoordinator.getCurrentRequest().isProcessed)
    ) {
      resetStopStreamingButton(this.serviceManager.store);
    }
  }

  public updateStreamingCancellation(messageID: string, cancellable?: boolean) {
    if (cancellable === false) {
      this.nonCancellableResponseIDs.add(messageID);
    } else if (cancellable === true) {
      this.nonCancellableResponseIDs.delete(messageID);
    }
    syncStopStreamingButton(
      this.serviceManager.store,
      cancellable,
      this.nonCancellableResponseIDs.size > 0
    );
  }

  public clearStreamingCancellation(messageID: string) {
    if (this.nonCancellableResponseIDs.delete(messageID)) {
      syncStopStreamingButton(
        this.serviceManager.store,
        undefined,
        this.nonCancellableResponseIDs.size > 0
      );
    }
  }

  public clearAllStreamingCancellation() {
    this.nonCancellableResponseIDs.clear();
    syncStopStreamingButton(this.serviceManager.store);
  }

  /**
   * Hides the stop streaming button unless an `upsertMessage` stream is still running.
   *
   * The chunk flow has always hidden the button on its own `complete_item`, and that
   * behavior is deliberately preserved — so these call sites must ignore
   * {@link inboundStreaming} and ask only whether the *other* flow is live. Consulting the
   * chunk state here would keep the button up past a `complete_item`, which is a different
   * change than the one this method exists to make.
   */
  public hideStopStreamingButtonIfNoUpsertStreaming() {
    if (!this.serviceManager.messageUpsertCoordinator.hasStreamingMessages()) {
      resetStopStreamingButton(this.serviceManager.store);
    }
  }

  /**
   * Cancels the current request and settles every registered chunk and upsert stream.
   */
  public async cancelCurrentMessageRequest(
    reason: string = CancellationReason.STOP_STREAMING
  ) {
    // Settle before the chunk branch, which can return early.
    this.serviceManager.messageUpsertCoordinator.endAllStreaming(reason);
    this.hideStopStreamingButtonIfIdle();

    // If there's a streaming message, cancel it even if not in queue
    if (this.inboundStreaming.streamingMessageID) {
      await this.cancelMessageRequestByID(
        this.inboundStreaming.streamingMessageID,
        false,
        reason
      );
      return;
    }

    if (this.serviceManager.messageCoordinator.getCurrentRequest()) {
      await this.cancelMessageRequestByID(
        this.serviceManager.messageCoordinator.getCurrentRequest().message.id,
        false,
        reason
      );
      this.clearCurrentQueueItem();
    }
  }

  private findPendingRequestForCancellation(
    responseId: string,
    streamingEntry?: { requestId?: string }
  ) {
    if (
      this.serviceManager.messageCoordinator.getCurrentRequest()?.message.id ===
        responseId ||
      (streamingEntry &&
        this.serviceManager.messageCoordinator.getCurrentRequest()?.message
          .id === streamingEntry.requestId)
    ) {
      return this.serviceManager.messageCoordinator.getCurrentRequest();
    }

    if (
      this.serviceManager.messageCoordinator.getCurrentRequest()?.isStreaming &&
      this.inboundStreaming.streamingMessageID
    ) {
      // The streaming response_id can differ from the original message.id
      // so treat the current streaming request as a match for cancellation.
      return this.serviceManager.messageCoordinator.getCurrentRequest();
    }

    return this.serviceManager.messageCoordinator.removeWaitingRequest(
      responseId
    );
  }

  private findAbortControllerForCancellation(
    responseId: string,
    streamingEntry: StreamResponseMeta | null,
    pendingRequest?: PendingMessageRequest
  ) {
    return (
      this.messageAbortControllers.get(responseId) ||
      (streamingEntry?.requestId
        ? this.messageAbortControllers.get(streamingEntry.requestId)
        : undefined) ||
      (pendingRequest
        ? this.messageAbortControllers.get(pendingRequest.message.id)
        : undefined) ||
      this.inboundStreaming.getController(streamingEntry?.controllerToken)
    );
  }

  private async handleCancellationResolution(
    responseId: string,
    pendingRequest: PendingMessageRequest | undefined,
    controller: AbortController | undefined,
    logError: boolean,
    reason: string
  ) {
    if (!pendingRequest && !controller) {
      return;
    }

    // Abort listeners may restart the chat, so read the generation first.
    const generation = this.serviceManager.messageCoordinator.currentGeneration;
    const sendMessageController =
      controller || pendingRequest?.sendMessageController;

    // If someone is using customMessageSend, we let them know they should abort the request.
    sendMessageController?.abort(reason);

    // Clean up the controller from the map and streaming tracking
    this.inboundStreaming.clearStreamingResponse(responseId);
    if (!pendingRequest) {
      // The sender already settled, so only the response stream remains.
      this.serviceManager.messageCoordinator.responseStopped(
        responseId,
        generation
      );
    }

    // Only process the pending request if it exists (it may have already been cleared from queue)
    if (pendingRequest) {
      if (reason !== CancellationReason.TIMEOUT) {
        this.serviceManager.messageCoordinator.requestStopped(
          pendingRequest.message.id,
          pendingRequest.generation
        );
      }
      if (reason === CancellationReason.TIMEOUT) {
        if (logError) {
          this.serviceManager.messageCoordinator.fail(
            {
              messageID: pendingRequest.message.id,
            },
            pendingRequest.generation
          );
        }
        this.serviceManager.messageCoordinator.rejectFinalErrorOnMessage(
          pendingRequest,
          reason
        );
        if (logError) {
          // Preserve the callback's microtask boundary after rejecting the request.
          await Promise.resolve();
          this.serviceManager.actions.errorOccurred({
            errorType: OnErrorType.MESSAGE_COMMUNICATION,
            message: reason,
            otherData: undefined,
          });
        }
      } else if (pendingRequest.isStreaming) {
        // No system message here: the host marks a stopped stream itself with
        // stream_stopped on its closing chunk, and only MessageTypeComponent reads it.
        // Mark as processed and advance the queue
        pendingRequest.sendMessagePromise.doResolve();
        pendingRequest.isProcessed = true;
        this.serviceManager.messageCoordinator.requestFinished(
          pendingRequest.message.id,
          pendingRequest.generation
        );
        this.serviceManager.messageCoordinator.responseStopped(
          responseId,
          pendingRequest.generation
        );
        // Hide and re-enable the stop streaming button now that cancellation has
        // completed; processSuccess/processError will short-circuit on isProcessed.
        // This hid unconditionally before `upsertMessage` existed, so it still ignores
        // other chunk streams; only a running upsert stream keeps the button up.
        this.hideStopStreamingButtonIfNoUpsertStreaming();
        if (
          pendingRequest ===
          this.serviceManager.messageCoordinator.getCurrentRequest()
        ) {
          this.moveToNextQueueItem();
        }
      } else {
        // Only create "Request canceled" system message if we haven't started streaming yet
        this.serviceManager.messageCoordinator.resolveCancelledMessage(
          pendingRequest
        );
      }
    }
  }

  /**
   * Cancel a message given an ID. Can be a message in process or one that is waiting to be processed.
   */
  public async cancelMessageRequestByID(
    messageID: string,
    logError: boolean,
    reason = 'Message was canceled'
  ) {
    // messageID may be an item_id or response_id; resolve to whichever streaming id we tracked.
    const responseId = this.inboundStreaming.resolveResponseId(messageID);
    this.clearStreamingCancellation(responseId);
    const streamingEntry = this.inboundStreaming.getStreamingMeta(responseId);
    const wasStreamingCurrent =
      this.inboundStreaming.streamingMessageID === responseId;

    const pendingRequest = this.findPendingRequestForCancellation(
      responseId,
      streamingEntry
    );
    const controller = this.findAbortControllerForCancellation(
      responseId,
      streamingEntry,
      pendingRequest
    );

    await this.handleCancellationResolution(
      responseId,
      pendingRequest,
      controller,
      logError,
      reason
    );

    // A canceled stream often ends without a `complete_item` or `final_response` — the
    // host simply breaks out of its loop. Nothing else would settle the items' streaming
    // flags, which left streaming-aware rendering (an in-progress markdown table, for
    // one) engaged for the rest of the session.
    if (streamingEntry) {
      this.serviceManager.store.dispatch(
        actions.endMessageStreaming(responseId)
      );
    }

    if (!pendingRequest && wasStreamingCurrent) {
      this.moveToNextQueueItem();
    }
  }
}

export default MessageService;

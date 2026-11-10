/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from '../../store/actions';
import { BusEventType } from '../../../types/events/eventBusTypes';
import { consoleError } from '../../utils/miscUtils';
import type { PendingMessageRequest } from './pendingRequestTypes';
import {
  resetStopStreamingButton,
  syncStopStreamingButton,
} from '../../utils/streamingUtils';
import { ServiceManager } from '../ServiceManager';
import { InboundStreamingCoordinator } from './InboundStreamingCoordinator';
import type { StreamResponseMeta } from './state/StreamState';
import { OnErrorType } from '../../../types/config/ErrorConfig';
import { CancellationReason } from '../../../types/config/MessagingConfig';

class TerminationWorkflow {
  /** The stop in progress. Overlapping stops share it, so they cancel once. */
  private stopping: Promise<void> | undefined;

  /**
   * `messaging.stop()`: fires `STOP_STREAMING`, then aborts the active turn, the way the
   * chat's own Stop button does. Resolves once the abort signal is delivered, or at once
   * when no turn is submitted or streaming. Never rejects.
   */
  stop(): Promise<void> {
    const status = this.serviceManager.store.getState().conversationStatus;
    if (!this.stopping && status !== 'submitted' && status !== 'streaming') {
      return Promise.resolve();
    }
    return this.stopActiveTurn(this.chatShowsStopButton());
  }

  async requestStopFromInput(markPending: () => void): Promise<void> {
    // Pending UI can flush host effects; capture visibility before calling it.
    const chatShowsButton = this.chatShowsStopButton();
    markPending();
    if (chatShowsButton) {
      return this.stopActiveTurn(true);
    }
    // A button the host shows for its own work only tells the host.
    try {
      await this.serviceManager.fire({ type: BusEventType.STOP_STREAMING });
    } catch (error) {
      consoleError('Error stopping stream:', error);
      this.serviceManager.store.dispatch(
        actions.setStopStreamingButtonDisabled(false)
      );
    }
  }

  private chatShowsStopButton() {
    return this.serviceManager.store.getState().assistantInputState
      .stopStreamingButtonState.isVisible;
  }

  private stopActiveTurn(chatShowsButton: boolean): Promise<void> {
    if (!this.stopping) {
      this.stopping = this.runStop(chatShowsButton).finally(() => {
        this.stopping = undefined;
      });
    }
    return this.stopping;
  }

  private async runStop(chatShowsButton: boolean) {
    const { store } = this.serviceManager;
    if (chatShowsButton) {
      store.dispatch(actions.setStopStreamingButtonDisabled(true));
    }
    try {
      await this.serviceManager.fire({ type: BusEventType.STOP_STREAMING });
      await this.serviceManager.messageCoordinator.cancelCurrentMessageRequest();
    } catch (error) {
      consoleError('Error stopping stream:', error);
      store.dispatch(actions.setStopStreamingButtonDisabled(false));
    }
  }

  registerMessageController(messageID: string, controller: AbortController) {
    this.messageAbortControllers.set(messageID, controller);
  }

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
   * allowing cancellation of streaming messages that have already "completed" from MessageCoordinator's perspective.
   */
  private messageAbortControllers = new Map<string, AbortController>();

  get currentRequestID() {
    const current = this.serviceManager.messageCoordinator.getCurrentRequest();
    return current && !current.isProcessed ? current.message.id : undefined;
  }

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
    this.inboundStreaming = new InboundStreamingCoordinator(
      this.messageAbortControllers
    );
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
      this.serviceManager.messageCoordinator.endAllIncomingStreaming(reason);
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
    this.serviceManager.messageCoordinator.endIncomingStreamingMessage(
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
    this.serviceManager.messageCoordinator.endIncomingStreamingForRequest(
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
    return this.serviceManager.messageCoordinator.hasIncomingStreamingMessages();
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
    if (
      !this.serviceManager.messageCoordinator.hasIncomingStreamingMessages()
    ) {
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
    this.serviceManager.messageCoordinator.endAllIncomingStreaming(reason);
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
        const timeoutError = {
          errorType: OnErrorType.MESSAGE_COMMUNICATION,
          message: reason,
          otherData: undefined as unknown,
          messageID: pendingRequest.message.id,
        };
        if (logError) {
          this.serviceManager.messageCoordinator.fail(
            timeoutError,
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
          this.serviceManager.actions.errorOccurred(timeoutError);
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

export { TerminationWorkflow };

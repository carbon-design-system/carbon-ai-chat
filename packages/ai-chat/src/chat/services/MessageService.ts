/*
 *  Copyright IBM Corp. 2025
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
 * 2) `runQueueIfReady()` pulls the next pending request, fires PRE_SEND/SEND events, starts loading/timeout timers,
 *    and delegates the actual send to `customSendMessage` via `OutboundMessageCoordinator`.
 * 3) OutboundCoordinator clones/updates the message in store, calls `customSendMessage` (sync or async), and on success
 *    calls back into `processSuccess`; on error/cancel it resolves/rejects and advances the queue.
 * 4) Incoming stream chunks are handled through `ChatActionsImpl`, which marks streaming and finalization via
 *    `InboundStreamingCoordinator`. InboundCoordinator tracks response_id/item_id pairs so cancellations and
 *    finalization can advance the queue even when response_id differs from the original request id.
 * 5) FinalResponseChunk or cancellation clears streaming tracking and moves to the next queued message.
 *
 * Responsibilities:
 * - MessageService: queueing/orchestration, PRE_SEND/SEND events, loading/timeout setup, cancellation entrypoints.
 * - OutboundMessageCoordinator: send lifecycle (store updates, calling customSendMessage, resolving/rejecting/cancelling).
 * - InboundStreamingCoordinator: streaming id tracking (response_id/item_id), finalization, cancellation cleanup.
 */
import inputItemToLocalItem from "../schema/inputItemToLocalItem";
import actions from "../store/actions";
import { deepFreeze } from "../utils/lang/objectUtils";
import { MessageLoadingManager } from "../utils/messageServiceUtils";
import {
  getLastAssistantResponseWithContext,
  THREAD_ID_MAIN,
} from "../utils/messageUtils";
import { safeFetchTextWithTimeout } from "../utils/miscUtils";
import {
  ResolvablePromise,
  resolvablePromise,
} from "../utils/resolvablePromise";
import { resetStopStreamingButton } from "../utils/streamingUtils";
import { ServiceManager } from "./ServiceManager";
import { InboundStreamingCoordinator } from "./InboundStreamingCoordinator";
import { OutboundMessageCoordinator } from "./OutboundMessageCoordinator";
import {
  MessageInputType,
  MessageRequest,
  MessageResponse,
} from "../../types/messaging/Messages";
import { SendOptions } from "../../types/instance/ChatInstance";
import {
  BusEventType,
  MessageSendSource,
} from "../../types/events/eventBusTypes";
import { OnErrorType, PublicConfig } from "../../types/config/PublicConfig";
import { LanguagePack } from "../../types/config/PublicConfig";
import { MessageErrorState } from "../../types/messaging/LocalMessageItem";
import { CancellationReason } from "../../types/config/MessagingConfig";

// The maximum amount of time we allow sending to take place. If we pass this time limit, we throw an error, and
// move on to the next item in the queue.
const MS_MAX_ATTEMPT = 150 * 1000;

// The maximum amount of time we allow to pass before the loading indicator becomes visible.
const MS_MAX_SILENT_LOADING = 4000;

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
   * The total time that all the requests took (including the time spent waiting before retries).
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
   * The last response that was received during a send attempt. This may be a failure response.
   */
  lastResponse?: Response;

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
  /**
   * The service manager to use to access services.
   */
  private serviceManager: ServiceManager;

  /**
   * The amount of time in milliseconds to wait before timing out a message.
   */
  public timeoutMS: number;

  /**
   * This queue will take any messages sent to the service and will process them in the order they were received,
   * starting with index 0.
   */
  private queue: {
    /**
     * All the messages that are waiting for an attempt to be sent. If a message is currently in the process of
     * being sent, it will not appear in this list.
     */
    waiting: PendingMessageRequest[];

    /**
     * The message that is currently in the process of being sent to the assistant.
     */
    current: PendingMessageRequest;
  };

  /**
   * Handles inbound streaming tracking and lifecycle.
   */
  public inboundStreaming: InboundStreamingCoordinator;

  /**
   * Handles outbound send lifecycle concerns (errors, cancellations).
   */
  private outboundCoordinator: OutboundMessageCoordinator;

  /**
   * Tracks the original message.id when processSuccess completes, so we can look up the controller
   * when chunks arrive with a different response_id.
   */
  private lastProcessedMessageID: string | null = null;

  /**
   * Maps message IDs to their AbortControllers. This persists even after messages are cleared from the queue,
   * allowing cancellation of streaming messages that have already "completed" from MessageService's perspective.
   */
  private messageAbortControllers = new Map<string, AbortController>();

  /**
   * The value indicates that there is a pending locale change that needs to be sent to the assistant on the next
   * message request.
   */
  public pendingLocale = false;

  /**
   * Indicates if the locale has been explicitly set by the host page. This is used to ensure we only send a locale
   * to the assistant when it has been explicitly set.
   */
  public localeIsExplicit = false;

  /**
   * The instance of the messageLoadingManager to manage timeouts and showing of loading states.
   */
  public messageLoadingManager: MessageLoadingManager;

  constructor(serviceManager: ServiceManager, publicConfig: PublicConfig) {
    this.serviceManager = serviceManager;
    this.messageLoadingManager = new MessageLoadingManager();
    this.inboundStreaming = new InboundStreamingCoordinator(
      this.messageAbortControllers,
      () => this.moveToNextQueueItem(),
    );
    this.outboundCoordinator = new OutboundMessageCoordinator(
      this.serviceManager,
      this.messageLoadingManager,
      (pendingRequest, errorState) =>
        this.setMessageErrorState(pendingRequest, errorState),
      () => this.queue.current,
      () => this.moveToNextQueueItem(),
      (pendingRequest, received) =>
        this.processSuccess(pendingRequest, received),
      () => this.serviceManager.store.getState().config.public.messaging || {},
    );
    this.queue = {
      waiting: [],
      current: null,
    };

    const timeoutOverride = publicConfig.messaging?.messageTimeoutSecs;
    this.timeoutMS =
      timeoutOverride || timeoutOverride === 0
        ? timeoutOverride * 1000
        : MS_MAX_ATTEMPT;
  }

  /**
   * Process a response from the assistant send path, return the messageResponse.
   *
   * @param current The current item in the send queue.
   * @param received A {@link MessageResponse}.
   */
  private async processSuccess(
    current: PendingMessageRequest,
    received?: MessageResponse,
  ) {
    const { isProcessed } = current;

    // If this message was already invalidated (cancel/timeout/error already resolved it), bail out.
    if (isProcessed) {
      return;
    }
    // Clear any error state that may be associated with the message.
    this.setMessageErrorState(current, MessageErrorState.NONE);

    // After updating the error state get the message from the pendingRequest since it has potentially been updated by
    // setting the error state.
    const { message } = current;

    // Do all the normal things for our general message requests, however for event messages we skip this.
    if (received) {
      if (message.input.message_type !== MessageInputType.EVENT) {
        received.history = received.history || {};
        received.history.timestamp = received.history.timestamp || Date.now();

        current.trackData.lastRequestTime =
          Date.now() - current.timeLastRequest;
        current.trackData.totalRequestTime =
          Date.now() - current.timeFirstRequest;

        // Send receive event.
        await this.serviceManager.actions.receive(
          received,
          Boolean(current.message.history.is_welcome_request),
          message,
        );
      }
      this.messageLoadingManager.end();
    }

    if (current.isProcessed) {
      // If the response has already been processed (perhaps the message was cancelled) then stop processing.
      return;
    }

    // If the received message is part one of a two-step response then we need to respond a little differently. We
    // need to disable user input, then send another request to the assistant to get the second part. When that
    // message is completed, we can "resume" the original message. We will not resolve the promise for the original
    // message until the entire process is completed.
    let rejected;

    // Resolve the promise that lets the original caller who sent the message know that the message has been sent
    // successfully.
    if (!rejected) {
      current.sendMessagePromise.doResolve();
      current.isProcessed = true;
    }

    // Track the message ID so we can link it to the response_id when chunks arrive
    this.lastProcessedMessageID = current.message.id;

    // For streaming messages, don't clear the queue yet - wait for FinalResponseChunk to arrive
    // For non-streaming messages (addMessage), clear immediately
    if (!current.isStreaming) {
      // Hide stop streaming button if it was shown for showStopButtonImmediately
      resetStopStreamingButton(this.serviceManager.store);
      this.moveToNextQueueItem();
    }
  }

  /**
   * Sends the message via customSendMessage.
   *
   * @param current The current item in the send queue.
   */
  private async sendToAssistant(
    current: PendingMessageRequest,
    startLoading: (() => void) | null,
  ) {
    const state = this.serviceManager.store.getState();
    const { customSendMessage } = state.config.public.messaging;
    await this.outboundCoordinator.send(
      current,
      customSendMessage,
      startLoading,
    );
  }

  /**
   * If there are items in the send queue, will grab the zero index item and send it to the assistant back-end via
   * this.sendToAssistant.
   */
  private async runQueueIfReady() {
    if (this.queue.current || this.queue.waiting.length === 0) {
      return;
    }

    this.clearCurrentQueueItem();
    this.queue.current = this.queue.waiting.shift();
    const { current } = this.queue;
    const { message } = current;
    current.timeFirstRequest = Date.now();

    if (message.input.message_type === MessageInputType.EVENT) {
      this.sendToAssistant(current, null);
      return;
    }

    const { startLoading, originalUserText } =
      this.prepareCurrentRequest(current);

    if (current.isProcessed) {
      // This message was cancelled.
      return;
    }

    await this.firePreSendEvent(current);

    if (current.isProcessed) {
      // This message was cancelled.
      return;
    }

    this.commitOutgoingMessage(current, originalUserText);

    await this.fireSendEvent(current);

    this.sendToAssistant(current, startLoading);
  }

  private prepareCurrentRequest(current: PendingMessageRequest) {
    const { store } = this.serviceManager;
    const state = store.getState();
    const { public: publicConfig } = state.config;
    const { message } = current;

    const lastResponse = getLastAssistantResponseWithContext(state);
    if (lastResponse) {
      message.thread_id = THREAD_ID_MAIN;
    }

    const loadingIndicatorTimeout =
      !publicConfig.messaging?.messageLoadingIndicatorTimeoutSecs &&
      publicConfig.messaging?.messageLoadingIndicatorTimeoutSecs !== 0
        ? MS_MAX_SILENT_LOADING
        : publicConfig.messaging.messageLoadingIndicatorTimeoutSecs * 1000;

    const startLoading = this.buildStartLoading(
      message,
      loadingIndicatorTimeout,
    );
    const originalUserText = message.history?.label || message.input.text;

    return { startLoading, originalUserText };
  }

  private async firePreSendEvent(current: PendingMessageRequest) {
    const { message, source } = current;
    await this.serviceManager.eventBus.fire(
      {
        type: BusEventType.PRE_SEND,
        data: message,
        source,
      },
      this.serviceManager.instance,
    );
  }

  private commitOutgoingMessage(
    current: PendingMessageRequest,
    originalUserText: string,
  ) {
    const { message } = current;
    const localMessage = inputItemToLocalItem(
      message,
      originalUserText,
      current.localMessageID,
    );

    // If history.silent is set to true, we don't add the message to the redux store as we do not want to show it, so
    // we don't need to update it here either.
    if (!message.history.silent) {
      this.serviceManager.store.dispatch(
        actions.updateLocalMessageItem(localMessage),
      );
      this.serviceManager.store.dispatch(actions.updateMessage(message));
    }
    deepFreeze(message);
  }

  private async fireSendEvent(current: PendingMessageRequest) {
    const { message, source } = current;
    await this.serviceManager.eventBus.fire(
      { type: BusEventType.SEND, data: message, source },
      this.serviceManager.instance,
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
    requestOptions: SendOptions = {},
  ) {
    // Create AbortController immediately so it can be aborted even if message is still waiting
    const controller = new AbortController();

    // Store controller in map so it persists even after message is cleared from queue
    this.messageAbortControllers.set(message.id, controller);

    const newPendingMessage: PendingMessageRequest = {
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

    this.queue.waiting.push(newPendingMessage);
  }

  /**
   * Performs any finishes steps necessary to complete the current queue item.
   */
  private clearCurrentQueueItem() {
    if (this.queue.current) {
      this.queue.current = null;
    }
  }

  /**
   * Builds a function that starts the loading manager and timeout handling for a message.
   */
  private buildStartLoading(
    message: MessageRequest<any>,
    loadingIndicatorTimeoutMS?: number,
  ): (() => void) | null {
    const loadingTimeout = loadingIndicatorTimeoutMS || 0;
    if (!loadingTimeout && !this.timeoutMS) {
      return null;
    }

    return () =>
      this.messageLoadingManager.start(
        () => {
          this.serviceManager.store.dispatch(actions.addIsLoadingCounter(1));
        },
        (didExceedMaxLoading: boolean) => {
          if (didExceedMaxLoading) {
            this.serviceManager.store.dispatch(actions.addIsLoadingCounter(-1));
          }
        },
        () => {
          this.cancelMessageRequestByID(
            message.id,
            true,
            CancellationReason.TIMEOUT,
          );
        },
        loadingTimeout,
        this.timeoutMS,
      );
  }

  /**
   * Move to next step in queue.
   */
  private moveToNextQueueItem() {
    this.clearCurrentQueueItem();
    this.runQueueIfReady();
  }

  /**
   * Changes the error state for the message with the given id and makes an a11y announcement if appropriate.
   */
  private setMessageErrorState(
    pendingRequest: PendingMessageRequest,
    errorState: MessageErrorState,
  ) {
    const { message } = pendingRequest;
    // Find the current state for the message. Note that we want to look up the current state from the store which
    // might be different from the message object we originally sent.
    const { allMessagesByID } = this.serviceManager.store.getState();

    // Update the error state if it's changed (but don't try to change an undefined state to NONE).
    const messageToUpdate = allMessagesByID[message.id];
    if (messageToUpdate) {
      const currentState = messageToUpdate.history?.error_state;
      const errorSame =
        currentState === errorState ||
        (errorState === MessageErrorState.NONE && !currentState);
      if (!errorSame) {
        // Figure out what announcement we need to make. Note that we don't announce changes in to the WAITING state.
        let announceMessageID: keyof LanguagePack;
        // eslint-disable-next-line default-case
        switch (errorState) {
          case MessageErrorState.FAILED: {
            announceMessageID = "errors_ariaMessageFailed";
            break;
          }
        }

        // Announce the change if necessary.
        if (announceMessageID) {
          this.serviceManager.store.dispatch(
            actions.announceMessage({ messageID: announceMessageID }),
          );
        }

        this.serviceManager.store.dispatch(
          actions.setMessageErrorState(message.id, errorState),
        );

        // After updating store get the updated message back from store and use it within the messageService. If we
        // don't get the updated message back within the message service we could try to save an updated version of this
        // message in store in the future but the copy within this service will be out of date.
        const { allMessagesByID } = this.serviceManager.store.getState();
        pendingRequest.message = allMessagesByID[
          message.id
        ] as MessageRequest<any>;
      }
    }
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
    requestOptions?: SendOptions,
  ): Promise<MessageResponse | any> {
    message.history.timestamp = message.history.timestamp || Date.now();

    // The messageService does different things based off the message type so lets make sure one exists.
    message.input = message.input || {};
    message.input.message_type =
      message.input.message_type || MessageInputType.TEXT;

    // Create a Promise that the caller can wait on that we'll resolve if/when the message is finally successfully sent
    // to the assistant. This gets resolved or rejected in this.processSuccess or this.processError respectively.
    const sendMessagePromise = resolvablePromise<void>();

    // Add our new message to the queue and kick off the queue.
    this.addToMessageQueue(
      message,
      source,
      localMessageID,
      sendMessagePromise,
      requestOptions,
    );
    this.runQueueIfReady();

    // Return the promise that is either successfully resolve or rejected in this.processSuccess or this.processError.
    return sendMessagePromise;
  }

  /**
   * Cancels all message requests including any that are running now and any that are waiting in the queue.
   */
  public async cancelAllMessageRequests(
    reason: string = CancellationReason.CONVERSATION_RESTARTED,
  ) {
    while (this.queue.waiting.length) {
      await this.cancelMessageRequestByID(
        this.queue.waiting[0].message.id,
        false,
        reason,
      );
    }
    if (this.queue.current) {
      await this.cancelMessageRequestByID(
        this.queue.current.message.id,
        false,
        reason,
      );
      this.clearCurrentQueueItem();
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
      this.queue.current,
      messageID,
      itemID,
      this.lastProcessedMessageID,
    );
  }

  /**
   * Called when a FinalResponseChunk is processed to clear the streaming message from the queue.
   */
  public finalizeStreamingMessage(messageID: string) {
    this.inboundStreaming.finalizeStreamingMessage(messageID);
  }

  /**
   * Cancels the current message request if one is in progress.
   * Also handles streaming messages that may have been cleared from the queue.
   */
  public async cancelCurrentMessageRequest(
    reason: string = CancellationReason.STOP_STREAMING,
  ) {
    // If there's a streaming message, cancel it even if not in queue
    if (this.inboundStreaming.streamingMessageID) {
      await this.cancelMessageRequestByID(
        this.inboundStreaming.streamingMessageID,
        false,
        reason,
      );
      return;
    }

    if (this.queue.current) {
      await this.cancelMessageRequestByID(
        this.queue.current.message.id,
        false,
        reason,
      );
      this.clearCurrentQueueItem();
    }
  }

  private findPendingRequestForCancellation(
    responseId: string,
    streamingEntry?: { requestId?: string },
  ) {
    if (
      this.queue.current?.message.id === responseId ||
      (streamingEntry &&
        this.queue.current?.message.id === streamingEntry.requestId)
    ) {
      return this.queue.current;
    }

    if (
      this.queue.current?.isStreaming &&
      this.inboundStreaming.streamingMessageID
    ) {
      // The streaming response_id can differ from the original message.id
      // so treat the current streaming request as a match for cancellation.
      return this.queue.current;
    }

    const index = this.queue.waiting.findIndex(
      (item) => item.message.id === responseId,
    );
    if (index !== -1) {
      const [pendingRequest] = this.queue.waiting.splice(index, 1);
      return pendingRequest;
    }
    return undefined;
  }

  private findAbortControllerForCancellation(
    responseId: string,
    streamingEntry: { requestId?: string; controller?: AbortController } | null,
    pendingRequest?: PendingMessageRequest,
  ) {
    return (
      this.messageAbortControllers.get(responseId) ||
      (streamingEntry?.requestId
        ? this.messageAbortControllers.get(streamingEntry.requestId)
        : undefined) ||
      (pendingRequest
        ? this.messageAbortControllers.get(pendingRequest.message.id)
        : undefined) ||
      streamingEntry?.controller
    );
  }

  private async handleCancellationResolution(
    responseId: string,
    pendingRequest: PendingMessageRequest | undefined,
    controller: AbortController | undefined,
    logError: boolean,
    reason: string,
  ) {
    if (!pendingRequest && !controller) {
      return;
    }

    const { lastResponse } = pendingRequest || {};
    const sendMessageController =
      controller || pendingRequest?.sendMessageController;

    // If someone is using customMessageSend, we let them know they should abort the request.
    sendMessageController?.abort(reason);

    // Clean up the controller from the map and streaming tracking
    this.inboundStreaming.clearStreamingResponse(responseId);

    // Only process the pending request if it exists (it may have already been cleared from queue)
    if (pendingRequest) {
      if (reason === CancellationReason.TIMEOUT) {
        this.outboundCoordinator.rejectFinalErrorOnMessage(
          pendingRequest,
          reason,
        );
        if (logError) {
          this.serviceManager.actions.errorOccurred({
            errorType: OnErrorType.MESSAGE_COMMUNICATION,
            message: reason,
            otherData: await safeFetchTextWithTimeout(lastResponse),
          });
        }
      } else if (pendingRequest.isStreaming) {
        // If we're cancelling during streaming, the ResponseStopped component will handle
        // displaying the "Response stopped" message via the stream_stopped metadata flag.
        // We don't need to create a system message here.
        // Mark as processed and advance the queue
        pendingRequest.sendMessagePromise.doResolve();
        pendingRequest.isProcessed = true;
        if (pendingRequest === this.queue.current) {
          this.moveToNextQueueItem();
        }
      } else {
        // Only create "Request cancelled" system message if we haven't started streaming yet
        this.outboundCoordinator.resolveCancelledMessage(pendingRequest);
      }
    }
  }

  /**
   * Cancel a message given an ID. Can be a message in process or one that is waiting to be processed.
   */
  public async cancelMessageRequestByID(
    messageID: string,
    logError: boolean,
    reason = "Message was cancelled",
  ) {
    // messageID may be an item_id or response_id; resolve to whichever streaming id we tracked.
    const responseId = this.inboundStreaming.resolveResponseId(messageID);
    const streamingEntry = this.inboundStreaming.getStreamingMeta(responseId);
    const wasStreamingCurrent =
      this.inboundStreaming.streamingMessageID === responseId;

    const pendingRequest = this.findPendingRequestForCancellation(
      responseId,
      streamingEntry,
    );
    const controller = this.findAbortControllerForCancellation(
      responseId,
      streamingEntry,
      pendingRequest,
    );

    await this.handleCancellationResolution(
      responseId,
      pendingRequest,
      controller,
      logError,
      reason,
    );

    if (!pendingRequest && wasStreamingCurrent) {
      this.moveToNextQueueItem();
    }
  }
}

export default MessageService;

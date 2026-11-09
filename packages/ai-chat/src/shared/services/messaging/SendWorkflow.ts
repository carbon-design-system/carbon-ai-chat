/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ResolvablePromise,
  resolvablePromise,
} from '../../utils/resolvablePromise';
import type { SendOptions } from '../../../types/instance/ChatInstance';
import type { MessageSendSource } from '../../../types/events/eventBusTypes';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import actions from '../../store/actions';
import { deepFreeze } from '../../utils/lang/objectUtils';
import {
  getLastAssistantResponseWithContext,
  THREAD_ID_MAIN,
} from '../../utils/messageUtils';
import { OutgoingMessageService } from './outbound/OutgoingMessageService';
import { OutboundMessageCoordinator } from './OutboundMessageCoordinator';
import type { ServiceManager } from '../ServiceManager';
import type { PendingMessageRequest } from './pendingRequestTypes';
import {
  MessageInputType,
  MessageResponseTypes,
  type MessageRequest,
  type MessageResponse,
} from '../../../types/messaging/Messages';
import { BusEventType } from '../../../types/events/eventBusTypes';
import type { LanguagePack } from '../../../types/config/LanguagePack';
import { MessageErrorState } from '../../../types/messaging/LocalMessageItem';
import { CancellationReason } from '../../../types/config/MessagingConfig';

const MS_MAX_SILENT_LOADING = 4000;

class SendWorkflow {
  private outgoing = new OutgoingMessageService();
  private outboundCoordinator: OutboundMessageCoordinator;

  constructor(private serviceManager: ServiceManager) {
    this.outboundCoordinator = new OutboundMessageCoordinator(
      serviceManager,
      this.messageLoadingManager,
      (request, state) => this.setMessageErrorState(request, state),
      () => serviceManager.messageCoordinator.getCurrentRequest(),
      () => serviceManager.messageCoordinator.advanceRequestQueue(),
      (request, received) => this.processSuccess(request, received),
      () => serviceManager.store.getState().config.public.messaging || {},
      (request) =>
        serviceManager.messageCoordinator.finishFailedStreamingResponse(
          request
        ),
      (id, generation) =>
        serviceManager.messageCoordinator.registerRequestGeneration(
          id,
          generation
        ),
      () =>
        serviceManager.messageCoordinator.hideStopStreamingButtonIfNoUpsertStreaming()
    );
  }

  private get messageLoadingManager() {
    return this.serviceManager.messageCoordinator.messageLoadingManager;
  }

  private get timeoutMS() {
    return this.serviceManager.messageCoordinator.timeoutMS;
  }

  rejectFinalErrorOnMessage(request: PendingMessageRequest, text?: string) {
    this.outboundCoordinator.rejectFinalErrorOnMessage(request, text);
  }

  resolveCancelledMessage(request: PendingMessageRequest) {
    this.outboundCoordinator.resolveCancelledMessage(request);
  }

  /**
   * Process a response from the assistant send path, return the messageResponse.
   *
   * @param current The current item in the send queue.
   * @param received A {@link MessageResponse}.
   */
  private async processSuccess(
    current: PendingMessageRequest,
    received?: MessageResponse
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
          message
        );
      }
      this.messageLoadingManager.end();
    }

    if (current.isProcessed) {
      // If the response has already been processed (perhaps the message was canceled) then stop processing.
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
    this.serviceManager.messageCoordinator.recordProcessedMessageID(
      current.message.id
    );

    // For streaming messages, don't clear the queue yet - wait for FinalResponseChunk to arrive
    // For non-streaming messages (addMessage), clear immediately
    if (!current.isStreaming) {
      // Hide stop streaming button if it was shown for showStopButtonImmediately, unless
      // some other message is still streaming.
      this.serviceManager.messageCoordinator.hideStopStreamingButtonIfIdle();
      this.serviceManager.messageCoordinator.advanceRequestQueue();
    }
    this.serviceManager.messageCoordinator.requestFinished(
      current.message.id,
      current.generation
    );
  }

  /**
   * Sends the message via customSendMessage.
   *
   * @param current The current item in the send queue.
   */
  private async sendToAssistant(
    current: PendingMessageRequest,
    startLoading: (() => void) | null
  ) {
    const state = this.serviceManager.store.getState();
    const { customSendMessage } = state.config.public.messaging;
    await this.outboundCoordinator.send(
      current,
      customSendMessage,
      startLoading
    );
  }

  /**
   * If there are items in the send queue, will grab the zero index item and send it to the assistant back-end via
   * this.sendToAssistant.
   */
  async runQueueIfReady() {
    // A cancel during shutdown can advance the queue; nothing new may start.
    if (this.serviceManager.isShutdown) {
      return;
    }
    const current = this.serviceManager.messageCoordinator.takeNextRequest();
    if (!current) {
      return;
    }
    this.serviceManager.messageCoordinator.requestStarted(
      current.message.id,
      current.generation,
      current.message
    );
    const { message } = current;
    current.timeFirstRequest = Date.now();

    if (message.input.message_type === MessageInputType.EVENT) {
      this.sendToAssistant(current, null);
      return;
    }

    const { startLoading, originalUserText } =
      this.prepareCurrentRequest(current);

    if (current.isProcessed) {
      // This message was canceled.
      return;
    }

    await this.firePreSendEvent(current);

    if (current.isProcessed) {
      // This message was canceled.
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
      loadingIndicatorTimeout
    );
    const originalUserText = this.outgoing.originalText(message);

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
      this.serviceManager.instance
    );
  }

  private commitOutgoingMessage(
    current: PendingMessageRequest,
    originalUserText: string
  ) {
    const { message } = current;
    const { localMessage } = this.outgoing.prepareLocalItem(
      message,
      originalUserText,
      current.localMessageID === undefined ? uuid() : current.localMessageID,
      MessageResponseTypes.TEXT
    );

    // If history.silent is set to true, we don't add the message to the redux store as we do not want to show it, so
    // we don't need to update it here either.
    if (!message.history.silent) {
      this.serviceManager.store.dispatch(
        actions.updateLocalMessageItem(localMessage)
      );
      this.serviceManager.store.dispatch(actions.updateMessage(message));
    }
    deepFreeze(message);
  }

  private async fireSendEvent(current: PendingMessageRequest) {
    const { message, source } = current;
    await this.serviceManager.eventBus.fire(
      { type: BusEventType.SEND, data: message, source },
      this.serviceManager.instance
    );
  }

  /**
   * Builds a function that starts the loading manager and timeout handling for a message.
   */
  private buildStartLoading(
    message: MessageRequest<any>,
    loadingIndicatorTimeoutMS?: number
  ): (() => void) | null {
    const loadingTimeout = loadingIndicatorTimeoutMS || 0;
    if (!loadingTimeout && !this.timeoutMS) {
      return null;
    }

    return () =>
      this.messageLoadingManager.start(
        () => {
          this.serviceManager.messageCoordinator.changeMessageLoadingCounter(1);
        },
        (didExceedMaxLoading: boolean) => {
          if (didExceedMaxLoading) {
            this.serviceManager.messageCoordinator.changeMessageLoadingCounter(
              -1
            );
          }
        },
        () => {
          this.serviceManager.messageCoordinator.cancelMessageRequestByID(
            message.id,
            true,
            CancellationReason.TIMEOUT
          );
        },
        loadingTimeout,
        this.timeoutMS
      );
  }

  /**
   * Changes the error state for the message with the given id and makes an a11y announcement if appropriate.
   */
  private setMessageErrorState(
    pendingRequest: PendingMessageRequest,
    errorState: MessageErrorState
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

        switch (errorState) {
          case MessageErrorState.FAILED: {
            announceMessageID = 'errors_ariaMessageFailed';
            break;
          }
        }

        // Announce the change if necessary.
        if (announceMessageID) {
          this.serviceManager.messageCoordinator.announceSendFailure();
        }

        this.serviceManager.store.dispatch(
          actions.setMessageErrorState(message.id, errorState)
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
    this.serviceManager.messageCoordinator.registerMessageController(
      message.id,
      controller
    );

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
   * Send a message to the backend. Returns "any" in the error case.
   *
   * @param message Takes a {@link MessageRequest} object.
   * @param source The source of the message.
   * @param localMessageID The ID of the {@link LocalMessageItem} created from the current request.
   * @param requestOptions The options that were included when the request was sent.
   */
  public enqueueMessage(
    message: MessageRequest<any>,
    source: MessageSendSource,
    localMessageID?: string,
    requestOptions?: SendOptions
  ): Promise<MessageResponse | any> {
    // A chat that shut down sends nothing.
    if (this.serviceManager.isShutdown) {
      return Promise.resolve();
    }
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
}

export { SendWorkflow };

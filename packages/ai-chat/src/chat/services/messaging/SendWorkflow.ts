/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from '../../store/actions';
import { OutboundMessageCoordinator } from './OutboundMessageCoordinator';
import type { ServiceManager } from '../ServiceManager';
import type { PendingMessageRequest } from './MessageService';
import {
  MessageInputType,
  type MessageRequest,
  type MessageResponse,
} from '../../../types/messaging/Messages';
import type { LanguagePack } from '../../../types/config/LanguagePack';
import { MessageErrorState } from '../../../types/messaging/LocalMessageItem';

class SendWorkflow {
  private outboundCoordinator: OutboundMessageCoordinator;

  constructor(private serviceManager: ServiceManager) {
    this.outboundCoordinator = new OutboundMessageCoordinator(
      serviceManager,
      this.messageLoadingManager,
      (request, state) => this.setMessageErrorState(request, state),
      () => serviceManager.messageCoordinator.getCurrentRequest(),
      () => serviceManager.messageService.moveToNextQueueItem(),
      (request, received) => this.processSuccess(request, received),
      () => serviceManager.store.getState().config.public.messaging || {},
      (request) =>
        serviceManager.messageService.finishFailedStreamingResponse(request),
      (id, generation) =>
        serviceManager.messageService.registerRequestGeneration(id, generation),
      () =>
        serviceManager.messageService.hideStopStreamingButtonIfNoUpsertStreaming()
    );
  }

  private get messageLoadingManager() {
    return this.serviceManager.messageCoordinator.messageLoadingManager;
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
      this.serviceManager.messageService.hideStopStreamingButtonIfIdle();
      this.serviceManager.messageService.moveToNextQueueItem();
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
  async sendToAssistant(
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
          this.serviceManager.store.dispatch(
            actions.announceMessage({ messageID: announceMessageID })
          );
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
}

export { SendWorkflow };

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import { OutgoingMessageService } from './outbound/OutgoingMessageService';
import actions from '../../store/actions';
import { MessageLoadingManager } from '../../utils/messageServiceUtils';
import { MessageErrorState } from '../../../types/messaging/LocalMessageItem';
import {
  MessageInputType,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
} from '../../../types/messaging/Messages';
import { CustomSendMessageOptions } from '../../../types/config/MessagingConfig';
import { OnErrorType } from '../../../types/config/ErrorConfig';
import { PublicConfigMessaging } from '../../../types/config/PublicConfigMessaging';
import { ServiceManager } from '../ServiceManager';
import { PendingMessageRequest } from './pendingRequestTypes';
import { consoleError, debugLog } from '../../utils/miscUtils';
import {
  BusEventSend,
  BusEventType,
} from '../../../types/events/eventBusTypes';
import { ChatInstance } from '../../../types/instance/ChatInstance';
import { streamItemID, THREAD_ID_MAIN } from '../../utils/messageUtils';

type CustomSendMessageFn = (
  message: MessageRequest<any>,
  options: CustomSendMessageOptions,
  instance: ChatInstance
) => void | Promise<void>;

function getSendErrorText(error: unknown, processingError: boolean): string {
  if (processingError) {
    return error instanceof Error
      ? error.message
      : 'The chat could not process the message chunk.';
  }
  return (
    (error && (typeof error === 'string' ? error : JSON.stringify(error))) ||
    'There was an unidentified error.'
  );
}

/**
 * Handles outbound send lifecycle concerns: inline errors, error states, and queue advancement.
 * Retries are expected to be handled by customSendMessage upstream.
 */
class OutboundMessageCoordinator {
  private outgoing = new OutgoingMessageService();

  constructor(
    private serviceManager: ServiceManager,
    private messageLoadingManager: MessageLoadingManager,
    private setMessageErrorState: (
      pendingRequest: PendingMessageRequest,
      errorState: MessageErrorState
    ) => void,
    private getCurrent: () => PendingMessageRequest | null,
    private moveToNextQueueItem: () => void,
    private processSuccess: (
      current: PendingMessageRequest,
      received?: MessageResponse
    ) => Promise<void>,
    private getMessagingConfig: () => PublicConfigMessaging,
    private finishStreamingResponse: (
      pendingRequest: PendingMessageRequest
    ) => void,
    private registerRequestGeneration: (
      requestID: string,
      restartGeneration: number
    ) => void,
    private hideStopStreamingButtonIfNoUpsertStreaming: () => void
  ) {}

  /**
   * Adds an inline error message to the list.
   */
  private addErrorMessage() {
    const { store } = this.serviceManager;
    const errorMessage = store.getState().languagePack.errors_singleMessage;
    const { originalMessage, localMessage } = this.outgoing.prepareInlineError(
      errorMessage,
      uuid(),
      Date.now(),
      uuid(),
      THREAD_ID_MAIN,
      MessageResponseTypes.INLINE_ERROR
    );
    store.dispatch(
      actions.addLocalMessageItem(localMessage, originalMessage, true)
    );
  }

  /**
   * Process a message returned from the assistant send path with an error. Custom senders handle retries upstream;
   * we mark this attempt as failed and advance the queue.
   */
  async processError(
    pendingRequest: PendingMessageRequest,
    resultText: string,
    reportSendError = true
  ) {
    const { timeFirstRequest, timeLastRequest, isProcessed, requestOptions } =
      pendingRequest;

    // If this message was already invalidated, don't do anything.
    if (isProcessed) {
      return;
    }

    pendingRequest.trackData.lastRequestTime = Date.now() - timeLastRequest;
    pendingRequest.trackData.totalRequestTime = Date.now() - timeFirstRequest;

    if (requestOptions.silent) {
      // If the message that was sent was silent, we have to throw an error manually since there isn't any user message to reference.
      this.addErrorMessage();
    }

    const { messageCoordinator } = this.serviceManager;
    const messageID = pendingRequest.message.id;
    const sendError = {
      errorType: OnErrorType.MESSAGE_COMMUNICATION,
      message: 'An error occurred sending a message',
      otherData: resultText,
      messageID,
    };
    // An error that was already reported, such as a failed chunk, stays the one state.error holds.
    messageCoordinator.fail(
      (!reportSendError && messageCoordinator.errorForRequest(messageID)) ||
        sendError,
      pendingRequest.generation
    );
    if (reportSendError) {
      this.serviceManager.actions.errorOccurred(sendError);
    }

    // A `customSendMessage` that throws mid-stream never sends a closing chunk, so settle
    // the items it had streamed — only if that stream belongs to this request, since a
    // host can still be streaming a response to an earlier one.
    const { inboundStreaming } = this.serviceManager.messageCoordinator;
    const { streamingMessageID } = inboundStreaming;
    const streamingMeta =
      streamingMessageID &&
      inboundStreaming.getStreamingMeta(streamingMessageID);
    if (
      streamingMeta &&
      streamingMeta.requestId === pendingRequest.message.id
    ) {
      this.serviceManager.store.dispatch(
        actions.endMessageStreaming(streamingMessageID)
      );
    }

    this.serviceManager.messageCoordinator.endIncomingStreamingForRequest(
      pendingRequest.message.id,
      pendingRequest.generation
    );

    // Hide stop streaming button if visible. This hid unconditionally before
    // `upsertMessage` existed, so it still ignores chunk streams; only a running upsert
    // stream keeps the button up.
    this.hideStopStreamingButtonIfNoUpsertStreaming();

    this.rejectFinalErrorOnMessage(pendingRequest, resultText);
  }

  /**
   * Marks a message as failed. `markFailed: false` rejects and settles the request without
   * marking it, for a turn whose responses show the failure instead.
   */
  rejectFinalErrorOnMessage(
    pendingRequest: PendingMessageRequest,
    resultText = 'An undefined error occurred trying to send your message.',
    markFailed = true
  ) {
    const { sendMessagePromise } = pendingRequest;

    // At this point we've failed; mark the message accordingly.
    if (markFailed) {
      this.setMessageErrorState(pendingRequest, MessageErrorState.FAILED);
    }

    // After updating the error state get the message from the pendingRequest since it has potentially been updated by
    // setting the error state.
    const { message } = pendingRequest;

    // No need to call this if it's an event message or a welcome node request.
    if (
      pendingRequest === this.getCurrent() &&
      message.input.message_type !== MessageInputType.EVENT
    ) {
      this.messageLoadingManager.end();
    }

    // Reject the promise that lets the original caller who sent the message know that the message failed to be sent.
    this.finishStreamingResponse(pendingRequest);
    sendMessagePromise.doReject(new Error(resultText));
    pendingRequest.isProcessed = true;
    this.serviceManager.messageCoordinator.requestFinished(
      pendingRequest.message.id,
      pendingRequest.generation
    );

    if (pendingRequest === this.getCurrent()) {
      // Move on to next item in queue.
      this.moveToNextQueueItem();
    }
  }

  /**
   * Creates a system message to indicate cancellation.
   */
  createCancellationSystemMessage() {
    const { languagePack } = this.serviceManager.store.getState();

    const systemMessage = this.outgoing.prepareCancellation(
      languagePack.messages_requestCancelled,
      uuid(),
      Date.now(),
      THREAD_ID_MAIN,
      MessageResponseTypes.SYSTEM
    );
    const systemMessageItem = systemMessage.output.generic[0];
    this.serviceManager.store.dispatch(actions.addMessage(systemMessage));

    // Allocate the local ID after dispatch: store listeners can send reentrantly.
    const localMessageItem = this.outgoing.prepareResponseItem(
      systemMessageItem,
      systemMessage,
      streamItemID(systemMessage.id, systemMessageItem) || uuid()
    );
    this.serviceManager.store.dispatch(
      actions.addLocalMessageItem(localMessageItem, systemMessage, true)
    );
  }

  /**
   * Marks a cancelled message as completed without error and creates a system message.
   */
  resolveCancelledMessage(pendingRequest: PendingMessageRequest) {
    const { sendMessagePromise, message } = pendingRequest;

    this.setMessageErrorState(pendingRequest, MessageErrorState.NONE);

    // Create a system message to indicate the request was canceled
    this.createCancellationSystemMessage();

    if (
      pendingRequest === this.getCurrent() &&
      message.input.message_type !== MessageInputType.EVENT
    ) {
      this.messageLoadingManager.end();
    }

    // Hide stop streaming button if visible. This hid unconditionally before
    // `upsertMessage` existed, so it still ignores chunk streams; only a running upsert
    // stream keeps the button up.
    this.hideStopStreamingButtonIfNoUpsertStreaming();

    sendMessagePromise.doResolve();
    pendingRequest.isProcessed = true;
    this.serviceManager.messageCoordinator.requestFinished(
      pendingRequest.message.id,
      pendingRequest.generation
    );

    if (pendingRequest === this.getCurrent()) {
      this.moveToNextQueueItem();
    }
  }

  /**
   * Sends the message using the provided customSendMessage and handles success/error flow.
   */
  async send(
    current: PendingMessageRequest,
    customSendMessage: CustomSendMessageFn,
    startLoading: (() => void) | null
  ) {
    current.timeLastRequest = Date.now();

    if (current.isProcessed) {
      return;
    }

    const { messageCoordinator } = this.serviceManager;
    const {
      formattingErrors: chunkErrors,
      reportedErrors,
      finish,
    } = messageCoordinator.trackChunkRequestErrors(
      current.message.id,
      current.sendMessageController.signal
    );
    try {
      // We may update the timezone and locale on this message so we need to clone it and then update the store with
      // the new object.
      const message = this.outgoing.copyRequest(current.message);
      current.message = message;
      this.serviceManager.store.dispatch(actions.updateMessage(message));
      const customSendMessageRequest = this.outgoing.copyRequest(message);
      // AbortController was already created when message was added to queue
      debugLog('Called customSendMessage', message);
      const busEventSend: BusEventSend = {
        type: BusEventType.SEND,
        data: customSendMessageRequest,
        source: current.source,
      };
      startLoading?.();

      // Show stop button immediately if configured to do so (but not for EVENT messages)
      const messagingConfig = this.getMessagingConfig();
      if (
        messagingConfig.showStopButtonImmediately &&
        message.input.message_type !== MessageInputType.EVENT
      ) {
        const { store } = this.serviceManager;
        const stopStreamingState =
          store.getState().assistantInputState.stopStreamingButtonState;
        // Only show if not already visible
        if (!stopStreamingState.isVisible) {
          store.dispatch(actions.setStopStreamingButtonVisible(true));
        }
        // Apply disablement from any other in-flight non-cancellable stream.
        this.serviceManager.messageCoordinator.updateStreamingCancellation(
          message.id
        );
      }

      this.registerRequestGeneration(message.id, current.restartGeneration);
      await Promise.resolve(
        customSendMessage(
          customSendMessageRequest,
          {
            signal: current.sendMessageController.signal,
            silent: current.requestOptions.silent,
            busEventSend: busEventSend,
          },
          this.serviceManager.instance
        )
      );
      await this.processSuccess(current, null);
    } catch (error) {
      consoleError('An error occurred while sending a message', error);
      const processingError = chunkErrors.has(error);
      const resultText = getSendErrorText(error, processingError);
      this.processError(current, resultText, !reportedErrors.has(error));
    } finally {
      finish();
    }
  }
}

export { OutboundMessageCoordinator };

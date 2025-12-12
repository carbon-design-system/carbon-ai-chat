/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createLocalMessageForInlineError } from "../schema/outputItemToLocalItem";
import actions from "../store/actions";
import { MessageLoadingManager } from "../utils/messageServiceUtils";
import { MessageErrorState } from "../../types/messaging/LocalMessageItem";
import {
  MessageInputType,
  MessageRequest,
  MessageResponse,
} from "../../types/messaging/Messages";
import { CustomSendMessageOptions } from "../../types/config/MessagingConfig";
import { OnErrorType } from "../../types/config/PublicConfig";
import { ServiceManager } from "./ServiceManager";
import { PendingMessageRequest } from "./MessageService";
import cloneDeep from "lodash-es/cloneDeep.js";
import { consoleError, debugLog } from "../utils/miscUtils";
import { BusEventSend, BusEventType } from "../../types/events/eventBusTypes";
import { ChatInstance } from "../../types/instance/ChatInstance";

type CustomSendMessageFn = (
  message: MessageRequest<any>,
  options: CustomSendMessageOptions,
  instance: ChatInstance,
) => void | Promise<void>;

/**
 * Handles outbound send lifecycle concerns: inline errors, error states, and queue advancement.
 * Retries are expected to be handled by customSendMessage upstream.
 */
class OutboundMessageCoordinator {
  constructor(
    private serviceManager: ServiceManager,
    private messageLoadingManager: MessageLoadingManager,
    private setMessageErrorState: (
      pendingRequest: PendingMessageRequest,
      errorState: MessageErrorState,
    ) => void,
    private getCurrent: () => PendingMessageRequest | null,
    private moveToNextQueueItem: () => void,
    private processSuccess: (
      current: PendingMessageRequest,
      received?: MessageResponse,
    ) => Promise<void>,
  ) {}

  /**
   * Adds an inline error message to the list.
   */
  private addErrorMessage() {
    const { store } = this.serviceManager;
    const errorMessage =
      store.getState().config.derived.languagePack.errors_singleMessage;
    const { originalMessage, localMessage } =
      createLocalMessageForInlineError(errorMessage);
    store.dispatch(
      actions.addLocalMessageItem(localMessage, originalMessage, true),
    );
  }

  /**
   * Process a message returned from the assistant send path with an error. Custom senders handle retries upstream;
   * we mark this attempt as failed and advance the queue.
   */
  async processError(
    pendingRequest: PendingMessageRequest,
    resultText: string,
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

    this.serviceManager.actions.errorOccurred({
      errorType: OnErrorType.MESSAGE_COMMUNICATION,
      message: "An error occurred sending a message",
      otherData: resultText,
    });

    this.rejectFinalErrorOnMessage(pendingRequest, resultText);
  }

  /**
   * Marks a message as failed.
   */
  rejectFinalErrorOnMessage(
    pendingRequest: PendingMessageRequest,
    resultText = "An undefined error occurred trying to send your message.",
  ) {
    const { sendMessagePromise } = pendingRequest;

    // At this point we've failed; mark the message accordingly.
    this.setMessageErrorState(pendingRequest, MessageErrorState.FAILED);

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
    sendMessagePromise.doReject(new Error(resultText));
    pendingRequest.isProcessed = true;

    if (pendingRequest === this.getCurrent()) {
      // Move on to next item in queue.
      this.moveToNextQueueItem();
    }
  }

  /**
   * Marks a cancelled message as completed without error.
   */
  resolveCancelledMessage(pendingRequest: PendingMessageRequest) {
    const { sendMessagePromise } = pendingRequest;

    this.setMessageErrorState(pendingRequest, MessageErrorState.NONE);

    const { message } = pendingRequest;

    if (
      pendingRequest === this.getCurrent() &&
      message.input.message_type !== MessageInputType.EVENT
    ) {
      this.messageLoadingManager.end();
    }

    sendMessagePromise.doResolve();
    pendingRequest.isProcessed = true;

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
    startLoading: (() => void) | null,
  ) {
    current.timeLastRequest = Date.now();

    if (current.isProcessed) {
      return;
    }

    try {
      // We may update the timezone and locale on this message so we need to clone it and then update the store with
      // the new object.
      const message = cloneDeep(current.message);
      current.message = message;
      this.serviceManager.store.dispatch(actions.updateMessage(message));
      // AbortController was already created when message was added to queue
      debugLog("Called customSendMessage", message);
      const busEventSend: BusEventSend = {
        type: BusEventType.SEND,
        data: message,
        source: current.source,
      };
      startLoading?.();

      await Promise.resolve(
        customSendMessage(
          message,
          {
            signal: current.sendMessageController.signal,
            silent: current.requestOptions.silent,
            busEventSend: busEventSend,
          },
          this.serviceManager.instance,
        ),
      );
      await this.processSuccess(current, null);
    } catch (error) {
      consoleError("An error occurred while sending a message", error);
      const resultText =
        (error &&
          (typeof error === "string" ? error : JSON.stringify(error))) ||
        "There was an unidentified error.";
      this.processError(current, resultText);
    } finally {
      // Loading manager is ended via processSuccess/reject handlers.
    }
  }
}

export { OutboundMessageCoordinator };

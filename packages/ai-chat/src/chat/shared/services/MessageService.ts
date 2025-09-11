/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from "lodash-es/cloneDeep.js";

import inputItemToLocalItem from "../schema/inputItemToLocalItem";
import { createLocalMessageForInlineError } from "../schema/outputItemToLocalItem";
import actions from "../store/actions";
import { MessageErrorState } from "../../../types/messaging/LocalMessageItem";

import { deepFreeze } from "../utils/lang/objectUtils";
import { MessageLoadingManager } from "../utils/messageServiceUtils";
import {
  getLastBotResponseWithContext,
  THREAD_ID_MAIN,
} from "../utils/messageUtils";
import {
  consoleError,
  debugLog,
  safeFetchTextWithTimeout,
} from "../utils/miscUtils";
import {
  ResolvablePromise,
  resolvablePromise,
} from "../utils/resolvablePromise";
import { ServiceManager } from "./ServiceManager";
import {
  MessageInputType,
  MessageRequest,
  MessageResponse,
} from "../../../types/messaging/Messages";
import { SendOptions } from "../../../types/instance/ChatInstance";
import {
  BusEventType,
  MessageSendSource,
} from "../../../types/events/eventBusTypes";
import { OnErrorType, PublicConfig } from "../../../types/config/PublicConfig";
import { EnglishLanguagePack } from "../../../types/instance/apiTypes";

// Time in ms between retry attempts.
const MS_BETWEEN_RETRIES = [1000, 3000, 5000];

// The maximum amount of time we allow retries to take place. If we pass this time limit, we throw an error, stop
// retrying, and move on to the next item in the queue. 120 seconds is the longest Cerberus allows for, so we'll
// set this a little higher than that.
const MS_MAX_ATTEMPT = 150 * 1000;

// The maximum amount of time we allow to pass before the error indicator becomes visible.
const MS_MAX_SILENT_ERROR = 6000;

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
interface PendingMessageRequest extends SendMessageRequest {
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
   * Indicate the attempt count for this request. The first attempt will have a value of 0 and the first retry will
   * be 1.
   */
  tryCount: number;

  /**
   * Indicates if the response has been processed.
   */
  isProcessed: boolean;
}

// Types of different retry behaviors. SILENT will retry without letting the end user know we are retrying, VISIBLE will
// show the user that we are retrying.
enum RetryType {
  SILENT = 1,
  VISIBLE,
}

class MessageService {
  /**
   * The service manager to use to access services.
   */
  private serviceManager: ServiceManager;

  /**
   * The amount of time in milliseconds to wait before timing out a message.
   */
  private timeoutMS: number;

  /**
   * This queue will take any messages sent to the service and will process them in the order they were received,
   * starting with index 0.
   */
  private queue: {
    /**
     * All the messages that are waiting for an attempt to be sent. If a message is currently in the process of
     * being sent or waiting for a retry, it will not appear in this list.
     */
    waiting: PendingMessageRequest[];

    /**
     * The message that is currently in the process of being sent to the assistant. This value remains set if an attempt
     * fails and the system is waiting to retry the send again.
     */
    current: PendingMessageRequest;
  };

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
    this.queue = {
      waiting: [],
      current: null,
    };

    const timeoutOverride = publicConfig.messaging?.messageTimeoutSecs;
    this.timeoutMS = timeoutOverride ? timeoutOverride * 1000 : MS_MAX_ATTEMPT;
  }

  /**
   * Process a response from assistant with 200 response code, send and return the messageResponse.
   *
   * @param current The current item in the send queue.
   * @param received A {@link MessageResponse}.
   */
  private async processSuccess(
    current: PendingMessageRequest,
    received?: MessageResponse,
  ) {
    const { requestOptions, isProcessed } = current;

    // If this message was already invalidated, don't do anything.
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
          requestOptions,
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

    this.moveToNextQueueItem();
  }

  /**
   * Adds an inline error message to the list.
   */
  private addErrorMessage() {
    const { store } = this.serviceManager;
    const errorMessage = store.getState().languagePack.errors_singleMessage;
    const { originalMessage, localMessage } =
      createLocalMessageForInlineError(errorMessage);
    store.dispatch(
      actions.addLocalMessageItem(localMessage, originalMessage, true),
    );
  }

  /**
   * Send to the assistant API, IF we are inside the window to show an error, also update the error state on the
   * message.
   */
  private sendToAssistantAndUpdateErrorState(current: PendingMessageRequest) {
    // If this message was already invalidated, don't do anything.
    if (current.isProcessed) {
      return;
    }

    this.sendToAssistant(current);

    const now = Date.now();
    const msSinceStarted = now - current.timeFirstRequest;
    const isSilentErrorWindow = MS_MAX_SILENT_ERROR > msSinceStarted;
    const type = isSilentErrorWindow ? RetryType.SILENT : RetryType.VISIBLE;
    if (type === RetryType.VISIBLE) {
      // Once we've hit the visible retry state, we need to mark the message as retrying and we need to mark all
      // the other messages that are still waiting as waiting.
      this.setMessageErrorState(current, MessageErrorState.RETRYING);
      this.queue.waiting.forEach((waitingMessage) => {
        this.setMessageErrorState(waitingMessage, MessageErrorState.WAITING);
      });
    }
  }

  /**
   * Process a message returned from assistant with non-200 error code. This function will attempt to retry the request
   * up to the length of RETRY_BEHAVIOR. If more than we require more retires than that, we fail the message.
   *
   * @param pendingRequest The current item in the send queue.
   * @param resultText The raw result text or error message (if any) returned from the request.
   * @param allowRetry Indicates if a retry is permitted.
   */
  private async processError(
    pendingRequest: PendingMessageRequest,
    resultText: string,
    allowRetry: boolean,
  ) {
    const {
      timeFirstRequest,
      timeLastRequest,
      tryCount,
      isProcessed,
      trackData,
      requestOptions,
    } = pendingRequest;

    const now = Date.now();
    const msSinceStarted = now - timeFirstRequest;
    // We are still in the "allow attempts" window if we have not exceeded the total amount of time allowed and if
    // we have not exceeded the number of retries allowed.
    const isInAttemptWindow =
      this.timeoutMS > msSinceStarted && tryCount < MS_BETWEEN_RETRIES.length;

    // If this message was already invalidated, don't do anything.
    if (isProcessed) {
      return;
    }

    trackData.lastRequestTime = Date.now() - timeLastRequest;
    trackData.totalRequestTime = Date.now() - timeFirstRequest;
    if (isInAttemptWindow && allowRetry) {
      // This is the general/unknown error case. Pause before trying again.
      trackData.numErrors++;
      const retryDelay = MS_BETWEEN_RETRIES[pendingRequest.tryCount++];

      setTimeout(() => {
        this.sendToAssistantAndUpdateErrorState(pendingRequest);
      }, retryDelay);
    } else {
      if (requestOptions.silent) {
        // If we are in the middle of a two-step response or the message that was sent was silent, we have to throw an
        // error manually since there isn't any user message to reference.
        this.addErrorMessage();
      }

      this.serviceManager.actions.errorOccurred({
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: "An error occurred sending a message",
        otherData: resultText,
      });

      this.rejectFinalErrorOnMessage(pendingRequest, resultText);
    }
  }

  /**
   * If we are no longer going to retry sending a message, we call this function to mark the message as failed.
   */
  private rejectFinalErrorOnMessage(
    pendingRequest: PendingMessageRequest,
    resultText = "An undefined error occurred trying to send your message.",
  ) {
    const { sendMessagePromise } = pendingRequest;

    // At this point we've either failed too many times or we failed right away while trying to load the welcome node.
    this.setMessageErrorState(pendingRequest, MessageErrorState.FAILED);

    // After updating the error state get the message from the pendingRequest since it has potentially been updated by
    // setting the error state.
    const { message } = pendingRequest;

    // No need to call this if it's an event message or a welcome node request.
    if (
      pendingRequest === this.queue.current &&
      message.input.message_type !== MessageInputType.EVENT
    ) {
      this.messageLoadingManager.end();
    }

    // Reject the promise that lets the original caller who sent the message know that the message failed to be sent.
    sendMessagePromise.doReject(new Error(resultText));
    pendingRequest.isProcessed = true;

    if (pendingRequest === this.queue.current) {
      // Move on to next item in queue.
      this.moveToNextQueueItem();
    }
  }

  /**
   * Sends the message to the backend. Returns "any" in the error case.
   *
   * @param current The current item in the send queue.
   */
  private async sendToAssistant(current: PendingMessageRequest) {
    const { store } = this.serviceManager;
    const state = store.getState();
    const { customSendMessage } = state.config.public.messaging;

    current.timeLastRequest = Date.now();

    if (current.isProcessed) {
      return;
    }

    try {
      // We may update the timezone and locale on this message so we need to clone it and then update the store with
      // the new object.
      const message = cloneDeep(current.message);
      current.message = message;
      store.dispatch(actions.updateMessage(message));
      const controller = new AbortController();
      current.sendMessageController = controller;
      debugLog("Called customSendMessage", message);

      await customSendMessage(
        message,
        { signal: controller.signal, silent: current.requestOptions.silent },
        this.serviceManager.instance,
      );
      await this.processSuccess(current, null);
    } catch (error) {
      consoleError("An error occurred while sending a message", error);
      const resultText =
        (error &&
          (typeof error === "string" ? error : JSON.stringify(error))) ||
        "There was an unidentified error.";
      this.processError(current, resultText, !customSendMessage);
    }
  }

  /**
   * If there are items in the send queue, will grab the zero index item and send it to the assistant back-end via
   * this.sendToAssistant.
   */
  private async runQueueIfReady() {
    if (!this.queue.current && this.queue.waiting.length > 0) {
      const { eventBus, store } = this.serviceManager;
      this.clearCurrentQueueItem();
      this.queue.current = this.queue.waiting.shift();
      const { current } = this.queue;
      const { message, source } = current;
      const state = store.getState();
      const { config } = store.getState();
      const { public: publicConfig } = config;
      current.timeFirstRequest = Date.now();

      // Do all the normal things for our general messageRequests, however for event messages we skip this.
      if (message.input.message_type !== MessageInputType.EVENT) {
        const lastResponse = getLastBotResponseWithContext(state);
        if (lastResponse) {
          message.thread_id = THREAD_ID_MAIN;
        }

        const LOADING_INDICATOR_TIMER =
          !publicConfig.messaging?.messageLoadingIndicatorTimeoutSecs &&
          publicConfig.messaging?.messageLoadingIndicatorTimeoutSecs !== 0
            ? MS_MAX_SILENT_LOADING
            : publicConfig.messaging.messageLoadingIndicatorTimeoutSecs * 1000;
        this.messageLoadingManager.start(
          () => {
            this.serviceManager.store.dispatch(actions.addIsLoadingCounter(1));
          },
          (didExceedMaxLoading: boolean) => {
            if (didExceedMaxLoading) {
              this.serviceManager.store.dispatch(
                actions.addIsLoadingCounter(-1),
              );
            }
          },
          () => {
            this.cancelMessageRequestByID(message.id, true);
          },
          LOADING_INDICATOR_TIMER,
          this.timeoutMS,
        );

        if (current.isProcessed) {
          // This message was cancelled.
          return;
        }

        // Grab the original text before it can be modified by a pre:send handler.
        const originalUserText = message.history?.label || message.input.text;

        // Fire the pre:send event. User code is allowed to modify the message at this point. If this takes longer than MS_MAX_SILENT_LOADING
        // we show a loading state.
        await eventBus.fire(
          {
            type: BusEventType.PRE_SEND,
            data: message,
            source,
          },
          this.serviceManager.instance,
        );

        if (current.isProcessed) {
          // This message was cancelled.
          return;
        }

        // We now want to update the store with whatever edits have been made to the message.
        const localMessage = inputItemToLocalItem(
          message,
          originalUserText,
          current.localMessageID,
        );
        // If history.silent is set to true, we don't add the message to the redux store as we do not want to show it, so
        // we don't need to update it here either.
        if (!message.history.silent) {
          store.dispatch(actions.updateLocalMessageItem(localMessage));
          store.dispatch(actions.updateMessage(message));
        }
        deepFreeze(message);

        await eventBus.fire(
          { type: BusEventType.SEND, data: message, source },
          this.serviceManager.instance,
        );
      }
      this.sendToAssistant(current);
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
    requestOptions: SendOptions = {},
  ) {
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
      tryCount: 0,
      isProcessed: false,
      source,
    };

    this.queue.waiting.push(newPendingMessage);

    // If the current message has entered the retrying state, then we need to update the new message to put it into
    // the waiting state.
    if (this.queue.current) {
      if (message.history?.error_state === MessageErrorState.RETRYING) {
        this.setMessageErrorState(newPendingMessage, MessageErrorState.WAITING);
      }
    }
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
        let announceMessageID: keyof EnglishLanguagePack;
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
  public cancelAllMessageRequests() {
    while (this.queue.waiting.length) {
      this.cancelMessageRequestByID(this.queue.waiting[0].message.id, false);
    }
    if (this.queue.current) {
      this.cancelMessageRequestByID(this.queue.current.message.id, false);
      this.clearCurrentQueueItem();
    }
  }

  /**
   * Cancel a message given an ID. Can be a message in process or one that is waiting to be processed.
   */
  public async cancelMessageRequestByID(messageID: string, logError: boolean) {
    let pendingRequest: PendingMessageRequest;

    if (this.queue.current?.message.id === messageID) {
      pendingRequest = this.queue.current;
    } else {
      const index = this.queue.waiting.findIndex(
        (item) => item.message.id === messageID,
      );
      if (index !== -1) {
        pendingRequest = this.queue.waiting[index];
        this.queue.waiting.splice(index, 1);
      }
    }

    if (pendingRequest) {
      const { lastResponse, sendMessageController } = pendingRequest;
      // If someone is using customMessageSend, we let them know they should abort the request.
      sendMessageController?.abort("Message was cancelled");

      this.rejectFinalErrorOnMessage(pendingRequest, "Message was cancelled");
      if (logError) {
        this.serviceManager.actions.errorOccurred({
          errorType: OnErrorType.MESSAGE_COMMUNICATION,
          message: "Message was cancelled",
          otherData: await safeFetchTextWithTimeout(lastResponse),
        });
      }
    }
  }
}

export default MessageService;

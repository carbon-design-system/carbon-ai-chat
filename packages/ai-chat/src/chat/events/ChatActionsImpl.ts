/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from "lodash-es/cloneDeep.js";
import isEqual from "lodash-es/isEqual.js";
import merge from "lodash-es/merge.js";

import { LoadedHistory } from "../schema/historyToMessages";
import inputItemToLocalItem from "../schema/inputItemToLocalItem";
import {
  createLocalMessageItemsForNestedMessageItems,
  outputItemToLocalItem,
} from "../schema/outputItemToLocalItem";
import { HumanAgentsOnlineStatus } from "../services/haa/HumanAgentService";
import { ServiceManager } from "../services/ServiceManager";
import actions from "../store/actions";
import { agentUpdateIsSuspended } from "../store/humanAgentActions";
import {
  DEFAULT_PERSISTED_TO_BROWSER,
  VIEW_STATE_LAUNCHER_OPEN,
} from "../store/reducerUtils";
import {
  AppState,
  AppStateMessages,
  ViewState,
  ViewType,
} from "../../types/state/AppState";

import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";

import { HistoryItem, HistoryNote } from "../../types/messaging/History";

import { asyncForEach } from "../utils/lang/arrayUtils";
import { deepFreeze } from "../utils/lang/objectUtils";
import { sleep } from "../utils/lang/promiseUtils";
import { uuid, UUIDType } from "../utils/lang/uuid";
import {
  addDefaultsToMessage,
  createMessageRequestForText,
  createMessageResponseForText,
  createWelcomeRequest,
  hasServiceDesk,
  isConnectToHumanAgent,
  isPause,
  isResponse,
  isResponseWithNestedItems,
  isStreamCompleteItem,
  isStreamFinalResponse,
  isStreamPartialItem,
  isTyping,
  renderAsUserDefinedMessage,
  streamItemID,
} from "../utils/messageUtils";
import {
  callOnError,
  consoleError,
  consoleWarn,
  debugLog,
} from "../utils/miscUtils";
import {
  ResolvablePromise,
  resolvablePromise,
} from "../utils/resolvablePromise";
import { constructViewState } from "../utils/viewStateUtils";
import {
  CompleteItemChunk,
  GenericItem,
  Message,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  PartialItemChunk,
  PartialOrCompleteItemChunk,
  PauseItem,
  StreamChunk,
} from "../../types/messaging/Messages";
import { AddMessageOptions } from "../../types/config/MessagingConfig";
import {
  BusEventChunkUserDefinedResponse,
  BusEventPreReceive,
  BusEventType,
  BusEventUserDefinedResponse,
  BusEventViewChange,
  BusEventViewPreChange,
  MainWindowCloseReason,
  MainWindowOpenReason,
  MessageSendSource,
  ViewChangeReason,
} from "../../types/events/eventBusTypes";
import {
  PublicChatState,
  SendOptions,
} from "../../types/instance/ChatInstance";
import { OnErrorData, OnErrorType } from "../../types/config/PublicConfig";
import { NotificationMessage } from "../../types/instance/apiTypes";
import { DeepPartial } from "../../types/utilities/DeepPartial";

/**
 * This class is responsible for handling various "actions" that the system can perform including actions that can
 * be initiated by custom code running in the host page and is an implementation of the public interface to the widget.
 */
class ChatActionsImpl {
  /**
   * The service manager to use to access services.
   */
  private serviceManager: ServiceManager;

  /**
   * This Promise is used when hydrating the Carbon AI Chat. If this Promise is defined, then it means that a hydration
   * process has begun and any additional attempts to hydrate can wait for it to resolve.
   */
  private hydrationPromise: Promise<void>;

  /**
   * Indicates if we are currently hydrating (the Promise above is unresolved).
   */
  private hydrating = false;

  /**
   * Indicates if a restart is currently in progress.
   */
  private restarting = false;

  /**
   * Indicates if Carbon AI Chat has been hydrated at least once. This is used when a rehydration occurs so that we avoid
   * performing certain operations more than once.
   */
  private alreadyHydrated = false;

  /**
   * Queue of received chunks.
   */
  private chunkQueue: {
    chunk: StreamChunk;
    messageID?: string;
    options: AddMessageOptions;
    chunkPromise: ResolvablePromise<void>;
  }[] = [];

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Fetch welcome node and (if applicable) history store.
   *
   * @param alternateWelcomeRequest Indicates if a different message should be used as a message requesting the
   * welcome node. This message behaves a little differently from the welcome node in that it's assumed that this
   * message is actively needed. It will bypass the home screen if it is enabled and it was always append this
   * message to the end of any session history that is retrieved.
   * @param alternateWelcomeRequestSource The source of the alternate welcome message.
   * @param alternateOptions The send to send along with the alternate welcome request.
   */
  async hydrateChat(
    alternateWelcomeRequest?: MessageRequest,
    alternateWelcomeRequestSource?: MessageSendSource,
    alternateOptions?: SendOptions,
  ) {
    // Make sure we only fire this event once after the thread that actually does the hydration is finished.
    let fireReady = false;
    try {
      if (!this.hydrationPromise) {
        this.hydrating = true;
        this.hydrationPromise = this.doHydrateChat(
          alternateWelcomeRequest,
          alternateWelcomeRequestSource,
          alternateOptions,
        );
        fireReady = true;
      }

      await this.hydrationPromise;
    } finally {
      this.hydrating = false;
    }

    if (fireReady) {
      await this.serviceManager.fire({ type: BusEventType.CHAT_READY });
    }
  }

  /**
   * Fetch welcome node and (if applicable) history.
   *
   * @param alternateWelcomeRequest Indicates if a different message should be used as a message requesting the
   * welcome node. This message behaves a little differently from the welcome node in that it's assumed that this
   * message is actively needed. It will bypass the home screen if it is enabled and it was always append this
   * message to the end of any session history that is retrieved.
   * @param alternateWelcomeRequestSource The source of the alternate welcome message.
   * @param alternateOptions The options to send along with the alternate welcome request.
   */
  private async doHydrateChat(
    alternateWelcomeRequest?: MessageRequest,
    alternateWelcomeRequestSource?: MessageSendSource,
    alternateOptions?: SendOptions,
  ) {
    debugLog(
      "Hydrating Carbon AI Chat",
      alternateWelcomeRequest,
      alternateWelcomeRequestSource,
      alternateOptions,
    );

    // Load the history and main config but only if it's the first time we are hydrating.
    let history: LoadedHistory;
    const { serviceManager } = this;
    serviceManager.store.dispatch(actions.addIsHydratingCounter(1));
    if (!this.alreadyHydrated) {
      history = await this.serviceManager.historyService.loadHistory();

      if (serviceManager.humanAgentService) {
        // Once we've got the main config which contains the details for connecting to a service desk, we can
        // initialize the human agent service.
        debugLog("Initializing the human agent service");
        await serviceManager.humanAgentService.initialize();
      } else {
        debugLog("No service desk integrations present");
      }
    }

    const { config } = serviceManager.store.getState();

    if (!history) {
      if (!alternateWelcomeRequest) {
        const state = serviceManager.store.getState();
        if (state.config.public.homescreen?.isOn) {
          // If no history was loaded, there are no messages already sent, and there is a home screen,
          // then we need to show the home screen.
          serviceManager.store.dispatch(actions.setHomeScreenIsOpen(true));
        } else if (
          !config.public.messaging?.skipWelcome &&
          !this.shouldSkipWelcomeForAgentSession(state)
        ) {
          // If no history was loaded, there are no messages already sent, there is no home screen, and the user is not
          // currently or previously in an agent session, then we need to fetch the welcome node.
          await serviceManager.actions.send(
            createWelcomeRequest(),
            MessageSendSource.WELCOME_REQUEST,
            {},
            true,
          );
        }
      }
    } else {
      // Need to populate the history in redux (specifically botMessageState) before creating elements for custom
      // responses. createElementsForUserDefinedResponse() fires a userDefinedResponse event.
      serviceManager.store.dispatch(
        actions.hydrateMessageHistory(history.messageHistory),
      );
      await this.createElementsForUserDefinedResponses(history.messageHistory);

      // If the latest message is a panel response type, we should open it.
      if (history.latestPanelLocalMessageItem) {
        this.openResponsePanel(history.latestPanelLocalMessageItem, true);
      }
    }

    // After both history and welcome are loaded indicate we've got everything.
    serviceManager.store.dispatch(actions.chatWasHydrated());
    serviceManager.store.dispatch(actions.addIsHydratingCounter(-1));

    // Note, we're not waiting for the human agent service to handle the hydration. It may start an asynchronous
    // process to reconnect the user to an agent but that is considered separate from the main hydration.
    const allowReconnect = config.public.serviceDesk.allowReconnect ?? true;
    this.serviceManager?.humanAgentService?.handleHydration(
      allowReconnect,
      Boolean(history),
    );

    this.alreadyHydrated = true;
  }

  getPublicChatState(): PublicChatState {
    const state = this.serviceManager.store.getState();
    const { persistedToBrowserStorage } = state;

    const persistedSnapshot = deepFreeze(cloneDeep(persistedToBrowserStorage));

    const { humanAgentState, ...rest } = persistedSnapshot;

    const humanAgent = deepFreeze({
      ...humanAgentState,
      isConnecting: state.humanAgentState.isConnecting,
    });

    return deepFreeze({
      ...rest,
      humanAgent,
    }) as PublicChatState;
  }

  /**
   * Calls the send function but catches any errors and logs them to avoid us having any uncaught exceptions thrown
   * to the browser.
   */
  async sendWithCatch(
    message: MessageRequest | string,
    source: MessageSendSource,
    options: SendOptions = {},
    ignoreHydration = false,
  ) {
    try {
      await this.send(message, source, options, ignoreHydration);
    } catch (error) {
      consoleError("An error occurred sending the message", error);
    }
  }

  /**
   * Sends the given message to the assistant on the remote server. This will result in a "pre:send" and "send" event
   * being fired on the event bus. The returned promise will resolve once a response has received and processed and
   * both the "pre:receive" and "receive" events have fired. It will reject when too many errors have occurred and
   * the system gives up retrying.
   *
   * @param message The message to send.
   * @param source The source of the message.
   * @param options Options for the sent message.
   * @param [ignoreHydration=false]
   */
  async send(
    message: MessageRequest | string,
    source: MessageSendSource,
    options: SendOptions = {},
    ignoreHydration = false,
  ) {
    const messageRequest =
      typeof message === "string"
        ? createMessageRequestForText(message)
        : message;

    // If the home screen is open, we want to close it as soon as a message is sent. Note that this will also apply
    // if the Carbon AI Chat hasn't been opened yet.
    if (
      this.serviceManager.store.getState().persistedToBrowserStorage
        .homeScreenState.isHomeScreenOpen
    ) {
      this.serviceManager.store.dispatch(actions.setHomeScreenIsOpen(false));
    }

    // If the response panel is open, it should be closed on every message sent.
    if (this.serviceManager.store.getState().responsePanelState.isOpen) {
      this.serviceManager.store.dispatch(actions.setResponsePanelIsOpen(false));
    }

    if (this.hydrationPromise || ignoreHydration) {
      if (!ignoreHydration) {
        await this.hydrationPromise;
      }
      await this.doSend(messageRequest, source, options);
    } else {
      // If no hydration has started, then we need to start the hydration and use this message as the alternate for
      // the welcome node.
      this.serviceManager.store.dispatch(actions.setHomeScreenIsOpen(false));
      await this.hydrateChat(messageRequest, source, options);
      await this.doSend(messageRequest, source, options);
    }
  }

  /**
   * Sends the given message to the assistant on the remote server. This will result in a "pre:send" and "send" event
   * being fired on the event bus. The returned promise will resolve once a response has received and processed and
   * both the "pre:receive" and "receive" events have fired. It will reject when too many errors have occurred and
   * the system gives up retrying.
   *
   * @param message The message to send.
   * @param source The source of the message.
   * @param options Options for sending the message.
   */
  private async doSend(
    message: MessageRequest,
    source: MessageSendSource,
    options: SendOptions = {},
  ): Promise<void> {
    const { store } = this.serviceManager;

    addDefaultsToMessage(message);

    // Grab the original text before it can be modified by a pre:send handler.
    const originalUserText = message.history?.label || message.input.text;

    // If the options object instructs us to create a silent message, update the history object to respect the silent
    // setting. This means that the message will not show in the UI, but will be sent to the API.
    if (options.silent) {
      message.history.silent = true;
    }

    const localMessage = inputItemToLocalItem(message, originalUserText);

    // If history.silent is set to true, we don't add the message to the redux store as we do not want to show it.
    // Likewise, in schema/historyToMessages, if the message is coming from the history store, we do not add it to redux
    // either.
    if (!message.history.silent) {
      store.dispatch(actions.addLocalMessageItem(localMessage, message, true));
    } else {
      store.dispatch(actions.addMessage(message));
    }

    // This message is coming from an option/suggestion response type, and we need to let the previous message that
    // displayed the options which item should be marked in state as selected.
    if (options.setValueSelectedForMessageID) {
      store.dispatch(
        actions.messageSetOptionSelected(
          options.setValueSelectedForMessageID,
          message,
        ),
      );
    }

    // Now freeze the message so nobody can mess with it since that object came from outside. We'll then create a
    // clone of this message so that it may be modifiable by a pre:send listener when the message is ready to be
    // sent (which may happen later if other messages are in the queue). We'll have to replace our store object once
    // that happens.
    deepFreeze(message);

    await this.serviceManager.messageService.send(
      cloneDeep(message),
      source,
      localMessage.ui_state.id,
      options,
    );
  }

  /**
   * Instructs the widget to process the given message as an incoming message received from the assistant. This will
   * fire a "pre:receive" event immediately and a "receive" event after the event has been processed by the widget.
   * This method completes when all message items have been processed (including the time delay that may be introduced
   * by a pause).
   *
   * @param message A {@link MessageResponse} object.
   * @param isLatestWelcomeNode Indicates if this message is a new welcome message that has just been shown to the user
   * and isn't a historical welcome message.
   * @param requestMessage The optional {@link MessageRequest} that this response is a response to.
   * @param requestOptions The options that were included when the request was sent.
   */
  async receive(
    message: MessageResponse,
    isLatestWelcomeNode = false,
    requestMessage?: MessageRequest,
    requestOptions?: SendOptions,
  ) {
    const { restartCount: initialRestartCount } = this.serviceManager;

    // Received messages should be given an id if they don't have one.
    if (!message.id) {
      message.id = uuid(UUIDType.MESSAGE);
    }

    const preReceiveEvent: BusEventPreReceive = {
      type: BusEventType.PRE_RECEIVE,
      data: message,
    };
    // Fire the pre:receive event. User code is allowed to modify the message at this point.
    await this.serviceManager.fire(preReceiveEvent);

    if (initialRestartCount !== this.serviceManager.restartCount) {
      // If a restart occurred during the await above, we need to exit.
      return;
    }

    if (!isLatestWelcomeNode) {
      this.serviceManager.store.dispatch(
        actions.updateHasSentNonWelcomeMessage(true),
      );
    }

    if (initialRestartCount !== this.serviceManager.restartCount) {
      // If a restart occurred during the await above, we need to exit.
      return;
    }

    const { languagePack } =
      this.serviceManager.store.getState().config.derived;

    if (isResponse(message as any)) {
      // Even though processMessageResponse is an async function we do not await it in case a pause response type is
      // being processed. If we waited for the function to finished when a pause response type is being processed there
      // would be a pause before firing the receive event lower down, which would be incorrect since we have actually
      // received the event.
      this.processMessageResponse(
        message,
        isLatestWelcomeNode,
        requestMessage,
        requestOptions,
      ).catch((error) => {
        consoleError("Error processing the message response", error);
      });
    } else {
      const inlineError: MessageResponse = createMessageResponseForText(
        languagePack.errors_singleMessage,
        message?.thread_id,
        MessageResponseTypes.INLINE_ERROR,
      );
      this.receive(inlineError, false);
    }

    // Now freeze the message so nobody can mess with it since that object came from outside.
    deepFreeze(message);

    // Don't fire with the cloned message since we don't want to let anyone mess with it.
    await this.serviceManager.fire({
      type: BusEventType.RECEIVE,
      data: message,
    });
  }

  /**
   * Removes the messages with the given IDs from the chat view.
   */
  async removeMessages(messageIDs: string[]) {
    this.serviceManager.store.dispatch(actions.removeMessages(messageIDs));
  }

  /**
   * Inserts the given messages into the chat window as part of the chat history. This will fire the history:begin
   * and history:end events.
   */
  async insertHistory(messages: HistoryItem[]) {
    // Note: there is currently a gap here. If this is called with a partial list of messages that include
    // "update_history" event messages to add updates to messages not also in this list, then they will not update
    // correctly. I'm going to wait to see how this functionality shakes out and see if this is really going to end
    // up being necessary.

    // If we're inserting more history into a chat that already has messages, we want to preserve the relative
    // scroll position of the existing messages from the bottom.
    const scrollBottom =
      this.serviceManager.mainWindow?.getMessagesScrollBottom();

    const state = this.serviceManager.store.getState();

    // TODO: This doesn't work right if this is called more than once.
    const notes: { notes: HistoryNote[] } = {
      notes: [{ body: messages }],
    };
    const history = await this.serviceManager.historyService.loadHistory(notes);

    // If no history was loaded, there's nothing to do
    if (!history) {
      return;
    }

    // Merge the existing state on top of the new state (with the current state taking precedence over anything
    // that that's in the inserted state).
    const currentAppStateMessages: AppStateMessages = {
      allMessageItemsByID: state.allMessageItemsByID,
      allMessagesByID: state.allMessagesByID,
      assistantMessageState: state.assistantMessageState,
    };
    const newAppStateMessages: AppStateMessages = merge(
      {},
      history.messageHistory,
      currentAppStateMessages,
    );

    // Now make sure the message arrays are merged correctly.
    newAppStateMessages.assistantMessageState.messageIDs = [
      ...history.messageHistory.assistantMessageState.messageIDs,
      ...currentAppStateMessages.assistantMessageState.messageIDs,
    ];
    newAppStateMessages.assistantMessageState.localMessageIDs = [
      ...history.messageHistory.assistantMessageState.localMessageIDs,
      ...currentAppStateMessages.assistantMessageState.localMessageIDs,
    ];

    this.serviceManager.store.dispatch(
      actions.hydrateMessageHistory(newAppStateMessages),
    );
    await this.createElementsForUserDefinedResponses(history.messageHistory);

    // Restore the scroll position.
    this.serviceManager.mainWindow?.doAutoScroll({
      scrollToBottom: scrollBottom,
    });
  }

  /**
   * Receives a chunk from a stream.
   */
  async receiveChunk(
    chunk: StreamChunk,
    messageID?: string,
    options: AddMessageOptions = {},
  ) {
    const chunkPromise = resolvablePromise();
    this.chunkQueue.push({ chunk, messageID, options, chunkPromise });
    if (this.chunkQueue.length === 1) {
      this.processChunkQueue();
    }
    return chunkPromise;
  }

  async processChunkQueue() {
    const { chunk, options, chunkPromise } = this.chunkQueue[0];
    let { messageID } = this.chunkQueue[0];
    const { store } = this.serviceManager;
    try {
      const isCompleteItem = isStreamCompleteItem(chunk);
      const isPartialItem = isStreamPartialItem(chunk);
      const isStopGeneratingVisible =
        store.getState().assistantInputState.stopStreamingButtonState.isVisible;

      if (isPartialItem) {
        const streamingData = chunk.partial_item.streaming_metadata;
        if (streamingData?.cancellable && !isStopGeneratingVisible) {
          store.dispatch(actions.setStopStreamingButtonVisible(true));
        }
      }

      if (isCompleteItem || isPartialItem) {
        if (!messageID) {
          messageID = chunk.streaming_metadata?.response_id;
        }

        if (messageID && !store.getState().allMessagesByID[messageID]) {
          store.dispatch(actions.streamingStart(messageID));
        }

        const item =
          (chunk as PartialItemChunk).partial_item ||
          (chunk as CompleteItemChunk).complete_item;

        if (messageID && item) {
          store.dispatch(
            actions.streamingAddChunk(
              messageID,
              item,
              isCompleteItem,
              options.disableFadeAnimation ?? true,
            ),
          );
        }

        // Only merge message_options; ignore any other unexpected fields in partial_response
        if (chunk.partial_response?.message_options && messageID) {
          store.dispatch(
            actions.streamingMergeMessageOptions(
              messageID,
              chunk.partial_response.message_options,
            ),
          );
        }

        // Now make sure to handle any user_defined response items in the chunk.
        if (messageID && item) {
          await this.handleUserDefinedResponseItemsChunk(
            messageID,
            chunk,
            item,
          );
        }
      } else if (isStreamFinalResponse(chunk)) {
        // Note that while this function is called from the streaming handler in the MessageService, the final_response
        // path here is not taken. The MessageService uses the processSuccess path instead after the stream is
        // complete. This path is only taken by custom code calling the public receiveChunk method.
        this.receive(chunk.final_response, options.isLatestWelcomeNode, null, {
          disableFadeAnimation: true,
        });
      }

      // Reset stop streaming button when a complete/final chunk arrives
      if (
        (isCompleteItem || isStreamFinalResponse(chunk)) &&
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ) {
        store.dispatch(actions.setStopStreamingButtonDisabled(false));
        store.dispatch(actions.setStopStreamingButtonVisible(false));
      }

      this.chunkQueue.shift();
      chunkPromise.doResolve();
      if (this.chunkQueue[0]) {
        this.processChunkQueue();
      }
    } catch (error) {
      consoleError("Error processing stream chunk", error);
      // Ensure queue continues processing and promise is rejected for callers
      this.chunkQueue.shift();
      chunkPromise.doReject(error);
      if (this.chunkQueue[0]) {
        this.processChunkQueue();
      }
    }
  }

  /**
   * Creates the HTML element for a user defined response and adds it to the registry (if it does not already exist).
   */
  getOrCreateUserDefinedElement(messageItemID: string) {
    let userDefinedItem =
      this.serviceManager.userDefinedElementRegistry.get(messageItemID);
    if (!userDefinedItem) {
      userDefinedItem = {
        slotName: `slot-user-defined-${uuid()}`,
      };
      this.serviceManager.userDefinedElementRegistry.set(
        messageItemID,
        userDefinedItem,
      );
    }
    return userDefinedItem;
  }

  /**
   * If the given message should be rendered as a user defined message, this will create a host element for the message
   * and fire the {@link BusEventType.USER_DEFINED_RESPONSE} event so that the event listeners can attach whatever they
   * want to the host element.
   */
  async handleUserDefinedResponseItems(
    localMessage: LocalMessageItem,
    originalMessage: Message,
  ) {
    if (renderAsUserDefinedMessage(localMessage.item)) {
      let slotName: string;
      if (!localMessage.item.user_defined?.silent) {
        // If the message is silent, don't create a host element for it since it's not going to be rendered.
        ({ slotName } = this.getOrCreateUserDefinedElement(
          localMessage.ui_state.id,
        ));
      }

      const userDefinedResponseEvent: BusEventUserDefinedResponse = {
        type: BusEventType.USER_DEFINED_RESPONSE,
        data: {
          message: localMessage.item,
          fullMessage: originalMessage,
          slot: slotName,
        },
      };

      await this.serviceManager.fire(userDefinedResponseEvent);
    } else if (isResponseWithNestedItems(localMessage.item)) {
      const {
        itemsLocalMessageItemIDs,
        bodyLocalMessageItemIDs,
        footerLocalMessageItemIDs,
        gridLocalMessageItemIDs,
      } = localMessage.ui_state;
      const { allMessageItemsByID } = this.serviceManager.store.getState();

      /**
       * Will attempt to create an element for the custom response using the provided local message id.
       */
      const createElementForNestedUserDefinedResponse = (
        localMessageItemID: string,
      ) => {
        const nestedLocalMessage = allMessageItemsByID[localMessageItemID];
        return this.handleUserDefinedResponseItems(
          nestedLocalMessage,
          originalMessage,
        );
      };

      if (gridLocalMessageItemIDs?.length) {
        await asyncForEach(gridLocalMessageItemIDs, (row) =>
          asyncForEach(row, (cell) =>
            asyncForEach(cell, (itemID) =>
              createElementForNestedUserDefinedResponse(itemID),
            ),
          ),
        );
      }

      if (itemsLocalMessageItemIDs?.length) {
        await asyncForEach(
          itemsLocalMessageItemIDs,
          createElementForNestedUserDefinedResponse,
        );
      }

      if (bodyLocalMessageItemIDs?.length) {
        await asyncForEach(
          bodyLocalMessageItemIDs,
          createElementForNestedUserDefinedResponse,
        );
      }

      if (footerLocalMessageItemIDs?.length) {
        await asyncForEach(
          footerLocalMessageItemIDs,
          createElementForNestedUserDefinedResponse,
        );
      }
    }
  }

  /**
   * If the given message should be rendered as a user defined message, this will create a host element for the message
   * and fire the {@link BusEventType.CHUNK_USER_DEFINED_RESPONSE} event so that the event listeners can attach whatever
   * they want to the host element.
   *
   * Note, this function does not currently support nested items inside the chunk.
   */
  async handleUserDefinedResponseItemsChunk(
    messageID: string,
    chunk: PartialOrCompleteItemChunk,
    messageItem: DeepPartial<GenericItem>,
  ) {
    if (renderAsUserDefinedMessage(messageItem)) {
      const itemID = streamItemID(messageID, messageItem);

      let slotName: string;
      if (!messageItem.user_defined?.silent) {
        // If the message is silent, don't create a host element for it since it's not going to be rendered.
        ({ slotName } = this.getOrCreateUserDefinedElement(itemID));
      }

      const userDefinedResponseEvent: BusEventChunkUserDefinedResponse = {
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        data: {
          messageItem,
          chunk,
          slot: slotName,
        },
      };

      await this.serviceManager.fire(userDefinedResponseEvent);
    }
  }

  /**
   * Takes each item in the appropriate output array and dispatches correct actions. We may want to look into
   * turning this into a formal queue as the pause response_type may cause us to lose correct order in fast
   * conversations.
   *
   * @param fullMessage A {@link MessageResponse} object.
   * @param isLatestWelcomeNode If it is a new welcome node, we want to pass that data along.
   * @param requestMessage The optional {@link MessageRequest} that this response is a response to.
   * @param requestOptions The options that were included when the request was sent.
   */
  async processMessageResponse(
    fullMessage: MessageResponse,
    isLatestWelcomeNode: boolean,
    requestMessage: MessageRequest,
    requestOptions: SendOptions = {},
  ) {
    const { store } = this.serviceManager;
    const { config } = store.getState();
    const initialRestartCount = this.serviceManager.restartCount;

    const output = fullMessage.output.generic;
    fullMessage.request_id = requestMessage?.id;
    addDefaultsToMessage(fullMessage);

    store.dispatch(actions.addMessage(fullMessage));

    // The ID of the previous (visible) message item that was added to the store. When adding new items from the
    // response, this is used to ensure that each item is added in the right position.
    let previousItemID: string = null;

    // Need a regular for loop to allow for the await below.
    for (
      let index = 0;
      index < output.length &&
      initialRestartCount === this.serviceManager.restartCount;
      index++
    ) {
      const messageItem = output[index];

      if (messageItem) {
        const pause = isPause(messageItem);
        const agent = isConnectToHumanAgent(messageItem);

        const localMessageItem = outputItemToLocalItem(
          messageItem,
          fullMessage,
          isLatestWelcomeNode,
          requestOptions.disableFadeAnimation,
        );

        const nestedLocalMessageItems: LocalMessageItem[] = [];
        createLocalMessageItemsForNestedMessageItems(
          localMessageItem,
          fullMessage,
          false,
          nestedLocalMessageItems,
          true,
        );

        store.dispatch(actions.addNestedMessages(nestedLocalMessageItems));

        if (agent && isResponse(fullMessage)) {
          // For the "connect_to_agent" response, we need to determine the agents' availability before we can
          // continue to process the message items. Let's increment the typing counter while we're waiting for a
          // result from areAnyAgentsOnline.
          store.dispatch(actions.addIsTypingCounter(1));

          // Create a partial message to record the current state of agent availability and any service desk errors.
          const partialMessage: DeepPartial<MessageResponse> = { history: {} };

          // Determine if the CTA card should display a service desk error.
          if (!hasServiceDesk(config)) {
            // Report this error.
            const message =
              'Web chat received a "connect_to_agent" message but there is no service desk configured. Check your chat configuration.';
            this.errorOccurred({
              errorType: OnErrorType.INTEGRATION_ERROR,
              message,
            });

            // Make sure this state is reflected in history.
            store.dispatch(
              actions.setMessageUIStateInternalProperty(
                localMessageItem.fullMessageID,
                "agent_no_service_desk",
                true,
              ),
            );
            partialMessage.ui_state_internal.agent_no_service_desk = true;
          }

          // eslint-disable-next-line no-await-in-loop
          const agentAvailability =
            await this.serviceManager.humanAgentService?.checkAreAnyHumanAgentsOnline(
              fullMessage,
            );

          // If a restart occurred while waiting for the agents online check, then skip the processing below.
          if (initialRestartCount === this.serviceManager.restartCount) {
            // Update the value in the redux store.
            store.dispatch(
              actions.setMessageUIStateInternalProperty(
                localMessageItem.fullMessageID,
                "agent_availability",
                agentAvailability,
              ),
            );

            partialMessage.ui_state_internal =
              partialMessage.ui_state_internal || {};

            // Send event to back-end to save the current agent availability state so session history can use it on reload.
            partialMessage.ui_state_internal.agent_availability =
              agentAvailability;

            let shouldAutoRequestHumanAgent = false;

            // If configured, then auto-connect right now.
            if (config.public.serviceDesk?.skipConnectHumanAgentCard) {
              shouldAutoRequestHumanAgent = true;
            }

            // Decrement the typing counter to get rid of the pause.
            store.dispatch(actions.addIsTypingCounter(-1));

            if (
              shouldAutoRequestHumanAgent &&
              agentAvailability === HumanAgentsOnlineStatus.ONLINE
            ) {
              this.serviceManager.humanAgentService.startChat(
                localMessageItem,
                fullMessage,
              );
            }
          }
        }

        if (pause) {
          const showIsTyping = isTyping(messageItem);
          if (showIsTyping) {
            store.dispatch(actions.addIsTypingCounter(1));
          }

          // If this message is a pause, then just sleep for the pause duration before continuing. We don't actually
          // render anything for this message since it's really an instruction so we won't create a LocalMessage for
          // it and it won't be added to the redux store.
          // eslint-disable-next-line no-await-in-loop
          await sleep((messageItem as PauseItem).time);

          if (
            showIsTyping &&
            initialRestartCount === this.serviceManager.restartCount
          ) {
            store.dispatch(actions.addIsTypingCounter(-1));
          }
        } else {
          // In order to ensure that the addMessages get called in correct order, we need to add an `await` here to
          // pause further processing until this one is sent.
          // eslint-disable-next-line no-await-in-loop
          await this.handleUserDefinedResponseItems(
            localMessageItem,
            fullMessage,
          );
          if (
            !localMessageItem.item.user_defined?.silent &&
            initialRestartCount === this.serviceManager.restartCount
          ) {
            this.serviceManager.store.dispatch(
              actions.addLocalMessageItem(
                localMessageItem,
                fullMessage,
                false,
                previousItemID,
              ),
            );
            previousItemID = localMessageItem.ui_state.id;
          }
        }
      }
    }
  }

  /**
   * Opens the response panel using the provided local message item to render the content in the panel.
   */
  openResponsePanel(
    localMessageItem: LocalMessageItem,
    isMessageForInput: boolean,
  ) {
    this.serviceManager.store.dispatch(
      actions.setResponsePanelContent(localMessageItem, isMessageForInput),
    );
    this.serviceManager.store.dispatch(actions.setResponsePanelIsOpen(true));
  }

  /**
   * Inserts a locally created {@link MessageResponse} message into the message system.
   */
  public async insertLocalMessageResponse(message: MessageResponse) {
    message.id = uuid(UUIDType.MESSAGE);
    await this.processMessageResponse(message, false, null, {});
  }

  // updateLanguagePack removed; use top-level `strings` prop on components.

  /**
   * Adds a new notification to be shown in the UI.
   */
  addNotification(notification: NotificationMessage) {
    this.serviceManager.store.dispatch(actions.addNotification(notification));
  }

  /**
   * Removes a notification with the provided groupId.
   */
  removeNotification(groupID: string) {
    this.serviceManager.store.dispatch(
      actions.removeNotifications({ groupID }),
    );
  }

  /**
   * Removes all notifications.
   */
  removeAllNotifications() {
    this.serviceManager.store.dispatch(actions.removeAllNotifications());
  }

  /**
   * Construct the newViewState from the newView provided. Fire the view:pre:change and view:change events, as well as
   * window:pre:open, window:open, or window:pre:close, window:close if instructed to do so. If the view change isn't
   * canceled by the events then change the view. If the main window is open after changing the view, and
   * doNotHydrate isn't true and the chat is not already hydrated, then hydrate the chat.
   */
  async changeView(
    newView: ViewType | Partial<ViewState>,
    reason: {
      viewChangeReason?: ViewChangeReason;
      mainWindowOpenReason?: MainWindowOpenReason;
      mainWindowCloseReason?: MainWindowCloseReason;
    },
    tryHydrating = true,
    forceViewChange = false,
  ): Promise<ViewState> {
    const { store } = this.serviceManager;
    const { viewState } = store.getState().persistedToBrowserStorage;

    // Build the new viewState object.
    let newViewState = constructViewState(newView, store.getState());

    if (!isEqual(newViewState, viewState) || forceViewChange) {
      // If the newViewState is different from the current viewState, or the viewChange is being forced to happen, fire
      // the view:change events and change which views are visible.
      await this.fireViewChangeEventsAndChangeView(newViewState, reason);

      // Check and see if the chat should be hydrated.
      newViewState = store.getState().persistedToBrowserStorage.viewState;
      if (
        tryHydrating &&
        newViewState.mainWindow &&
        !store.getState().isHydrated
      ) {
        // If it's ok to hydrate, the main window is now visible, and the chat isn't hydrated, then hydrate
        // the chat. Since this function is only responsible for changing the view don't await hydrateChat(), instead
        // let hydrateChat complete on its own time.
        this.hydrateChat().catch((error) => {
          consoleError("Error hydrating the chat", error);
        });
      }
    }

    // Return the newViewState. This could be the same as the original viewState if there was no difference between the
    // original viewState and the proposed newViewState, or it could be an updated viewState. The updated viewState
    // could be what was originally sent to fireViewChangeEventsAndChangeView, or it could be a viewState that has been
    // modified by Deb during the view:pre:change event.
    return newViewState;
  }

  /**
   * Fire the "view:pre:change" and "view:change" events. This will return a boolean to indicate if the process was
   * cancelled and the view should remain unchanged. If the view change isn't canceled by the events then this will
   * switch to the newViewState that's been provided. This method is private to force the use of the changeView method
   * above as an entry point to this method.
   *
   * @returns True to indicate that the view was changed. False indicates the view change was cancelled.
   */
  private async fireViewChangeEventsAndChangeView(
    newViewState: ViewState,
    reason: {
      viewChangeReason?: ViewChangeReason;
      mainWindowOpenReason?: MainWindowOpenReason;
      mainWindowCloseReason?: MainWindowCloseReason;
    },
  ): Promise<void> {
    const { store } = this.serviceManager;

    if (store.getState().viewChanging) {
      // If the view is already in the middle of changing then throw an error.
      throw new Error(
        "The view may not be changed while a view change event is already running. Please make sure to resolve any promises from these events.",
      );
    }

    store.dispatch(actions.setViewChanging(true));

    const { viewState } = store.getState().persistedToBrowserStorage;
    // If we have a mainWindowOpenReason or mainWindowCloseReason then this viewChangeReason will be determined lower down.
    const { viewChangeReason } = reason;

    // Freeze the previous viewState since we don't want to allow Deb to modify it.
    const oldViewState = deepFreeze(viewState);

    try {
      // Create the view:pre:change event and fire it.
      const preViewChangeEvent: BusEventViewPreChange = {
        type: BusEventType.VIEW_PRE_CHANGE,
        reason: viewChangeReason,
        oldViewState,
        newViewState,
        cancelViewChange: false,
      };
      await this.serviceManager.fire(preViewChangeEvent);

      if (preViewChangeEvent.cancelViewChange) {
        // If the view changing was canceled in the event then log a message and don't change the view.
        debugLog("The view changing was cancelled by a view:pre:change event.");
        return;
      }

      // If there were no issues with the new view state then use it.
      newViewState = preViewChangeEvent.newViewState;

      // Actually change the viewState in store.
      store.dispatch(actions.setViewState(deepFreeze(newViewState)));

      // Create the view:change event and fire it.
      const viewChangeEvent: BusEventViewChange = {
        type: BusEventType.VIEW_CHANGE,
        reason: viewChangeReason,
        oldViewState,
        newViewState,
        cancelViewChange: false,
      };
      await this.serviceManager.fire(viewChangeEvent);

      if (viewChangeEvent.cancelViewChange) {
        // If the view changing was canceled in the event then log a message and switch the viewState back to what it was
        // originally.
        store.dispatch(actions.setViewState(oldViewState));
        debugLog("The view changing was cancelled by a view:change event.");
        return;
      }

      // If there were no issues with the new view state then use it.
      newViewState = viewChangeEvent.newViewState;

      // Actually change the viewState in store for the last time.
      store.dispatch(actions.setViewState(deepFreeze(newViewState)));
    } finally {
      store.dispatch(actions.setViewChanging(false));
    }
  }

  /**
   * Fires an error event to notify listeners that an error occurred.
   *
   * @param error Details about the error or the error object.
   */
  errorOccurred(error: OnErrorData) {
    consoleError("An error has occurred", error);

    if (error.catastrophicErrorType) {
      this.serviceManager.store.dispatch(
        actions.setAppStateValue(
          "catastrophicErrorType",
          error.catastrophicErrorType,
        ),
      );
    }
    callOnError(
      this.serviceManager.store.getState().config.public.onError,
      error,
    );
  }

  /**
   * Restarts the conversation with the assistant. This does not make any changes to a conversation with a human agent.
   * This will clear all the current assistant messages from the main assistant view and cancel any outstanding messages.
   * Lastly, this will clear the current assistant session which will force a new session to start on the next message.
   */
  async restartConversation(options: RestartConversationOptions = {}) {
    const {
      skipHydration = false,
      endHumanAgentConversation = true,
      fireEvents = true,
    } = options;

    debugLog("Restarting conversation");

    if (this.restarting) {
      consoleWarn(
        "You cannot restart a conversation while a previous restart is still pending.",
      );
      return;
    }

    this.restarting = true;

    try {
      const { serviceManager } = this;
      const { store } = serviceManager;

      if (fireEvents) {
        await serviceManager.fire({
          type: BusEventType.PRE_RESTART_CONVERSATION,
        });
      }
      serviceManager.restartCount++;

      if (this.hydrating) {
        await this.hydrationPromise;
      }

      const currentState = store.getState();

      // If we're connected to an agent, we need to end the agent chat.
      const { isConnecting } = currentState.humanAgentState;
      const { isConnected } =
        currentState.persistedToBrowserStorage.humanAgentState;

      if ((isConnected || isConnecting) && endHumanAgentConversation) {
        await serviceManager.humanAgentService.endChat(true, false, false);
      }

      this.serviceManager.instance.updateInputFieldVisibility(true);
      this.serviceManager.messageService.cancelAllMessageRequests();

      store.dispatch(actions.restartConversation());
      if (!skipHydration) {
        // Clear this promise in case the restart event below triggers another hydration.
        this.hydrationPromise = null;
      }

      if (fireEvents) {
        await serviceManager.fire({ type: BusEventType.RESTART_CONVERSATION });
      }

      if (this.hydrating) {
        await this.hydrationPromise;
      }

      if (!skipHydration && !serviceManager.store.getState().isHydrated) {
        // Trigger re-hydration.
        this.hydrationPromise = null;
        if (store.getState().persistedToBrowserStorage.viewState.mainWindow) {
          await serviceManager.actions.hydrateChat();
        }
      } else {
        store.dispatch(actions.chatWasHydrated());
      }
    } finally {
      this.restarting = false;
    }
  }

  /**
   * Remove any record of the current session from the browser's SessionStorage.
   *
   * @param keepOpenState We can optionally just keep around if the chat is currently open or not.
   */
  async destroySession(keepOpenState: boolean) {
    const { store } = this.serviceManager;
    const { persistedToBrowserStorage } = store.getState();
    const originalViewState = persistedToBrowserStorage.viewState;
    const newPersistedToBrowserStorage = cloneDeep(
      DEFAULT_PERSISTED_TO_BROWSER,
    );

    if (keepOpenState) {
      // If we want to keep the open state then copy it from browser storage.
      newPersistedToBrowserStorage.viewState = originalViewState;
    } else {
      // If we don't want to keep the open state then set the launcher to be open.
      newPersistedToBrowserStorage.viewState = VIEW_STATE_LAUNCHER_OPEN;
    }
    this.serviceManager.messageService.cancelAllMessageRequests();

    this.serviceManager.userSessionStorageService.clearSession();

    this.serviceManager.store.dispatch(
      actions.setAppStateValue(
        "persistedToBrowserStorage",
        newPersistedToBrowserStorage,
      ),
    );
  }

  /**
   * Ends the conversation with a human agent. This does not request confirmation from the user first. If the user
   * is not connected or connecting to a human agent, this function has no effect. You can determine if the user is
   * connected or connecting by calling {@link ChatInstance.getState}. Note that this function
   * returns a Promise that only resolves when the conversation has ended. This includes after the
   * {@link BusEventType.HUMAN_AGENT_PRE_END_CHAT} and {@link BusEventType.HUMAN_AGENT_END_CHAT} events have been fired and
   * resolved.
   */
  agentEndConversation(endedByUser: boolean) {
    return this.serviceManager.humanAgentService.endChat(endedByUser);
  }

  /**
   * Sets the suspended state for an agent conversation. A conversation can be suspended or un-suspended only if the
   * user is currently connecting or connected to an agent. If a conversation is suspended, then messages from the user
   * will no longer be routed to the service desk and incoming messages from the service desk will not be displayed. In
   * addition, the current connection status with an agent will not be shown.
   */
  agentUpdateIsSuspended(isSuspended: boolean) {
    this.serviceManager.store.dispatch(agentUpdateIsSuspended(isSuspended));
  }

  /**
   * Creates the custom response elements for all the messages in the given set. This is used in particular when
   * loading a list of messages from history.
   */
  async createElementsForUserDefinedResponses(messages: AppStateMessages) {
    await asyncForEach(
      Object.values(messages.allMessageItemsByID),
      (localMessage) => {
        const originalMessage =
          messages.allMessagesByID[localMessage.fullMessageID];
        return this.handleUserDefinedResponseItems(
          localMessage,
          originalMessage,
        );
      },
    );
  }

  /**
   * Determines if welcome messages should be skipped due to current or previous agent sessions.
   * This prevents welcome messages when:
   * 1. User is currently connected to an agent
   * 2. User was previously connected to an agent (even if reconnection failed)
   *
   * @param state The current application state
   * @returns true if welcome messages should be skipped, false otherwise
   */
  private shouldSkipWelcomeForAgentSession(state: AppState): boolean {
    const { humanAgentState } = state.persistedToBrowserStorage;

    // Skip welcome if currently connected to an agent
    if (humanAgentState.isConnected) {
      return true;
    }

    // Skip welcome if there was a previous agent session (indicated by having a responseUserProfile)
    // This handles cases where reconnection failed or isn't supported
    if (humanAgentState.responseUserProfile) {
      return true;
    }

    // Skip welcome if there's persisted service desk state, indicating a previous session
    if (humanAgentState.serviceDeskState) {
      return true;
    }

    return false;
  }
}

/**
 * Options for restarting a conversation.
 */
interface RestartConversationOptions {
  /**
   * Indicates if restarting the conversation should skip the hydration of a new conversation.
   */
  skipHydration?: boolean;

  /**
   * Indicates if a conversation with a human agent should be ended. This defaults to true.
   */
  endHumanAgentConversation?: boolean;

  /**
   * Indicates if the "pre:restartConversation" and "restartConversation" events should be fired. This defaults to true.
   */
  fireEvents?: boolean;
}

export { ChatActionsImpl };

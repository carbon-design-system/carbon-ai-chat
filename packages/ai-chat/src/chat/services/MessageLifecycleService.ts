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
import {
  createLocalMessageItemsForNestedMessageItems,
  outputItemToLocalItem,
} from "../schema/outputItemToLocalItem";
import { HumanAgentsOnlineStatus } from "../services/haa/HumanAgentService";
import { ServiceManager } from "../services/ServiceManager";
import actions from "../store/actions";
import {
  DEFAULT_PERSISTED_TO_BROWSER,
  VIEW_STATE_LAUNCHER_OPEN,
} from "../store/reducerUtils";

import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";

import { deepFreeze } from "../utils/lang/objectUtils";
import { sleep } from "../utils/lang/promiseUtils";
import { uuid, UUIDType } from "../utils/lang/uuid";
import {
  addDefaultsToMessage,
  createMessageRequestForText,
  createMessageResponseForText,
  hasServiceDesk,
  isConnectToHumanAgent,
  isPause,
  isResponse,
  isTyping,
} from "../utils/messageUtils";
import {
  callOnError,
  consoleError,
  consoleWarn,
  debugLog,
} from "../utils/miscUtils";
import {
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  PauseItem,
} from "../../types/messaging/Messages";
import {
  BusEventPreReceive,
  BusEventType,
  MessageSendSource,
} from "../../types/events/eventBusTypes";
import { SendOptions } from "../../types/instance/ChatInstance";
import { OnErrorData, OnErrorType } from "../../types/config/PublicConfig";
import { NotificationMessage } from "../../types/instance/apiTypes";
import { DeepPartial } from "../../types/utilities/DeepPartial";

/**
 * Coordinates the complete message lifecycle including sending, receiving, and processing messages.
 * Also handles session management operations (restart, destroy) that require coordinating across
 * the entire message pipeline.
 */
class MessageLifecycleService {
  /**
   * The service manager to use to access services.
   */
  private serviceManager: ServiceManager;

  /**
   * Indicates if a restart is currently in progress.
   */
  private restarting = false;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
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

    const hydrationPromise =
      this.serviceManager.hydrationService.getHydrationPromise();
    if (hydrationPromise || ignoreHydration) {
      if (!ignoreHydration) {
        await hydrationPromise;
      }
      await this.doSend(messageRequest, source, options);
    } else {
      // If no hydration has started, then we need to start the hydration and use this message as the alternate for
      // the welcome node.
      this.serviceManager.store.dispatch(actions.setHomeScreenIsOpen(false));
      await this.serviceManager.hydrationService.hydrateChat(
        messageRequest,
        source,
        options,
      );
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

    // If history.silent is set to true, we don't add the message to the  store as we do not want to show it.
    // Likewise, in schema/historyToMessages, if the message is coming from the history store, we do not add it to the store
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

    await this.serviceManager.messageOutboundService.send(
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
   * Takes each item in the appropriate output array and dispatches correct actions. We may want to look into
   * turning this into a formal queue as the pause response_type may cause us to lose correct order in fast
   * conversations.
   *
   * The method orchestrates the processing flow by:
   * 1. Preparing the message with defaults and adding it to the store
   * 2. Iterating through each output item in the response
   * 3. For each item, creating local message items and processing nested items
   * 4. Handling special cases like agent connections (checking availability, auto-connecting)
   * 5. Processing pause items (showing typing indicators, waiting for the pause duration)
   * 6. Processing regular items (handling user-defined responses, adding to store)
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

        const pause = isPause(messageItem);
        const agent = isConnectToHumanAgent(messageItem);

        if (agent && isResponse(fullMessage)) {
          await this.handleAgentAvailability(
            localMessageItem,
            fullMessage,
            initialRestartCount,
          );
        }

        if (pause) {
          await this.processPauseItem(messageItem, initialRestartCount);
        } else {
          const itemID = await this.processRegularItem(
            localMessageItem,
            fullMessage,
            previousItemID,
            initialRestartCount,
          );
          if (itemID) {
            previousItemID = itemID;
          }
        }
      }
    }
  }

  /**
   * Handles agent availability checking and auto-connection logic for connect_to_agent messages.
   * Shows a typing indicator while checking availability, validates service desk configuration,
   * checks agent availability, updates store with the results, and initiates auto-connect if configured.
   *
   * @param localMessageItem The local message item for the agent connection
   * @param fullMessage The full message response
   * @param initialRestartCount The restart count at the start of processing to detect restarts
   */
  private async handleAgentAvailability(
    localMessageItem: LocalMessageItem,
    fullMessage: MessageResponse,
    initialRestartCount: number,
  ): Promise<void> {
    const { store } = this.serviceManager;
    const { config } = store.getState();

    // Show typing indicator while we check agent availability
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
      partialMessage.ui_state_internal = { agent_no_service_desk: true };
    }

    const agentAvailability =
      await this.serviceManager.humanAgentService?.checkAreAnyHumanAgentsOnline(
        fullMessage,
      );

    // If a restart occurred while waiting for the agents online check, then skip the processing below.
    if (initialRestartCount === this.serviceManager.restartCount) {
      // Update the value in the  store.
      store.dispatch(
        actions.setMessageUIStateInternalProperty(
          localMessageItem.fullMessageID,
          "agent_availability",
          agentAvailability,
        ),
      );

      partialMessage.ui_state_internal = partialMessage.ui_state_internal || {};

      // Send event to back-end to save the current agent availability state so session history can use it on reload.
      partialMessage.ui_state_internal.agent_availability = agentAvailability;

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

  /**
   * Processes a pause message item by showing a typing indicator (if specified) and sleeping
   * for the pause duration before continuing to the next item.
   *
   * @param messageItem The pause message item to process
   * @param initialRestartCount The restart count at the start of processing to detect restarts
   */
  private async processPauseItem(
    messageItem: any,
    initialRestartCount: number,
  ): Promise<void> {
    const { store } = this.serviceManager;
    const showIsTyping = isTyping(messageItem);

    if (showIsTyping) {
      store.dispatch(actions.addIsTypingCounter(1));
    }

    // If this message is a pause, then just sleep for the pause duration before continuing. We don't actually
    // render anything for this message since it's really an instruction so we won't create a LocalMessage for
    // it and it won't be added to the  store.
    await sleep((messageItem as PauseItem).time);

    if (
      showIsTyping &&
      initialRestartCount === this.serviceManager.restartCount
    ) {
      store.dispatch(actions.addIsTypingCounter(-1));
    }
  }

  /**
   * Processes a regular (non-pause) message item by handling user-defined responses
   * and adding the item to the store if it's not silent.
   *
   * @param localMessageItem The local message item to process
   * @param fullMessage The full message response
   * @param previousItemID The ID of the previous item added to the store
   * @param initialRestartCount The restart count at the start of processing to detect restarts
   * @returns The ID of the added item if it was added to the store, null otherwise
   */
  private async processRegularItem(
    localMessageItem: LocalMessageItem,
    fullMessage: MessageResponse,
    previousItemID: string | null,
    initialRestartCount: number,
  ): Promise<string | null> {
    // In order to ensure that the addMessages get called in correct order, we need to add an `await` here to
    // pause further processing until this one is sent.
    await this.serviceManager.userDefinedResponseService.handleUserDefinedResponseItems(
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
      return localMessageItem.ui_state.id;
    }

    return null;
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
   *
   * The restart process flows through these steps:
   * 1. Guards against concurrent restarts and increments restart generation
   * 2. Waits for any in-progress hydration and disconnects from human agents if configured
   * 3. Cleans up the current conversation (cancels messages, resets UI state)
   * 4. Fires restart events and resets the store state
   * 5. Triggers re-hydration if configured and the main window is visible
   *
   * @param options Configuration options for the restart behavior
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

      // Increment the restart generation in MessageInboundService to filter out any chunks from the previous conversation
      serviceManager.messageInboundService.incrementGeneration();

      // Set isRestarting to true to signal that we're in the middle of a restart
      store.dispatch(actions.setIsRestarting(true));

      if (fireEvents) {
        await serviceManager.fire({
          type: BusEventType.PRE_RESTART_CONVERSATION,
        });
      }
      serviceManager.restartCount++;

      // Wait for any in-progress hydration before proceeding
      if (serviceManager.hydrationService.isHydrating()) {
        await serviceManager.hydrationService.getHydrationPromise();
      }

      await this.handleHumanAgentDisconnect(endHumanAgentConversation);
      await this.cleanupCurrentConversation();

      store.dispatch(actions.restartConversation());
      if (!skipHydration) {
        // Clear this promise in case the restart event below triggers another hydration.
        serviceManager.hydrationService.clearHydrationPromise();
      }

      if (fireEvents) {
        await serviceManager.fire({ type: BusEventType.RESTART_CONVERSATION });
      }

      await this.triggerRehydration(skipHydration);
    } finally {
      this.restarting = false;
      // Clear isRestarting flag to allow new messages and chunks to be processed
      this.serviceManager.store.dispatch(actions.setIsRestarting(false));
    }
  }

  /**
   * Handles disconnecting from a human agent if one is connected or connecting.
   * This method checks the current agent connection state and ends the chat if configured to do so.
   *
   * @param endHumanAgentConversation Whether to end the human agent conversation
   */
  private async handleHumanAgentDisconnect(
    endHumanAgentConversation: boolean,
  ): Promise<void> {
    const { store, humanAgentService } = this.serviceManager;
    const currentState = store.getState();

    // If we're connected to an agent, we need to end the agent chat.
    const { isConnecting } = currentState.humanAgentState;
    const { isConnected } =
      currentState.persistedToBrowserStorage.humanAgentState;

    if ((isConnected || isConnecting) && endHumanAgentConversation) {
      await humanAgentService.endChat(true, false, false);
    }
  }

  /**
   * Cleans up the current conversation by canceling all pending messages, resetting UI state,
   * and hiding any active streaming indicators.
   */
  private async cleanupCurrentConversation(): Promise<void> {
    const { store, instance, messageOutboundService } = this.serviceManager;

    instance.updateInputFieldVisibility(true);
    await messageOutboundService.cancelAllMessageRequests();

    // Hide the stop streaming button since we've cancelled all streams
    if (
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ) {
      store.dispatch(actions.setStopStreamingButtonDisabled(false));
      store.dispatch(actions.setStopStreamingButtonVisible(false));
    }
  }

  /**
   * Triggers re-hydration of the chat if configured and the chat is not already hydrated.
   * Waits for any in-progress hydration before attempting to re-hydrate.
   *
   * @param skipHydration Whether to skip the hydration process
   */
  private async triggerRehydration(skipHydration: boolean): Promise<void> {
    const { serviceManager } = this;
    const { store, hydrationService } = serviceManager;

    if (hydrationService.isHydrating()) {
      await hydrationService.getHydrationPromise();
    }

    if (!skipHydration && !store.getState().isHydrated) {
      // Trigger re-hydration.
      hydrationService.clearHydrationPromise();
      if (store.getState().persistedToBrowserStorage.viewState.mainWindow) {
        await hydrationService.hydrateChat();
      }
    } else {
      store.dispatch(actions.chatWasHydrated());
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
    this.serviceManager.messageOutboundService.cancelAllMessageRequests();

    this.serviceManager.userSessionStorageService.clearSession();

    this.serviceManager.store.dispatch(
      actions.setAppStateValue(
        "persistedToBrowserStorage",
        newPersistedToBrowserStorage,
      ),
    );
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

export { MessageLifecycleService };

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This class contains the started instance of the Chat widget. It is created once all the dependencies
 * have been loaded such as the React components, language files and styling information. This is the public interface
 * that the host page will interact with to control the application and is what is returned after the "start" function
 * has been called.
 */

import cloneDeep from "lodash-es/cloneDeep.js";
import merge from "lodash-es/merge.js";

import { ServiceManager } from "../services/ServiceManager";
import actions from "../store/actions";
import { agentUpdateIsSuspended } from "../store/humanAgentActions";
import { selectInputState } from "../store/selectors";
import {
  AppStateMessages,
  ViewState,
  ViewType,
} from "../../types/state/AppState";

import { AutoScrollOptions } from "../../types/utilities/HasDoAutoScroll";
import { HistoryItem, HistoryNote } from "../../types/messaging/History";
import {
  consoleDebug,
  consoleError,
  consoleWarn,
  debugLog,
} from "../utils/miscUtils";
import {
  ChatInstance,
  PublicChatState,
  SendOptions,
  TypeAndHandler,
} from "../../types/instance/ChatInstance";
import { AddMessageOptions } from "../../types/config/MessagingConfig";
import {
  MessageSendSource,
  ViewChangeReason,
} from "../../types/events/eventBusTypes";
import { NotificationMessage } from "../../types/instance/apiTypes";
import {
  MessageRequest,
  MessageResponse,
  StreamChunk,
} from "../../types/messaging/Messages";
import { deepFreeze } from "../utils/lang/objectUtils";

interface CreateChatInstance {
  /**
   * The service manager to use.
   */
  serviceManager: ServiceManager;
}

/**
 * Helper: Gets the public chat state with frozen immutable values.
 */
function getPublicChatState(serviceManager: ServiceManager): PublicChatState {
  const state = serviceManager.store.getState();
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
 * Helper: Removes the messages with the given IDs from the chat view.
 */
async function removeMessages(
  serviceManager: ServiceManager,
  messageIDs: string[],
) {
  serviceManager.store.dispatch(actions.removeMessages(messageIDs));
}

/**
 * Helper: Receives a chunk from a stream and delegates to MessageInboundService.
 */
async function receiveChunk(
  serviceManager: ServiceManager,
  chunk: StreamChunk,
  messageID?: string,
  options: AddMessageOptions = {},
) {
  return serviceManager.messageInboundService.receiveChunk(
    chunk,
    messageID,
    options,
  );
}

/**
 * Helper: Creates the custom response elements for all the messages in the given set. This is used in particular when
 * loading a list of messages from history. Delegates to UserDefinedResponseService.
 */
async function createElementsForUserDefinedResponses(
  serviceManager: ServiceManager,
  messages: AppStateMessages,
) {
  return serviceManager.userDefinedResponseService.createElementsForUserDefinedResponses(
    messages,
  );
}

/**
 * Helper: Inserts the given messages into the chat window as part of the chat history. This will fire the history:begin
 * and history:end events.
 */
async function insertHistory(
  serviceManager: ServiceManager,
  messages: HistoryItem[],
) {
  // Note: there is currently a gap here. If this is called with a partial list of messages that include
  // "update_history" event messages to add updates to messages not also in this list, then they will not update
  // correctly. I'm going to wait to see how this functionality shakes out and see if this is really going to end
  // up being necessary.

  // If we're inserting more history into a chat that already has messages, we want to preserve the relative
  // scroll position of the existing messages from the bottom.
  const scrollBottom = serviceManager.mainWindow?.getMessagesScrollBottom();

  const state = serviceManager.store.getState();

  // TODO: This doesn't work right if this is called more than once.
  const notes: { notes: HistoryNote[] } = {
    notes: [{ body: messages }],
  };
  const history = await serviceManager.historyService.loadHistory(notes);

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

  serviceManager.store.dispatch(
    actions.hydrateMessageHistory(newAppStateMessages),
  );
  await createElementsForUserDefinedResponses(
    serviceManager,
    history.messageHistory,
  );

  // Restore the scroll position.
  serviceManager.mainWindow?.doAutoScroll({
    scrollToBottom: scrollBottom,
  });
}

/**
 * Helper: Ends the conversation with a human agent. This does not request confirmation from the user first. If the user
 * is not connected or connecting to a human agent, this function has no effect. You can determine if the user is
 * connected or connecting by calling {@link ChatInstance.getState}. Note that this function
 * returns a Promise that only resolves when the conversation has ended. This includes after the
 * {@link BusEventType.HUMAN_AGENT_PRE_END_CHAT} and {@link BusEventType.HUMAN_AGENT_END_CHAT} events have been fired and
 * resolved.
 */
function agentEndConversation(
  serviceManager: ServiceManager,
  endedByUser: boolean,
) {
  return serviceManager.humanAgentService.endChat(endedByUser);
}

/**
 * Helper: Sets the suspended state for an agent conversation. A conversation can be suspended or un-suspended only if the
 * user is currently connecting or connected to an agent. If a conversation is suspended, then messages from the user
 * will no longer be routed to the service desk and incoming messages from the service desk will not be displayed. In
 * addition, the current connection status with an agent will not be shown.
 */
function agentUpdateIsSuspendedHelper(
  serviceManager: ServiceManager,
  isSuspended: boolean,
) {
  serviceManager.store.dispatch(agentUpdateIsSuspended(isSuspended));
}

/**
 * Creates an instance of the public assistant chat. This value is what is returned to the host page after the chat
 * has been started and this instance is what the host page can use to send requests and get information from the
 * widget.
 *
 * The only values that should be returned in this object are values that may be accessible to customer code.
 */
function createChatInstance({
  serviceManager,
}: CreateChatInstance): ChatInstance {
  const instance: ChatInstance = {
    on: (handlers: TypeAndHandler | TypeAndHandler[]) => {
      serviceManager.eventBus.on(handlers);
      return instance;
    },

    off: (handlers: TypeAndHandler | TypeAndHandler[]) => {
      serviceManager.eventBus.off(handlers);
      return instance;
    },

    once: (handlers: TypeAndHandler | TypeAndHandler[]) => {
      serviceManager.eventBus.once(handlers);
      return instance;
    },

    send: async (message: MessageRequest | string, options?: SendOptions) => {
      debugLog("Called instance.send", message, options);
      if (selectInputState(serviceManager.store.getState()).isReadonly) {
        throw new Error("You are unable to send messages in read only mode.");
      }
      return serviceManager.actions.send(
        message,
        MessageSendSource.INSTANCE_SEND,
        options,
      );
    },

    doAutoScroll: (options: AutoScrollOptions = {}) => {
      debugLog("Called instance.doAutoScroll", options);
      serviceManager.mainWindow?.doAutoScroll?.(options);
    },

    updateInputFieldVisibility: (isVisible: boolean) => {
      debugLog("Called instance.updateInputFieldVisibility", isVisible);
      serviceManager.store.dispatch(
        actions.updateInputState({ fieldVisible: isVisible }, false),
      );
    },

    updateInputIsDisabled: (isDisabled: boolean) => {
      debugLog("Called instance.updateInputIsDisabled", isDisabled);
      serviceManager.store.dispatch(
        actions.updateInputState({ isReadonly: isDisabled }, false),
      );
    },

    updateAssistantUnreadIndicatorVisibility: (isVisible: boolean) => {
      debugLog(
        "Called instance.updateAssistantUnreadIndicatorVisibility",
        isVisible,
      );
      serviceManager.store.dispatch(
        actions.setLauncherProperty("showUnreadIndicator", isVisible),
      );
    },

    changeView: async (
      newView: ViewType | Partial<ViewState>,
    ): Promise<void> => {
      debugLog("Called instance.changeView", newView);

      let issueWithNewView = false;

      const viewTypeValues = Object.values<string>(ViewType);
      if (typeof newView === "string") {
        if (!viewTypeValues.includes(newView)) {
          consoleError(
            `You tried to change the view but the view you specified is not a valid view name. Please use` +
              ` the valid view names; ${viewTypeValues.join(", ")}.`,
          );
          issueWithNewView = true;
        }
      } else if (typeof newView === "object") {
        Object.keys(newView).forEach((key) => {
          if (!viewTypeValues.includes(key)) {
            // If an item in the newView object does not match any of the supported view types then log an error.
            consoleError(
              `You tried to change the state of multiple views by providing an object, however you included the key` +
                ` "${key}" within the object which is not a valid view name. Please use the valid view names; ` +
                `${viewTypeValues.join(", ")}.`,
            );
            issueWithNewView = true;
          }
        });
      } else {
        consoleError(
          "You tried to change the view but the view you provided was not a string or an object. You can either change" +
            ' to one of the supported views by providing a string, ex. "launcher" or "mainWindow". Or you can' +
            ' change the state of multiple views by providing an object, ex. { "launcher": true, "mainWindow": false,' +
            " }. Please use one of these supported options.",
        );
        issueWithNewView = true;
      }

      if (!issueWithNewView) {
        // If there are no major issues then try to change the view to the newView.
        await serviceManager.viewStateService.changeView(newView, {
          viewChangeReason: ViewChangeReason.CALLED_CHANGE_VIEW,
        });
      }
    },

    notifications: {
      addNotification: (notification: NotificationMessage): void => {
        debugLog("Called instance.addNotification", notification);
        serviceManager.actions.addNotification(notification);
      },

      removeNotifications: (groupID: string) => {
        debugLog("Called instance.removeNotifications", groupID);
        serviceManager.actions.removeNotification(groupID);
      },

      removeAllNotifications: () => {
        debugLog("Called instance.removeAllNotifications");
        serviceManager.actions.removeAllNotifications();
      },
    },

    getState: () => getPublicChatState(serviceManager),

    writeableElements: serviceManager.writeableElements,

    scrollToMessage: (messageID: string, animate?: boolean) => {
      debugLog("Called instance.scrollToMessage", messageID, animate);
      serviceManager.mainWindow?.doScrollToMessage(messageID, animate);
    },

    customPanels: serviceManager.customPanelManager,

    restartConversation: async () => {
      debugLog("Called instance.restartConversation");
      consoleWarn(
        "instance.restartConversation is deprecated. Use instance.messaging.restartConversation instead.",
      );
      return instance.messaging.restartConversation();
    },

    updateIsMessageLoadingCounter(direction: string): void {
      debugLog("Called instance.updateIsMessageLoadingCounter", direction);
      const { store } = serviceManager;

      if (direction === "increase") {
        store.dispatch(actions.addIsLoadingCounter(1));
      } else if (direction === "decrease") {
        if (
          store.getState().assistantMessageState.isMessageLoadingCounter <= 0
        ) {
          consoleError(
            "You cannot decrease the loading counter when it is already <= 0",
          );
          return;
        }
        store.dispatch(actions.addIsLoadingCounter(-1));
      } else {
        consoleError(
          `[updateIsMessageLoadingCounter] Invalid direction: ${direction}. Valid values are "increase" and "decrease".`,
        );
      }
    },

    updateIsChatLoadingCounter(direction: string): void {
      debugLog("Called instance.updateIsChatLoadingCounter", direction);
      const { store } = serviceManager;

      if (direction === "increase") {
        store.dispatch(actions.addIsHydratingCounter(1));
      } else if (direction === "decrease") {
        if (store.getState().assistantMessageState.isHydratingCounter <= 0) {
          consoleError(
            "You cannot decrease the hydrating counter when it is already <= 0",
          );
          return;
        }
        store.dispatch(actions.addIsHydratingCounter(-1));
      } else {
        consoleError(
          `[updateIsChatLoadingCounter] Invalid direction: ${direction}. Valid values are "increase" and "decrease".`,
        );
      }
    },

    messaging: {
      addMessage: (
        message: MessageResponse,
        options: AddMessageOptions = {},
      ) => {
        debugLog("Called instance.messaging.addMessage", message, options);
        serviceManager.messageOutboundService.messageLoadingManager.end();
        return serviceManager.actions.receive(
          message,
          options?.isLatestWelcomeNode ?? false,
          null,
          {
            disableFadeAnimation: options?.disableFadeAnimation,
          },
        );
      },

      addMessageChunk: async (
        chunk: StreamChunk,
        options: AddMessageOptions = {},
      ) => {
        debugLog("Called instance.messaging.addMessageChunk", chunk, options);
        serviceManager.messageOutboundService.messageLoadingManager.end();
        try {
          await receiveChunk(serviceManager, chunk, null, options);
        } catch (error) {
          consoleError("Error in addMessageChunk", error);
          throw error;
        }
      },

      removeMessages: async (messageIDs: string[]) => {
        debugLog("Called instance.messaging.removeMessages", messageIDs);
        return removeMessages(serviceManager, messageIDs);
      },

      clearConversation: () => {
        debugLog("Called instance.messaging.clearConversation");
        return serviceManager.actions.restartConversation({
          skipHydration: true,
          endHumanAgentConversation: false,
          fireEvents: false,
        });
      },

      insertHistory: (messages: HistoryItem[]) => {
        debugLog("Called instance.messaging.insertHistory", messages);
        return insertHistory(serviceManager, messages);
      },

      restartConversation: async () => {
        debugLog("Called instance.messaging.restartConversation");
        return serviceManager.actions.restartConversation();
      },
    },

    requestFocus: () => {
      debugLog("Called instance.requestFocus");
      serviceManager.appWindow?.requestFocus();
    },

    serviceDesk: {
      endConversation: () => {
        debugLog("Called instance.serviceDesk.endConversation");
        return agentEndConversation(serviceManager, false);
      },

      updateIsSuspended: async (isSuspended: boolean) => {
        debugLog("Called instance.serviceDesk.updateIsSuspended", isSuspended);
        return agentUpdateIsSuspendedHelper(serviceManager, isSuspended);
      },
    },

    destroySession: async (keepOpenState: boolean) => {
      debugLog("Called instance.destroySession", keepOpenState);
      return serviceManager.actions.destroySession(keepOpenState);
    },
  };

  // Add serviceManager for testing if the flag is enabled (exclude instance to avoid circular reference)
  if (
    serviceManager.store.getState().config.public.exposeServiceManagerForTesting
  ) {
    const { instance: _, ...serviceManagerForTesting } = serviceManager;
    instance.serviceManager = serviceManagerForTesting as ServiceManager;
  }

  if (serviceManager.store.getState().config.public.debug) {
    consoleDebug("[ChatInstanceImpl] Created chat instance", instance);
  }

  return instance;
}

export { createChatInstance };

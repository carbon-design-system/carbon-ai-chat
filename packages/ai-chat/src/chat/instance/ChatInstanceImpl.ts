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

import { ServiceManager } from "../services/ServiceManager";
import actions from "../store/actions";
import { selectInputState } from "../store/selectors";
import { ViewState, ViewType } from "../../types/state/AppState";

import { AutoScrollOptions } from "../../types/utilities/HasDoAutoScroll";
import { HistoryItem } from "../../types/messaging/History";
import {
  consoleDebug,
  consoleError,
  consoleWarn,
  debugLog,
} from "../utils/miscUtils";
import {
  ChatInstance,
  IncreaseOrDecrease,
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

interface CreateChatInstance {
  /**
   * The service manager to use.
   */
  serviceManager: ServiceManager;
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
      consoleWarn(
        "instance.updateInputFieldVisibility is deprecated. Use The input.isVisible property to configure this behavior.",
      );
      serviceManager.store.dispatch(
        actions.updateInputState({ fieldVisible: isVisible }, false),
      );
    },

    updateInputIsDisabled: (isDisabled: boolean) => {
      consoleWarn(
        "instance.updateInputIsDisabled is deprecated. Use the input.isDisabled property to configure this behavior.",
      );
      serviceManager.store.dispatch(
        actions.updateInputState({ isReadonly: isDisabled }, false),
      );
    },

    updateAssistantUnreadIndicatorVisibility: (isVisible: boolean) => {
      consoleWarn(
        "instance.updateAssistantUnreadIndicatorVisibility is deprecated. Use public.launcher.showUnreadIndicator to configure this behavior.",
      );
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
        await serviceManager.actions.changeView(newView, {
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

    input: {
      updateRawValue: (updater: (previous: string) => string) => {
        debugLog("Called instance.input.updateRawValue");
        serviceManager.actions.updateRawInputValue(updater);
      },
    },

    getState: () => serviceManager.actions.getPublicChatState(),

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

    updateIsMessageLoadingCounter(
      direction: IncreaseOrDecrease,
      message?: string,
    ): void {
      debugLog("Called instance.updateIsMessageLoadingCounter", direction);
      const { store } = serviceManager;

      if (direction === "reset") {
        store.dispatch(actions.resetIsLoadingCounter());
      } else if (direction === "increase") {
        store.dispatch(actions.addIsLoadingCounter(1, message));
      } else if (direction === "decrease") {
        if (
          store.getState().assistantMessageState.isMessageLoadingCounter <= 0
        ) {
          return;
        }
        store.dispatch(actions.addIsLoadingCounter(-1, message));
      } else if (!direction && message) {
        store.dispatch(actions.addIsLoadingCounter(0, message));
      }
      if (direction) {
        consoleError(
          `[updateIsMessageLoadingCounter] Invalid direction: ${direction}. Valid values are undefined, "reset", "increase" and "decrease".`,
        );
      }
    },

    updateIsChatLoadingCounter(direction: string): void {
      debugLog("Called instance.updateIsChatLoadingCounter", direction);
      const { store } = serviceManager;

      if (direction === "reset") {
        store.dispatch(actions.resetIsHydratingCounter());
      } else if (direction === "increase") {
        store.dispatch(actions.addIsHydratingCounter(1));
      } else if (direction === "decrease") {
        if (store.getState().assistantMessageState.isHydratingCounter <= 0) {
          return;
        }
        store.dispatch(actions.addIsHydratingCounter(-1));
      } else {
        consoleError(
          `[updateIsChatLoadingCounter] Invalid direction: ${direction}. Valid values are "reset", "increase" and "decrease".`,
        );
      }
    },

    messaging: {
      addMessage: (
        message: MessageResponse,
        options: AddMessageOptions = {},
      ) => {
        debugLog("Called instance.messaging.addMessage", message, options);
        serviceManager.messageService.messageLoadingManager.end();
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
        serviceManager.messageService.messageLoadingManager.end();
        try {
          await serviceManager.actions.receiveChunk(chunk, null, options);
        } catch (error) {
          consoleError("Error in addMessageChunk", error);
          throw error;
        }
      },

      removeMessages: async (messageIDs: string[]) => {
        debugLog("Called instance.messaging.removeMessages", messageIDs);
        return serviceManager.actions.removeMessages(messageIDs);
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
        return serviceManager.actions.insertHistory(messages);
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
        return serviceManager.actions.agentEndConversation(false);
      },

      updateIsSuspended: async (isSuspended: boolean) => {
        debugLog("Called instance.serviceDesk.updateIsSuspended", isSuspended);
        return serviceManager.actions.agentUpdateIsSuspended(isSuspended);
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

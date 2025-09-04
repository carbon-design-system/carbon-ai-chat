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

import dayjs from "dayjs";
import cloneDeep from "lodash-es/cloneDeep.js";
import { DeepPartial } from "../../types/utilities/DeepPartial";

import { ServiceManager } from "./services/ServiceManager";
import actions from "./store/actions";
import { selectInputState } from "./store/selectors";
import { ViewState, ViewType } from "../../types/state/AppState";

import { AutoScrollOptions } from "../../types/utilities/HasDoAutoScroll";
import { LauncherConfig } from "../../types/config/LauncherConfig";
import { HistoryItem } from "../../types/messaging/History";
import { WriteableElementName } from "./utils/constants";
import { withoutEmptyStarters } from "./utils/homeScreenUtils";
import { loadLanguagePack, loadLocale } from "./utils/languages";
import {
  consoleDebug,
  consoleError,
  consoleWarn,
  debugLog,
} from "./utils/miscUtils";
import {
  ChangeFunction,
  ChatHeaderAvatarConfig,
  ChatInstance,
  CSSVariable,
  InstanceInputElement,
  SendOptions,
  TypeAndHandler,
  WriteableElements,
} from "../../types/instance/ChatInstance";
import { AddMessageOptions } from "../../types/config/MessagingConfig";
import { WhiteLabelTheme } from "../../types/config/PublicConfig";
import {
  MessageSendSource,
  ViewChangeReason,
} from "../../types/events/eventBusTypes";
import {
  CustomMenuOption,
  LanguagePack,
  NotificationMessage,
} from "../../types/instance/apiTypes";
import {
  MessageRequest,
  MessageResponse,
  StreamChunk,
} from "../../types/messaging/Messages";
import { HomeScreenConfig } from "../../types/config/HomeScreenConfig";
import { ThemeType } from "../../types/config/PublicConfig";
import { setIntl } from "./utils/intlUtils";
import { ChatHeaderConfig } from "../../types/config/ChatHeaderConfig";

interface CreateChatInstance {
  /**
   * The service manager to use.
   */
  serviceManager: ServiceManager;

  /**
   * Render the chat widget in the DOM after fetching welcome and history.
   */
  callRender: () => Promise<ChatInstance>;
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
  callRender,
}: CreateChatInstance): ChatInstance {
  // A flag to keep track if the instance has already been rendered.
  let wasRendered = false;

  function getMainWindow() {
    return {
      addClassName: (name: string) =>
        serviceManager.mainWindow?.addClassName(name),
      removeClassName: (name: string) =>
        serviceManager.mainWindow?.removeClassName(name),
    };
  }

  function getMessageInput(): InstanceInputElement {
    return {
      getHTMLElement: () =>
        serviceManager.mainWindow?.getMessageInput()?.getHTMLElement(),
      setValue: (value: string) =>
        serviceManager.mainWindow?.getMessageInput()?.setValue(value),
      setEnableEnterKey: (value: boolean) =>
        serviceManager.mainWindow?.getMessageInput()?.setEnableEnterKey(value),
      addChangeListener: (listener: ChangeFunction) =>
        serviceManager.mainWindow
          ?.getMessageInput()
          ?.addChangeListener(listener),
      removeChangeListener: (listener: ChangeFunction) =>
        serviceManager.mainWindow
          ?.getMessageInput()
          ?.removeChangeListener(listener),
    };
  }

  function getHomeScreenInput(): InstanceInputElement {
    return {
      getHTMLElement: () =>
        serviceManager.mainWindow?.getHomeScreenInput()?.getHTMLElement(),
      setValue: (value: string) =>
        serviceManager.mainWindow?.getHomeScreenInput()?.setValue(value),
      setEnableEnterKey: (value: boolean) =>
        serviceManager.mainWindow
          ?.getHomeScreenInput()
          ?.setEnableEnterKey(value),
      addChangeListener: (listener: ChangeFunction) =>
        serviceManager.mainWindow
          ?.getHomeScreenInput()
          ?.addChangeListener(listener),
      removeChangeListener: (listener: ChangeFunction) =>
        serviceManager.mainWindow
          ?.getHomeScreenInput()
          ?.removeChangeListener(listener),
    };
  }

  let instance: ChatInstance = {
    render: () => {
      if (wasRendered) {
        consoleError("The render function has already been called!");
        return Promise.resolve(instance);
      }
      wasRendered = true;
      return callRender();
    },

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

    updateLanguagePack: (newPack: DeepPartial<LanguagePack>): void => {
      debugLog("Called instance.updateLanguagePack", newPack);
      return serviceManager.actions.updateLanguagePack(newPack);
    },

    updateLocale: (newLocale: string): Promise<void> => {
      debugLog("Called instance.updateLocale", newLocale);
      // Get date formatting for locale.
      const localePromise = loadLocale(newLocale);
      const languagePackPromise = loadLanguagePack(
        serviceManager.store.getState().languagePack,
      );

      return Promise.all([localePromise, languagePackPromise]).then(
        ([localePack, languagePack]) => {
          // Update Redux with new values for language, locale, and messages.
          dayjs.locale(localePack);
          setIntl(serviceManager, localePack.name, languagePack);
          serviceManager.messageService.pendingLocale = true;
          serviceManager.messageService.localeIsExplicit = true;
        },
      );
    },

    updateCSSVariables: (
      variables: Partial<Record<CSSVariable, string>>,
      whiteLabelVariables?: WhiteLabelTheme,
    ): void => {
      debugLog("Called instance.updateCSSVariables", variables);
      return serviceManager.actions.updateCSSVariables(
        variables,
        whiteLabelVariables,
      );
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

    destroy: () => {
      debugLog("Called instance.destroy");
      // Trigger an unmounting of all the components.
      serviceManager.store.dispatch(
        actions.setAppStateValue("isDestroyed", true),
      );
      serviceManager.container?.remove();
      instance = undefined;
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

    updateBotUnreadIndicatorVisibility: (isVisible: boolean) => {
      debugLog("Called instance.updateBotUnreadIndicatorVisibility", isVisible);
      serviceManager.store.dispatch(
        actions.setLauncherProperty("showUnreadIndicator", isVisible),
      );
    },

    changeView: async (
      newView: ViewType | Partial<ViewState>,
    ): Promise<void> => {
      debugLog("Called instance.changeView", newView);

      let issueWithNewView = false;

      if (!wasRendered) {
        consoleError(
          `You tried to call "changeView" without ever having called the "render" method. There is no view to change!`,
        );
        issueWithNewView = true;
      }

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

    updateMainHeaderTitle: (title?: string): void => {
      debugLog("Called instance.updateMainHeaderTitle", title);
      if (!title) {
        title = null;
      }
      serviceManager.actions.updateMainHeaderTitle(title);
    },

    updateHomeScreenConfig: (homeScreenConfig: HomeScreenConfig): void => {
      debugLog("Called instance.updateHomeScreenConfig", homeScreenConfig);
      const homeScreenConfigClone = cloneDeep(homeScreenConfig);

      const isAIThemeEnabled =
        serviceManager.store.getState().theme.theme === ThemeType.CARBON_AI;

      if (isAIThemeEnabled) {
        if (homeScreenConfig?.background) {
          // If the AI theme is enabled and the user is trying to change the home screen background then log a warning
          // and ignore / remove the updates for the background. This is following the same behavior as
          // updateCSSVariables which logs a warning and ignores updates for variables not supported in the AI theme.
          consoleWarn(
            "The home screen background can not be changed when the AI theme is enabled.",
          );
          delete homeScreenConfigClone.background;
        }
      }

      serviceManager.actions.updateHomeScreenConfig(
        withoutEmptyStarters(homeScreenConfigClone),
      );
    },

    getState: () => serviceManager.actions.getPublicWebChatState(),

    writeableElements: createWriteableElementsProxy(serviceManager),

    scrollToMessage: (messageID: string, animate?: boolean) => {
      debugLog("Called instance.scrollToMessage", messageID, animate);
      serviceManager.mainWindow?.doScrollToMessage(messageID, animate);
    },

    updateLauncherConfig: (config: LauncherConfig) =>
      serviceManager.actions.updateLauncherConfig(config),

    customPanels: serviceManager.customPanelManager,

    updateCustomMenuOptions: (options: CustomMenuOption[]) => {
      debugLog("Called instance.updateCustomMenuOptions", options);
      serviceManager.store.dispatch(
        actions.setAppStateValue("customMenuOptions", options),
      );
    },

    restartConversation: async () => {
      debugLog("Called instance.restartConversation");
      consoleWarn(
        "instance.restartConversation is deprecated. Use instance.messaging.restartConversation instead.",
      );
      return instance.messaging.restartConversation();
    },

    updateIsLoadingCounter(direction: string): void {
      debugLog("Called instance.updateIsLoadingCounter", direction);
      const { store } = serviceManager;

      if (direction === "increase") {
        store.dispatch(actions.addIsLoadingCounter(1));
      } else if (direction === "decrease") {
        if (store.getState().botMessageState.isLoadingCounter <= 0) {
          consoleError(
            "You cannot decrease the loading counter when it is already <= 0",
          );
          return;
        }
        store.dispatch(actions.addIsLoadingCounter(-1));
      } else {
        consoleError(
          `[updateIsLoadingCounter] Invalid direction: ${direction}. Valid values are "increase" and "decrease".`,
        );
      }
    },

    updateIsChatLoadingCounter(direction: string): void {
      debugLog("Called instance.updateIsChatLoadingCounter", direction);
      const { store } = serviceManager;

      if (direction === "increase") {
        store.dispatch(actions.addIsHydratingCounter(1));
      } else if (direction === "decrease") {
        if (store.getState().botMessageState.isHydratingCounter <= 0) {
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

    updateHeaderConfig: (config: ChatHeaderConfig) => {
      const configCopy = cloneDeep(config);
      serviceManager.store.dispatch(actions.updateChatHeaderConfig(configCopy));
    },

    updateMainHeaderAvatar: (config: ChatHeaderAvatarConfig) => {
      serviceManager.store.dispatch(actions.updateMainHeaderAvatar(config));
    },

    updateBotName: (name: string): void =>
      serviceManager.actions.updateBotName(name),
    updateBotAvatarURL: (url: string): void =>
      serviceManager.actions.updateBotAvatarURL(url),

    elements: {
      getMainWindow,
      getMessageInput,
      getHomeScreenInput,
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
  };

  // Add serviceManager for testing if the flag is enabled (exclude instance to avoid circular reference)
  if (
    serviceManager.store.getState().config.public.exposeServiceManagerForTesting
  ) {
    const { instance: _, ...serviceManagerForTesting } = serviceManager;
    (instance as any).serviceManager = serviceManagerForTesting;
  }

  if (serviceManager.store.getState().config.public.debug) {
    consoleDebug("[ChatInstanceImpl] Created chat instance", instance);
  }

  return instance;
}

/**
 * Returns a proxy object of type WriteableElements that Deb will use to send set her custom content and should only
 * fire amplitude events once.
 */
function createWriteableElementsProxy(
  serviceManager: ServiceManager,
): Partial<WriteableElements> {
  const elementSet = new Set<WriteableElementName>();

  const handler = {
    get(target: WriteableElements, element: WriteableElementName) {
      if (!elementSet.has(element)) {
        elementSet.add(element);
      }
      return target[element];
    },
  };

  return new Proxy(serviceManager.writeableElements, handler);
}

export { createChatInstance };

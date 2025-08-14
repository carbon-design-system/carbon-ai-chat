/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from "lodash-es/isEqual.js";

import { VERSION } from "../environmentVariables";
import {
  HumanAgentState,
  AnnounceMessage,
  AppState,
  AppStateMessages,
  ChatMessagesState,
  CustomPanelConfigOptions,
  CustomPanelState,
  IFramePanelState,
  InputState,
  LauncherState,
  MessagePanelState,
  PersistedToBrowserStorageState,
  ThemeState,
  ViewSourcePanelState,
  ViewState,
} from "../../../types/state/AppState";
import {
  NotificationType,
  TIME_TO_ENTRANCE_ANIMATION_START,
} from "../../../types/config/LauncherConfig";
import { CornersType, DEFAULT_CUSTOM_PANEL_ID } from "../utils/constants";
import { deepFreeze } from "../utils/lang/objectUtils";
import { CarbonTheme } from "../../../types/utilities/carbonTypes";
import { LayoutConfig } from "../../../types/config/PublicConfig";
import { LocalMessageUIState } from "../../../types/messaging/LocalMessageItem";
import { Message } from "../../../types/messaging/Messages";

/**
 * Miscellaneous utilities to help in reducers.
 */

const DEFAULT_LAUNCHER: LauncherState = {
  config: {
    is_on: true,
    mobile: {
      is_on: true,
      title: "",
      time_to_expand: TIME_TO_ENTRANCE_ANIMATION_START,
      new_expand_time: false,
      time_to_reduce: 10000,
      notification_type: NotificationType.TEXT_NOTIFICATION,
    },
    desktop: {
      is_on: true,
      title: "",
      new_expand_time: false,
      time_to_expand: TIME_TO_ENTRANCE_ANIMATION_START,
      notification_type: NotificationType.TEXT_NOTIFICATION,
    },
  },
};
deepFreeze(DEFAULT_LAUNCHER);

const DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS: CustomPanelConfigOptions = {
  title: null,
  hideBackButton: false,
  hidePanelHeader: false,
  disableAnimation: false,
};
deepFreeze(DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS);

const DEFAULT_CUSTOM_PANEL_STATE: CustomPanelState = {
  isOpen: false,
  panelID: DEFAULT_CUSTOM_PANEL_ID,
  options: DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
};
deepFreeze(DEFAULT_CUSTOM_PANEL_STATE);

const DEFAULT_IFRAME_PANEL_STATE: IFramePanelState = {
  isOpen: false,
  messageItem: null,
};
deepFreeze(DEFAULT_IFRAME_PANEL_STATE);

const DEFAULT_CITATION_PANEL_STATE: ViewSourcePanelState = {
  isOpen: false,
  citationItem: null,
};
deepFreeze(DEFAULT_CITATION_PANEL_STATE);

const DEFAULT_MESSAGE_PANEL_STATE: MessagePanelState<any> = {
  isOpen: false,
  localMessageItem: null,
  isMessageForInput: false,
};

deepFreeze(DEFAULT_MESSAGE_PANEL_STATE);

const VIEW_STATE_ALL_CLOSED: ViewState = {
  launcher: false,
  mainWindow: false,
};
deepFreeze(VIEW_STATE_ALL_CLOSED);

const VIEW_STATE_LAUNCHER_OPEN: ViewState = {
  launcher: true,
  mainWindow: false,
};
deepFreeze(VIEW_STATE_LAUNCHER_OPEN);

const VIEW_STATE_MAIN_WINDOW_OPEN: ViewState = {
  mainWindow: true,
  launcher: false,
};
deepFreeze(VIEW_STATE_MAIN_WINDOW_OPEN);

const DEFAULT_PERSISTED_TO_BROWSER: PersistedToBrowserStorageState = {
  chatState: {
    version: VERSION,
    disclaimersAccepted: {},
    homeScreenState: {
      isHomeScreenOpen: false,
      showBackToBot: false,
    },
    hasSentNonWelcomeMessage: false,
    humanAgentState: {
      isConnected: false,
      isSuspended: false,
      responseUserProfiles: {},
    },
  },
  launcherState: {
    wasLoadedFromBrowser: false,
    version: VERSION,
    viewState: VIEW_STATE_ALL_CLOSED,
    showUnreadIndicator: false,
    mobileLauncherIsExtended: false,
    mobileLauncherWasReduced: false,
    mobileLauncherDisableBounce: false,
    desktopLauncherIsExpanded: false,
    desktopLauncherWasMinimized: false,
    bounceTurn: 1,
    hasSentNonWelcomeMessage: false,
  },
};
deepFreeze(DEFAULT_PERSISTED_TO_BROWSER);

const DEFAULT_CHAT_MESSAGES_STATE: ChatMessagesState = {
  localMessageIDs: [],
  messageIDs: [],
  isLoadingCounter: 0,
  isHydratingCounter: 0,
  isScrollAnchored: false,
};
deepFreeze(DEFAULT_CHAT_MESSAGES_STATE);

const DEFAULT_MESSAGE_STATE: AppStateMessages = {
  allMessageItemsByID: {},
  allMessagesByID: {},
  botMessageState: {
    ...DEFAULT_CHAT_MESSAGES_STATE,
  },
};
deepFreeze(DEFAULT_MESSAGE_STATE);

const DEFAULT_INPUT_STATE = (): InputState => ({
  fieldVisible: true,
  isReadonly: false,
  files: [],
  allowFileUploads: false,
  allowMultipleFileUploads: false,
  allowedFileUploadTypes: null,
  stopStreamingButtonState: {
    currentStreamID: null,
    isVisible: false,
    isDisabled: false,
  },
});

const DEFAULT_HUMAN_AGENT_STATE: HumanAgentState = {
  isConnecting: false,
  isReconnecting: false,
  numUnreadMessages: 0,
  fileUploadInProgress: false,
  showScreenShareRequest: false,
  isScreenSharing: false,
  isHumanAgentTyping: false,
  inputState: DEFAULT_INPUT_STATE(),
};
deepFreeze(DEFAULT_HUMAN_AGENT_STATE);

const DEFAULT_THEME_STATE: ThemeState = {
  carbonTheme: CarbonTheme.G10,
  useAITheme: false,
  corners: CornersType.ROUND,
};
deepFreeze(DEFAULT_THEME_STATE);

const DEFAULT_LAYOUT_STATE: LayoutConfig = {
  showFrame: true,
  hasContentMaxWidth: true,
};
deepFreeze(DEFAULT_LAYOUT_STATE);

/**
 * Determines the {@link AnnounceMessage} to show based on a potential change in the visibility of the widget. If the
 * widget is either opened or closed, an announcement should be made and this will set that announcement. If the state
 * of the widget hasn't changed, this will return the current announcement unchanged.
 *
 * @param previousState The previous state of the application.
 * @param newViewState Indicates the widgets new view state.
 */
function calcAnnouncementForWidgetOpen(
  previousState: AppState,
  newViewState: ViewState,
): AnnounceMessage {
  if (
    isEqual(
      previousState.persistedToBrowserStorage.launcherState.viewState,
      newViewState,
    )
  ) {
    // No change in the view state so return the current announcement.
    return previousState.announceMessage;
  }

  // The view has changed so show the appropriate message.
  return {
    messageID: newViewState.mainWindow
      ? "window_ariaWindowOpened"
      : "window_ariaWindowClosed",
  };
}

/**
 * Returns a new state that has the {@link ChatMessagesState} modified for the given chat type with the new properties.
 * If the chat state is for a thread, then the thread that is currently being viewed will be modified.
 */
function applyBotMessageState(
  state: AppState,
  newState: Partial<ChatMessagesState>,
): AppState {
  return {
    ...state,
    botMessageState: {
      ...state.botMessageState,
      ...newState,
    },
  };
}

function handleViewStateChange(
  state: AppState,
  viewState: ViewState,
): AppState {
  // If the main window is opened and the page is visible, mark any unread messages as read.
  let { humanAgentState } = state;
  let { showUnreadIndicator } = state.persistedToBrowserStorage.launcherState;
  if (viewState.mainWindow && state.isBrowserPageVisible) {
    if (humanAgentState.numUnreadMessages !== 0) {
      humanAgentState = {
        ...humanAgentState,
        numUnreadMessages: 0,
      };
    }
    showUnreadIndicator = false;
  }

  return {
    ...state,
    announceMessage: calcAnnouncementForWidgetOpen(state, viewState),
    humanAgentState,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      launcherState: {
        ...state.persistedToBrowserStorage.launcherState,
        viewState,
        showUnreadIndicator,
      },
    },
  };
}

function setHomeScreenOpenState(
  state: AppState,
  isOpen: boolean,
  showBackToBot?: boolean,
): AppState {
  if (showBackToBot === undefined) {
    showBackToBot =
      state.persistedToBrowserStorage.chatState.homeScreenState.showBackToBot;
  }
  return {
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      chatState: {
        ...state.persistedToBrowserStorage.chatState,
        homeScreenState: {
          ...state.persistedToBrowserStorage.chatState.homeScreenState,
          isHomeScreenOpen: isOpen,
          showBackToBot,
        },
      },
    },
  };
}

/**
 * Sets the give property of the {@link LocalMessageUIState} associated with the message of the given ID to the
 * given value.
 *
 * @param state The current state to change.
 * @param localMessageID The ID of the message to update.
 * @param propertyName The name of the property to update.
 * @param propertyValue The value to set on the property.
 */
function applyLocalMessageUIState<
  TPropertyName extends keyof LocalMessageUIState,
>(
  state: AppState,
  localMessageID: string,
  propertyName: TPropertyName,
  propertyValue: LocalMessageUIState[TPropertyName],
) {
  const oldMessage = state.allMessageItemsByID[localMessageID];
  if (oldMessage) {
    return {
      ...state,
      allMessageItemsByID: {
        ...state.allMessageItemsByID,
        [localMessageID]: {
          ...oldMessage,
          ui_state: {
            ...oldMessage.ui_state,
            [propertyName]: propertyValue,
          },
        },
      },
    };
  }
  return state;
}

/**
 * Adds the given full message to the redux store. This will add it global to the global map as well as add the
 * id to the specific chat type.
 */
function applyFullMessage(state: AppState, message: Message): AppState {
  // Add the original message to the global map.
  const newState = {
    ...state,
    allMessagesByID: {
      ...state.allMessagesByID,
      [message.id]: message,
    },
  };

  // Now add the full message ID to the specific ChatMessagesState but only if it's a new message.
  if (!state.allMessagesByID[message.id]) {
    const currentMessageIDs = state.botMessageState.messageIDs;
    const newMessageIDs = [...currentMessageIDs, message.id];
    return applyBotMessageState(newState, { messageIDs: newMessageIDs });
  }

  return newState;
}

export {
  DEFAULT_HUMAN_AGENT_STATE,
  DEFAULT_MESSAGE_STATE,
  DEFAULT_CHAT_MESSAGES_STATE,
  DEFAULT_PERSISTED_TO_BROWSER,
  VIEW_STATE_ALL_CLOSED,
  VIEW_STATE_MAIN_WINDOW_OPEN,
  VIEW_STATE_LAUNCHER_OPEN,
  DEFAULT_IFRAME_PANEL_STATE,
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
  DEFAULT_LAUNCHER,
  DEFAULT_MESSAGE_PANEL_STATE,
  DEFAULT_THEME_STATE,
  DEFAULT_LAYOUT_STATE,
  DEFAULT_INPUT_STATE,
  setHomeScreenOpenState,
  applyBotMessageState,
  handleViewStateChange,
  applyFullMessage,
  applyLocalMessageUIState,
};

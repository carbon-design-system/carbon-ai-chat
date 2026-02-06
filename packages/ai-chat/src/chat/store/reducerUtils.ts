/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from "lodash-es/isEqual.js";

import { VERSION } from "../utils/environmentVariables";
import {
  AnnounceMessage,
  AppState,
  AppStateMessages,
  ChatMessagesState,
  CustomPanelState,
  WorkspacePanelState,
  HumanAgentState,
  IFramePanelState,
  InputState,
  MessagePanelState,
  ThemeState,
  ViewSourcePanelState,
  ViewState,
  PersistedState,
} from "../../types/state/AppState";
import {
  DefaultCustomPanelConfigOptions,
  WorkspaceCustomPanelConfigOptions,
  PanelType,
  PanelConfigOptionsByType,
} from "../../types/instance/apiTypes";
import {
  LauncherConfig,
  TIME_TO_ENTRANCE_ANIMATION_START,
} from "../../types/config/LauncherConfig";
import {
  CornersType,
  DEFAULT_CUSTOM_PANEL_ID,
  WORKSPACE_CUSTOM_PANEL_ID,
} from "../utils/constants";
import { deepFreeze } from "../utils/lang/objectUtils";
import {
  HeaderConfig,
  LayoutConfig,
  MinimizeButtonIconType,
} from "../../types/config/PublicConfig";
import { LocalMessageUIState } from "../../types/messaging/LocalMessageItem";
import { Message } from "../../types/messaging/Messages";

/**
 * Miscellaneous utilities to help in reducers.
 */

const DEFAULT_HEADER: HeaderConfig = {
  isOn: true,
  minimizeButtonIconType: MinimizeButtonIconType.MINIMIZE,
  showAiLabel: true,
};

deepFreeze(DEFAULT_HEADER);

const DEFAULT_LAUNCHER: LauncherConfig = {
  isOn: true,
  mobile: {
    isOn: false,
    title: "",
    timeToExpand: TIME_TO_ENTRANCE_ANIMATION_START,
  },
  desktop: {
    isOn: false,
    title: "",
    timeToExpand: TIME_TO_ENTRANCE_ANIMATION_START,
  },
};
deepFreeze(DEFAULT_LAUNCHER);

const DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS: DefaultCustomPanelConfigOptions = {
  hideBackButton: false,
  disableAnimation: false,
  fullWidth: false,
  backButtonType: "minimize",
};
deepFreeze(DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS);

const WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS: WorkspaceCustomPanelConfigOptions =
  {
    preferredLocation: "end",
  };
deepFreeze(WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS);

const PANEL_CONFIG_OPTIONS_BY_TYPE: PanelConfigOptionsByType = {
  [PanelType.DEFAULT]: DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
  [PanelType.WORKSPACE]: WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS,
};
deepFreeze(PANEL_CONFIG_OPTIONS_BY_TYPE);

const DEFAULT_CUSTOM_PANEL_STATE: CustomPanelState = {
  isOpen: false,
  panelID: DEFAULT_CUSTOM_PANEL_ID,
  options: DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
};
deepFreeze(DEFAULT_CUSTOM_PANEL_STATE);

const DEFAULT_WORKSPACE_PANEL_STATE: WorkspacePanelState = {
  isOpen: false,
  panelID: WORKSPACE_CUSTOM_PANEL_ID,
  options: WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS,
};
deepFreeze(DEFAULT_WORKSPACE_PANEL_STATE);

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

const DEFAULT_INPUT_STATE: InputState = {
  rawValue: "",
  displayValue: "",
  fieldVisible: true,
  isDisabled: false,
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
};

deepFreeze(DEFAULT_INPUT_STATE);

const DEFAULT_PERSISTED_TO_BROWSER: PersistedState = {
  disclaimersAccepted: {},
  homeScreenState: {
    isHomeScreenOpen: false,
    showBackToAssistant: false,
  },
  humanAgentState: {
    isConnected: false,
    isSuspended: false,
    responseUserProfiles: {},
    responseUserProfile: null,
  },
  hasSentNonWelcomeMessage: false,
  wasLoadedFromBrowser: false,
  version: VERSION,
  viewState: VIEW_STATE_ALL_CLOSED,
  showUnreadIndicator: false,
  launcherIsExpanded: false,
  launcherShouldStartCallToActionCounterIfEnabled: true,
};
deepFreeze(DEFAULT_PERSISTED_TO_BROWSER);

const DEFAULT_HUMAN_AGENT_STATE: HumanAgentState = {
  // Volatile state (not persisted)
  isConnecting: false,
  isReconnecting: false,
  availability: null,
  numUnreadMessages: 0,
  fileUploadInProgress: false,
  activeLocalMessageID: null,
  showScreenShareRequest: false,
  isScreenSharing: false,
  isHumanAgentTyping: false,
  inputState: DEFAULT_INPUT_STATE,
};
deepFreeze(DEFAULT_HUMAN_AGENT_STATE);

const DEFAULT_CHAT_MESSAGES_STATE: ChatMessagesState = {
  localMessageIDs: [],
  messageIDs: [],
  activeResponseId: null,
  isMessageLoadingCounter: 0,
  isMessageLoadingText: undefined,
  isHydratingCounter: 0,
  isScrollAnchored: false,
};
deepFreeze(DEFAULT_CHAT_MESSAGES_STATE);

const DEFAULT_MESSAGE_STATE: AppStateMessages = {
  allMessageItemsByID: {},
  allMessagesByID: {},
  assistantMessageState: {
    ...DEFAULT_CHAT_MESSAGES_STATE,
  },
};
deepFreeze(DEFAULT_MESSAGE_STATE);

const DEFAULT_THEME_STATE: ThemeState = {
  derivedCarbonTheme: null,
  originalCarbonTheme: null,
  aiEnabled: true,
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
    isEqual(previousState.persistedToBrowserStorage.viewState, newViewState)
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
function applyAssistantMessageState(
  state: AppState,
  newState: Partial<ChatMessagesState>,
): AppState {
  return {
    ...state,
    assistantMessageState: {
      ...state.assistantMessageState,
      ...newState,
    },
  };
}

function handleViewStateChange(
  state: AppState,
  viewState: ViewState,
): AppState {
  // If the main window is opened and the page is visible, mark any unread messages as read.
  let { showUnreadIndicator } = state.persistedToBrowserStorage;
  let topHuman = state.humanAgentState;
  if (viewState.mainWindow && state.isBrowserPageVisible) {
    if (topHuman.numUnreadMessages !== 0) {
      topHuman = {
        ...topHuman,
        numUnreadMessages: 0,
      };
    }
    showUnreadIndicator = false;
  }

  return {
    ...state,
    humanAgentState: topHuman,
    announceMessage: calcAnnouncementForWidgetOpen(state, viewState),
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      viewState,
      showUnreadIndicator,
    },
  };
}

function setHomeScreenOpenState(
  state: AppState,
  isOpen: boolean,
  showBackToAssistant?: boolean,
): AppState {
  if (showBackToAssistant === undefined) {
    showBackToAssistant =
      state.persistedToBrowserStorage.homeScreenState.showBackToAssistant;
  }
  return {
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      homeScreenState: {
        ...state.persistedToBrowserStorage.homeScreenState,
        isHomeScreenOpen: isOpen,
        showBackToAssistant,
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
    const currentMessageIDs = state.assistantMessageState.messageIDs;
    const newMessageIDs = [...currentMessageIDs, message.id];
    return applyAssistantMessageState(newState, { messageIDs: newMessageIDs });
  }

  return newState;
}

export {
  DEFAULT_HEADER,
  DEFAULT_MESSAGE_STATE,
  DEFAULT_CHAT_MESSAGES_STATE,
  DEFAULT_PERSISTED_TO_BROWSER,
  DEFAULT_HUMAN_AGENT_STATE,
  VIEW_STATE_ALL_CLOSED,
  VIEW_STATE_MAIN_WINDOW_OPEN,
  VIEW_STATE_LAUNCHER_OPEN,
  DEFAULT_IFRAME_PANEL_STATE,
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_WORKSPACE_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
  WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS,
  PANEL_CONFIG_OPTIONS_BY_TYPE,
  DEFAULT_LAUNCHER,
  DEFAULT_MESSAGE_PANEL_STATE,
  DEFAULT_THEME_STATE,
  DEFAULT_LAYOUT_STATE,
  DEFAULT_INPUT_STATE,
  setHomeScreenOpenState,
  applyAssistantMessageState,
  handleViewStateChange,
  applyFullMessage,
  applyLocalMessageUIState,
};

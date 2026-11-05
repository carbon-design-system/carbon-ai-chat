/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from 'lodash-es/isEqual.js';

import { conversationActions, type PartitionReducer } from '../../sdk/internal';
import type { ConversationState } from '../../types/state/AppState';
import type { ViewPartitionState } from '../../types/state/ViewPartitionState';
import type { AnnounceMessage } from '../../types/state/AnnounceMessage';
import type { CatastrophicErrorPanelState } from '../../types/state/panels/CatastrophicErrorPanelState';
import type { PersistedState } from '../../types/state/PersistedState';
import type {
  CustomPanelConfigOptions,
  ViewState,
  WorkspaceCustomPanelConfigOptions,
} from '../../types/instance/apiTypes';
import type { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import type {
  ConversationalSearchItemCitation,
  IFrameItem,
  Message,
  SearchResult,
} from '../../types/messaging/Messages';
import { HumanAgentMessageType } from '../../types/messaging/Messages';
import {
  ACCEPTED_DISCLAIMER,
  ADD_IS_HYDRATING_COUNTER,
  ADD_IS_LOADING_COUNTER,
  ANNOUNCE_MESSAGE,
  CLOSE_IFRAME_PANEL,
  OPEN_IFRAME_CONTENT,
  RESET_IS_HYDRATING_COUNTER,
  RESET_IS_LOADING_COUNTER,
  SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN,
  SET_CUSTOM_PANEL_OPEN,
  SET_CUSTOM_PANEL_OPTIONS,
  SET_HISTORY_PANEL_OPEN,
  SET_HISTORY_PANEL_OPTIONS,
  SET_HOME_SCREEN_IS_OPEN,
  SET_INITIAL_VIEW_CHANGE_COMPLETE,
  SET_IS_BROWSER_PAGE_VISIBLE,
  SET_LAUNCHER_MINIMIZED,
  SET_LAUNCHER_PROPERTY,
  SET_RESPONSE_PANEL_CONTENT,
  SET_RESPONSE_PANEL_IS_OPEN,
  SET_VIEW_CHANGING,
  SET_VIEW_STATE,
  SET_WORKSPACE_PANEL_DATA,
  SET_WORKSPACE_PANEL_OPEN,
  SET_WORKSPACE_PANEL_OPTIONS,
  TOGGLE_HOME_SCREEN,
  UPDATE_CATASTROPHIC_ERROR_PANEL,
  SET_VIEW_VALUE,
} from './actions';
import {
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_IFRAME_PANEL_STATE,
  DEFAULT_WORKSPACE_PANEL_STATE,
  VIEW_STATE_LAUNCHER_OPEN,
} from './defaults';
import { createDefaultViewPersistedState } from './persisted';

/** Agent messages that never count as unread. */
const EXCLUDE_HUMAN_AGENT_UNREAD = new Set([
  HumanAgentMessageType.USER_ENDED_CHAT,
  HumanAgentMessageType.CHAT_WAS_ENDED,
  HumanAgentMessageType.RELOAD_WARNING,
]);

function setHomeScreenOpenState(
  state: ViewPartitionState,
  isOpen: boolean,
  showBackToAssistant?: boolean
): ViewPartitionState {
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

function calcAnnouncementForWidgetOpen(
  previousState: ViewPartitionState,
  newViewState: ViewState
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
      ? 'window_ariaWindowOpened'
      : 'window_ariaWindowClosed',
  };
}

function handleViewStateChange(
  state: ViewPartitionState,
  viewState: ViewState
): ViewPartitionState {
  // If the main window is opened and the page is visible, mark any unread messages as read.
  let { showUnreadIndicator } = state.persistedToBrowserStorage;
  let { numUnreadMessages } = state;
  if (viewState.mainWindow && state.isBrowserPageVisible) {
    numUnreadMessages = 0;
    showUnreadIndicator = false;
  }

  return {
    ...state,
    numUnreadMessages,
    announceMessage: calcAnnouncementForWidgetOpen(state, viewState),
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      viewState,
      showUnreadIndicator,
    },
  };
}

type ViewReducer = (
  state: ViewPartitionState,
  action: any
) => ViewPartitionState;

const viewReducers: Record<string, ViewReducer> = {
  [SET_VIEW_VALUE]: (
    state: ViewPartitionState,
    action: { key: keyof ViewPartitionState; value: unknown }
  ) => ({ ...state, [action.key]: action.value }),

  [RESET_IS_LOADING_COUNTER]: (state: ViewPartitionState) => ({
    ...state,
    isMessageLoadingCounter: 0,
    isMessageLoadingText: undefined,
  }),

  [ADD_IS_LOADING_COUNTER]: (
    state: ViewPartitionState,
    action: { addToIsLoading: number; message?: string }
  ) => {
    const isMessageLoadingCounter = Math.max(
      state.isMessageLoadingCounter + action.addToIsLoading,
      0
    );
    return {
      ...state,
      isMessageLoadingCounter,
      isMessageLoadingText:
        isMessageLoadingCounter > 0 && action.message
          ? action.message
          : undefined,
    };
  },

  [RESET_IS_HYDRATING_COUNTER]: (state: ViewPartitionState) => ({
    ...state,
    isHydratingCounter: 0,
  }),

  [ADD_IS_HYDRATING_COUNTER]: (
    state: ViewPartitionState,
    action: { addToIsHydrating: number }
  ) => ({
    ...state,
    isHydratingCounter: Math.max(
      state.isHydratingCounter + action.addToIsHydrating,
      0
    ),
  }),

  [SET_IS_BROWSER_PAGE_VISIBLE]: (
    state: ViewPartitionState,
    action: { isVisible: boolean }
  ) => {
    // If the page becomes visible while the main window is open, then clear the number of unread messages.
    const isMainWindowOpen =
      state.persistedToBrowserStorage.viewState.mainWindow;
    return {
      ...state,
      isBrowserPageVisible: action.isVisible,
      numUnreadMessages:
        isMainWindowOpen && action.isVisible ? 0 : state.numUnreadMessages,
    };
  },

  [UPDATE_CATASTROPHIC_ERROR_PANEL]: (
    state: ViewPartitionState,
    action: { panelState: Partial<CatastrophicErrorPanelState> }
  ): ViewPartitionState => ({
    ...state,
    catastrophicErrorPanelState: {
      ...state.catastrophicErrorPanelState,
      ...action.panelState,
    },
  }),

  [SET_VIEW_STATE]: (
    state: ViewPartitionState,
    action: { viewState: ViewState }
  ): ViewPartitionState => {
    return handleViewStateChange(state, action.viewState);
  },

  [SET_VIEW_CHANGING]: (
    state: ViewPartitionState,
    action: { viewChanging: boolean }
  ): ViewPartitionState => ({
    ...state,
    viewChanging: action.viewChanging,
  }),

  [SET_INITIAL_VIEW_CHANGE_COMPLETE]: (
    state: ViewPartitionState,
    action: { changeComplete: boolean }
  ): ViewPartitionState => ({
    ...state,
    initialViewChangeComplete: action.changeComplete,
  }),

  [ANNOUNCE_MESSAGE]: (
    state: ViewPartitionState,
    action: { message: AnnounceMessage }
  ): ViewPartitionState => ({
    ...state,
    announceMessage: action.message,
  }),

  [ACCEPTED_DISCLAIMER]: (state: ViewPartitionState): ViewPartitionState => ({
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      disclaimersAccepted: {
        ...state.persistedToBrowserStorage.disclaimersAccepted,
        [isBrowser() ? window.location.hostname : 'localhost']: true,
      },
    },
  }),

  [SET_HOME_SCREEN_IS_OPEN]: (
    state: ViewPartitionState,
    { isOpen }: { isOpen: boolean }
  ) => setHomeScreenOpenState(state, isOpen),

  [TOGGLE_HOME_SCREEN]: (state: ViewPartitionState) => {
    const isCurrentlyOpen =
      state.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen;
    // Only show "back to assistant" button when manually navigating back to home screen (not closing it)
    return setHomeScreenOpenState(
      state,
      !isCurrentlyOpen,
      !isCurrentlyOpen // true when opening, false when closing
    );
  },

  [SET_LAUNCHER_PROPERTY]: <TPropertyName extends keyof PersistedState>(
    state: ViewPartitionState,
    action: {
      propertyName: TPropertyName;
      propertyValue: PersistedState[TPropertyName];
    }
  ) => {
    return {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        [action.propertyName]: action.propertyValue,
      },
    };
  },

  [SET_LAUNCHER_MINIMIZED]: (state: ViewPartitionState) => {
    return {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        launcherIsExpanded: false,
      },
    };
  },

  [OPEN_IFRAME_CONTENT]: (
    state: ViewPartitionState,
    { messageItem }: { messageItem: IFrameItem }
  ) => {
    return {
      ...state,
      iFramePanelState: {
        ...state.iFramePanelState,
        messageItem,
        isOpen: true,
      },
      announceMessage: {
        messageID: 'iframe_ariaOpenedPanel',
      },
    };
  },

  [CLOSE_IFRAME_PANEL]: (state: ViewPartitionState) => {
    return {
      ...state,
      iFramePanelState: {
        ...state.iFramePanelState,
        isOpen: false,
      },
      announceMessage: {
        messageID: 'iframe_ariaClosedPanel',
      },
    };
  },

  [SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN]: (
    state: ViewPartitionState,
    action: {
      isOpen: boolean;
      citationItem: ConversationalSearchItemCitation;
      relatedSearchResult: SearchResult;
    }
  ) => {
    return {
      ...state,
      viewSourcePanelState: {
        ...state.viewSourcePanelState,
        citationItem: action.citationItem,
        relatedSearchResult: action.relatedSearchResult,
        isOpen: action.isOpen,
      },
    };
  },

  [SET_CUSTOM_PANEL_OPEN]: (
    state: ViewPartitionState,
    action: { isOpen: boolean }
  ) => {
    return {
      ...state,
      customPanelState: {
        ...state.customPanelState,
        isOpen: action.isOpen,
      },
    };
  },

  [SET_CUSTOM_PANEL_OPTIONS]: (
    state: ViewPartitionState,
    action: { options: CustomPanelConfigOptions }
  ) => {
    return {
      ...state,
      customPanelState: {
        ...state.customPanelState,
        options: action.options,
      },
    };
  },

  [SET_WORKSPACE_PANEL_OPEN]: (
    state: ViewPartitionState,
    action: { isOpen: boolean }
  ) => {
    // When closing the panel, reset the workspace panel state to default
    if (!action.isOpen) {
      return {
        ...state,
        workspacePanelState: {
          ...DEFAULT_WORKSPACE_PANEL_STATE,
          isOpen: false,
        },
      };
    }

    return {
      ...state,
      workspacePanelState: {
        ...state.workspacePanelState,
        isOpen: action.isOpen,
      },
    };
  },

  [SET_WORKSPACE_PANEL_OPTIONS]: (
    state: ViewPartitionState,
    action: { options: Partial<WorkspaceCustomPanelConfigOptions> }
  ) => {
    return {
      ...state,
      workspacePanelState: {
        ...state.workspacePanelState,
        options: {
          ...(state.workspacePanelState.options ?? {}),
          ...action.options,
        },
      },
    };
  },

  [SET_WORKSPACE_PANEL_DATA]: (
    state: ViewPartitionState,
    action: {
      workspaceID?: string;
      localMessageItem?: LocalMessageItem;
      fullMessage?: Message;
      additionalData?: unknown;
    }
  ) => {
    return {
      ...state,
      workspacePanelState: {
        ...state.workspacePanelState,
        workspaceID: action.workspaceID,
        localMessageItem: action.localMessageItem,
        fullMessage: action.fullMessage,
        additionalData: action.additionalData,
      },
    };
  },

  [SET_HISTORY_PANEL_OPEN]: (
    state: ViewPartitionState,
    action: { isOpen: boolean }
  ): ViewPartitionState => {
    if (!action.isOpen) {
      return {
        ...state,
        historyPanelState: {
          ...state.historyPanelState,
          isOpen: false,
        },
      };
    }

    return {
      ...state,
      historyPanelState: {
        ...state.historyPanelState,
        isOpen: action.isOpen,
      },
    };
  },

  [SET_HISTORY_PANEL_OPTIONS]: (
    state: ViewPartitionState,
    action: { isMobile: boolean; isOpen?: boolean }
  ): ViewPartitionState => {
    return {
      ...state,
      historyPanelState: {
        ...state.historyPanelState,
        isMobile: action.isMobile,
        isOpen: action.isOpen ?? state.historyPanelState.isOpen,
      },
    };
  },

  [SET_RESPONSE_PANEL_IS_OPEN]: (
    state: ViewPartitionState,
    { isOpen }: { isOpen: boolean }
  ) => {
    return {
      ...state,
      responsePanelState: {
        ...state.responsePanelState,
        isOpen,
      },
    };
  },

  [SET_RESPONSE_PANEL_CONTENT]: (
    state: ViewPartitionState,
    {
      localMessageItem,
      isMessageForInput,
    }: { localMessageItem: LocalMessageItem; isMessageForInput: boolean }
  ) => {
    return {
      ...state,
      responsePanelState: {
        ...state.responsePanelState,
        localMessageItem,
        isMessageForInput,
      },
    };
  },
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

/**
 * A local item became visible: the home screen closes, and an agent message
 * that arrived out of sight counts as unread.
 */
function itemShown(
  state: ViewPartitionState,
  messageItem: LocalMessageItem,
  message: Message
): ViewPartitionState {
  let next = state;
  if (next.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen) {
    // When a message has been sent, we don't want the home screen open anymore.
    next = setHomeScreenOpenState(next, false);
  }

  const agentMessageType = messageItem.item.agent_message_type;
  const isMainWindowOpen = state.persistedToBrowserStorage.viewState.mainWindow;
  if (
    agentMessageType &&
    (!isMainWindowOpen || !state.isBrowserPageVisible) &&
    // A request has an input; only messages from the agent count.
    (message as { input?: unknown }).input === undefined &&
    !EXCLUDE_HUMAN_AGENT_UNREAD.has(agentMessageType)
  ) {
    next = { ...next, numUnreadMessages: next.numUnreadMessages + 1 };
  }
  return next;
}

/** Whether the conversation shows any item of this message. */
function hasShownItem(after: ConversationState, messageID: string) {
  return after.assistantMessageState.localMessageIDs.some(
    (id) => after.allMessageItemsByID[id]?.fullMessageID === messageID
  );
}

interface UpsertAction {
  message: Message;
  isStreaming?: boolean;
  options?: {
    origin?: string;
    received?: { localItem?: LocalMessageItem };
  };
}

function reactToUpsert(
  state: ViewPartitionState,
  { message, isStreaming = false, options }: UpsertAction,
  after: ConversationState
): ViewPartitionState {
  // Only responses are written, and a chunk stream shows items on its own path.
  if (
    (message as { output?: unknown }).output === undefined ||
    (options?.origin === 'chunk' && isStreaming)
  ) {
    return state;
  }
  if (options?.received) {
    const { localItem } = options.received;
    return localItem && !message.history?.silent
      ? itemShown(state, localItem, message)
      : state;
  }
  if (
    state.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen &&
    hasShownItem(after, message.id)
  ) {
    return setHomeScreenOpenState(state, false);
  }
  return state;
}

function resetPanels(
  state: ViewPartitionState,
  after: ConversationState
): ViewPartitionState {
  const next: ViewPartitionState = {
    ...state,
    iFramePanelState: { ...DEFAULT_IFRAME_PANEL_STATE },
    viewSourcePanelState: { ...DEFAULT_CITATION_PANEL_STATE },
    customPanelState: { ...DEFAULT_CUSTOM_PANEL_STATE },
    workspacePanelState: { ...DEFAULT_WORKSPACE_PANEL_STATE },
    catastrophicErrorType: null,
    catastrophicErrorPanelState: {
      ...state.catastrophicErrorPanelState,
      isOpen: false,
    },
  };
  // The store holds the host's whole config; the home screen is view config.
  const { homescreen } = after.config.public as {
    homescreen?: { isOn?: boolean };
  };
  return homescreen?.isOn ? setHomeScreenOpenState(next, true, false) : next;
}

/** Applies the saved fields that belong to the view half. */
function updateSavedView(
  state: ViewPartitionState,
  chatState: Partial<PersistedState>
): ViewPartitionState {
  const entries = Object.entries(chatState).filter(
    ([key]) => key in state.persistedToBrowserStorage
  );
  return entries.length
    ? {
        ...state,
        persistedToBrowserStorage: {
          ...state.persistedToBrowserStorage,
          ...Object.fromEntries(entries),
        },
      }
    : state;
}

/**
 * The view's reactions to conversation actions. Each one keeps a view effect
 * that a conversation reducer had, so one dispatch still changes both.
 */
function reactToConversation(
  state: ViewPartitionState,
  action: any,
  after: ConversationState
): ViewPartitionState {
  switch (action.type) {
    case conversationActions.RESTART_CONVERSATION:
      return resetPanels(state, after);
    case conversationActions.ADD_LOCAL_MESSAGE_ITEM:
      return action.message.history?.silent
        ? state
        : itemShown(state, action.messageItem, action.message);
    case conversationActions.UPSERT_MESSAGE:
      return reactToUpsert(state, action, after);
    case conversationActions.HA_SET_IS_CONNECTING:
      // When connecting, clear any unread messages from a previous conversation.
      return action.isConnecting && state.numUnreadMessages !== 0
        ? { ...state, numUnreadMessages: 0 }
        : state;
    case conversationActions.RESET_PERSISTED_STATE:
      return {
        ...state,
        persistedToBrowserStorage: {
          ...createDefaultViewPersistedState(),
          viewState: action.keepOpenState
            ? state.persistedToBrowserStorage.viewState
            : VIEW_STATE_LAUNCHER_OPEN,
        },
      };
    case conversationActions.UPDATE_PERSISTED_STATE:
      return updateSavedView(state, action.chatState);
    default:
      return state;
  }
}

/**
 * The view partition's reducer: its own actions, then its reactions to the
 * conversation action, with the conversation state after that action.
 */
const viewReducer: PartitionReducer<ViewPartitionState, ConversationState> = (
  state,
  action,
  after
) => {
  const own = viewReducers[action.type];
  return reactToConversation(own ? own(state, action) : state, action, after);
};

export { viewReducer };

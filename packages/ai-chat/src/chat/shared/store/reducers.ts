/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import merge from "lodash-es/merge.js";
import mergeWith from "lodash-es/mergeWith.js";
import { DeepPartial } from "ts-essentials";

import { ChatHeaderConfig } from "../../../types/config/ChatHeaderConfig";
import { outputItemToLocalItem } from "../schema/outputItemToLocalItem";
import { AppConfig } from "../../../types/state/AppConfig";
import {
  AnnounceMessage,
  AppState,
  AppStateMessages,
  ChatMessagesState,
  CustomPanelConfigOptions,
  FileUpload,
  InputState,
  PersistedChatState,
  PersistedLauncherState,
  ViewState,
} from "../../../types/state/AppState";
import {
  LauncherConfig,
  LauncherInternalCallToActionConfig,
} from "../../../types/config/LauncherConfig";
import {
  LocalMessageItem,
  LocalMessageUIState,
} from "../../../types/messaging/LocalMessageItem";
import ObjectMap from "../../../types/utilities/ObjectMap";
import { FileStatusValue } from "../utils/constants";
import { replaceCurrentArrayValue } from "../utils/customizers";
import { isRequest, isResponse, streamItemID } from "../utils/messageUtils";
import {
  ACCEPTED_DISCLAIMER,
  ADD_INPUT_FILE,
  ADD_IS_HYDRATING_COUNTER,
  ADD_IS_LOADING_COUNTER,
  ADD_IS_TYPING_COUNTER,
  ADD_LOCAL_MESSAGE_ITEM,
  ADD_MESSAGE,
  ADD_NESTED_MESSAGES,
  ADD_NOTIFICATION,
  ANNOUNCE_MESSAGE,
  CHANGE_STATE,
  CHANGE_STEP_IN_TOUR,
  CLEAR_INPUT_FILES,
  CLEAR_TOUR_DATA,
  CLOSE_IFRAME_PANEL,
  FILE_UPLOAD_INPUT_ERROR,
  HYDRATE_CHAT,
  HYDRATE_MESSAGE_HISTORY,
  MERGE_HISTORY,
  MESSAGE_SET_OPTION_SELECTED,
  OPEN_IFRAME_CONTENT,
  REMOVE_ALL_NOTIFICATIONS,
  REMOVE_INPUT_FILE,
  REMOVE_LOCAL_MESSAGE_ITEM,
  REMOVE_MESSAGES,
  REMOVE_NOTIFICATIONS,
  RESTART_CONVERSATION,
  SET_APP_STATE_VALUE,
  SET_CHAT_MESSAGES_PROPERTY,
  SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN,
  SET_CUSTOM_PANEL_OPEN,
  SET_CUSTOM_PANEL_OPTIONS,
  SET_HOME_SCREEN_IS_OPEN,
  SET_INITIAL_VIEW_CHANGE_COMPLETE,
  SET_IS_BROWSER_PAGE_VISIBLE,
  SET_LAUNCHER_CONFIG_PROPERTY,
  SET_LAUNCHER_MINIMIZED,
  SET_LAUNCHER_PROPERTY,
  SET_MESSAGE_HISTORY_PROPERTY,
  SET_MESSAGE_UI_STATE_INTERNAL_PROPERTY,
  SET_MESSAGE_UI_PROPERTY,
  SET_RESPONSE_PANEL_CONTENT,
  SET_RESPONSE_PANEL_IS_OPEN,
  SET_STOP_STREAMING_BUTTON_DISABLED,
  SET_STOP_STREAMING_BUTTON_VISIBLE,
  SET_STREAM_ID,
  SET_TOUR_DATA,
  SET_VIEW_CHANGING,
  SET_VIEW_STATE,
  STREAMING_ADD_CHUNK,
  STREAMING_MERGE_HISTORY,
  STREAMING_START,
  TOGGLE_HOME_SCREEN,
  UPDATE_BOT_AVATAR_URL,
  UPDATE_BOT_NAME,
  UPDATE_CHAT_HEADER_CONFIG,
  UPDATE_CSS_VARIABLES,
  UPDATE_HAS_SENT_NON_WELCOME_MESSAGE,
  UPDATE_HOME_SCREEN_CONFIG,
  UPDATE_INPUT_STATE,
  UPDATE_LAUNCHER_AVATAR_URL,
  UPDATE_LAUNCHER_CONFIG,
  UPDATE_LOCAL_MESSAGE_ITEM,
  UPDATE_MAIN_HEADER_AVATAR,
  UPDATE_MAIN_HEADER_TITLE,
  UPDATE_MAX_VISIBLE_HEADER_OBJECTS,
  UPDATE_MESSAGE,
  UPDATE_PERSISTED_CHAT_STATE,
} from "./actions";
import { humanAgentReducers } from "./humanAgentReducers";
import {
  applyBotMessageState,
  applyFullMessage,
  applyLocalMessageUIState,
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_IFRAME_PANEL_STATE,
  handleViewStateChange,
  setHomeScreenOpenState,
} from "./reducerUtils";
import { clearTourState, populateTourStepItems } from "./tourReducerUtils";
import { ChatHeaderAvatarConfig } from "../../../types/instance/ChatInstance";
import {
  HumanAgentMessageType,
  ConversationalSearchItemCitation,
  GenericItem,
  IFrameItem,
  Message,
  MessageHistory,
  MessageRequest,
  MessageResponse,
  SearchResult,
  MessageUIStateInternal,
} from "../../../types/messaging/Messages";
import { WhiteLabelTheme } from "../../../types/config/PublicConfig";
import { HomeScreenConfig } from "../../../types/config/HomeScreenConfig";
import {
  LauncherType,
  NotificationMessage,
} from "../../../types/instance/apiTypes";

type ReducerType = (state: AppState, action?: any) => AppState;

// The set of agent message types that should be excluded on the unread agent message count.
const EXCLUDE_HUMAN_AGENT_UNREAD = new Set([
  HumanAgentMessageType.USER_ENDED_CHAT,
  HumanAgentMessageType.CHAT_WAS_ENDED,
  HumanAgentMessageType.RELOAD_WARNING,
]);

const reducers: { [key: string]: ReducerType } = {
  [CHANGE_STATE]: (
    state: AppState,
    action: { partialState: DeepPartial<AppState> }
  ): AppState => merge({}, state, action.partialState),

  [HYDRATE_CHAT]: (state: AppState): AppState => ({
    ...state,
    isHydrated: true,
  }),

  [RESTART_CONVERSATION]: (state: AppState): AppState => {
    let newState: AppState = {
      ...state,
      botMessageState: {
        ...state.botMessageState,
        localMessageIDs: [],
        messageIDs: [],
        isTypingCounter: 0,
        isScrollAnchored: false,
      },
      allMessageItemsByID: {},
      allMessagesByID: {},
      iFramePanelState: {
        ...DEFAULT_IFRAME_PANEL_STATE,
      },
      viewSourcePanelState: {
        ...DEFAULT_CITATION_PANEL_STATE,
      },
      customPanelState: {
        ...DEFAULT_CUSTOM_PANEL_STATE,
      },
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        chatState: {
          ...state.persistedToBrowserStorage.chatState,
          homeScreenState: {
            ...state.persistedToBrowserStorage.chatState.homeScreenState,
            showBackToBot: false,
          },
        },
      },
      isHydrated: false,
      catastrophicErrorType: null,
    };
    // Clear the tour state on restart.
    newState = clearTourState(newState);
    if (newState.homeScreenConfig.is_on) {
      newState = setHomeScreenOpenState(newState, true);
    }
    return newState;
  },

  [HYDRATE_MESSAGE_HISTORY]: (
    state: AppState,
    action: { messageHistory: AppStateMessages }
  ): AppState => {
    let newState = {
      ...state,
      ...action.messageHistory,
    };

    // If there's an active tour then use the new state with message history to populate the tour state.
    if (
      state.persistedToBrowserStorage.chatState.persistedTourState.activeTourID
    ) {
      newState = populateTourStepItems(newState);
    }
    return newState;
  },

  [ADD_LOCAL_MESSAGE_ITEM]: (
    state: AppState,
    action: {
      messageItem: LocalMessageItem;
      message: Message;
      addMessage: boolean;
      addAfterID: string;
    }
  ): AppState => {
    const { messageItem, message, addMessage, addAfterID } = action;
    const { id } = messageItem.ui_state;

    // If we receive back a silent message, we don't want to add to the store.
    const isSilent = message.history.silent;
    let newState: AppState = state;

    if (addMessage) {
      newState = applyFullMessage(newState, message);
    }

    const currentIndex = newState.botMessageState.localMessageIDs.findIndex(
      (existingID) => existingID === id
    );
    const newLocalMessageIDs = [...newState.botMessageState.localMessageIDs];

    let insertAtIndex = currentIndex;

    if (currentIndex !== -1) {
      // Remove the ID from the array. We may insert it back at this index.
      newLocalMessageIDs.splice(currentIndex, 1);
    } else {
      // By default, insert the new ID at the end.
      insertAtIndex = newLocalMessageIDs.length;
    }

    // If an "addAfterID" was provided, use that to determine where to put this new ID.
    if (addAfterID) {
      const afterIDIndex = newLocalMessageIDs.findIndex(
        (existingID) => existingID === addAfterID
      );
      if (afterIDIndex !== -1) {
        insertAtIndex = afterIDIndex + 1;
      }
    }

    // Insert the ID.
    newLocalMessageIDs.splice(insertAtIndex, 0, id);

    if (!isSilent) {
      newState = {
        ...newState,
        allMessageItemsByID: {
          ...newState.allMessageItemsByID,
          [id]: messageItem,
        },
        botMessageState: {
          ...newState.botMessageState,
          localMessageIDs: newLocalMessageIDs,
        },
      };

      if (
        newState.persistedToBrowserStorage.chatState.homeScreenState
          .isHomeScreenOpen
      ) {
        // When a message has been sent, we don't want the home screen open anymore.
        newState = setHomeScreenOpenState(newState, false);
      }

      const isBotMessage = !messageItem.item.agent_message_type;
      const isMainWindowOpen =
        state.persistedToBrowserStorage.launcherState.viewState.mainWindow;
      if (!isBotMessage && (!isMainWindowOpen || !state.isBrowserPageVisible)) {
        // This message is with an agent, and it occurred while the main window was closed or the page is not
        // visible, so it may need to be counted as an unread message.
        const fromHumanAgent = !isRequest(message);
        if (
          fromHumanAgent &&
          !EXCLUDE_HUMAN_AGENT_UNREAD.has(messageItem.item.agent_message_type)
        ) {
          // If this message came from an agent, then add one to the unread count, but not if it's one of the excluded
          // types.
          newState = {
            ...newState,
            humanAgentState: {
              ...newState.humanAgentState,
              numUnreadMessages: newState.humanAgentState.numUnreadMessages + 1,
            },
          };
        }
      }
    }

    return newState;
  },

  [REMOVE_MESSAGES]: (
    state: AppState,
    { messageIDs }: { messageIDs: string[] }
  ): AppState => {
    const idsSet = new Set(messageIDs);

    const newAllMessages = { ...state.allMessagesByID };
    const newAllMessageItems = { ...state.allMessageItemsByID };

    // Remove all the message IDs from the message list.
    const newMessageIDs = state.botMessageState.messageIDs.filter(
      (messageID) => !idsSet.has(messageID)
    );

    // Remove all the message items from the items list for items that are part of one of the messages being
    // removed. Also remove the matching items from the map.
    const newMessageItemsIDs = state.botMessageState.localMessageIDs.filter(
      (messageItemID) => {
        const messageItem = newAllMessageItems[messageItemID];
        const removeItem = idsSet.has(messageItem?.fullMessageID);
        if (removeItem) {
          delete newAllMessageItems[messageItemID];
        }
        return !removeItem;
      }
    );

    // Remove the message objects from the map.
    messageIDs.forEach((messageID) => {
      delete newAllMessages[messageID];
    });

    const newState: AppState = {
      ...state,
      allMessagesByID: newAllMessages,
      allMessageItemsByID: newAllMessageItems,
      botMessageState: {
        ...state.botMessageState,
        messageIDs: newMessageIDs,
        localMessageIDs: newMessageItemsIDs,
      },
    };

    return newState;
  },

  [UPDATE_LOCAL_MESSAGE_ITEM]: (
    state: AppState,
    action: { messageItem: LocalMessageItem }
  ): AppState => {
    const { messageItem } = action;
    return {
      ...state,
      allMessageItemsByID: {
        ...state.allMessageItemsByID,
        [messageItem.ui_state.id]: messageItem,
      },
    };
  },

  [UPDATE_MESSAGE]: (
    state: AppState,
    action: { message: Message }
  ): AppState => {
    const { message } = action;
    return {
      ...state,
      allMessagesByID: {
        ...state.allMessagesByID,
        [message.id]: message,
      },
    };
  },

  [ADD_MESSAGE]: (state: AppState, action: { message: Message }): AppState => {
    const { message } = action;
    const messageID = message.id;

    let newState = state;

    if (isResponse(message)) {
      // For message responses, we need to re-order any items that may already be present in the store if they had
      // been added during a previous stream. We're going to use the following algorithm.
      //
      // 1. Locate the first item already in the list. This will be the insertion point for the re-ordered items.
      // 2. Remove all existing items from the list.
      // 3. Insert the new items back into the list at the insertion point but only items that were previously in
      //    the list.
      //
      // Example: if we've got response 1 with items 1.1 and 1.2, response 2 with items 2.1, 2.2, 2.3, and response 3
      // with 3.1. We start with.
      //
      //  [1.1, 1.2, 2.1, 2.2, 2.3, 3.1]
      //
      // Now, we "re-add" message 2 expect that we 2.1 and 2.2 are reversed in order and 2.3 and 2.4 is going to be
      // added ([2.2, 2.1, 2.4]).
      //
      // 1. The first item is "2.1" at index 2.
      // 2. Remove all items for response 2 giving us [1.1, 1.2, 3.1]
      // 3. Insert 2.1 and 2.2 (those were the only items we already had) back in the list at index 2 in the new order.
      //    item 2.4 will be inserted later as an individual item.
      //
      // Result: [1.1, 1.2, 2.2, 2.1, 3.1]

      // Get the ordered list of the new items. Only items with a stream ID can be re-ordered at this point.
      const itemIDsInNewMessage: string[] = [];
      message.output.generic.forEach((item) => {
        const id = streamItemID(messageID, item);
        if (id) {
          itemIDsInNewMessage.push(id);
        }
      });

      const newAllMessageItemsByID = { ...state.allMessageItemsByID };
      const existingItemIDs: string[] = [];
      let firstFoundIndex: number;

      // Remove all the existing items for this message. Also keep track of where the first one was found.
      const newLocalMessageIDs = state.botMessageState.localMessageIDs.filter(
        (itemID, index) => {
          const item = state.allMessageItemsByID[itemID];
          const isItemInMessage = item.fullMessageID === messageID;

          if (isItemInMessage) {
            if (firstFoundIndex === undefined) {
              firstFoundIndex = index;
            }
            if (!itemIDsInNewMessage.includes(itemID)) {
              // If this item is not in the new message, then remove the whole item object.
              delete newAllMessageItemsByID[itemID];
            } else {
              // Otherwise, this item will may get re-inserted back into the list (if it still exists).
              existingItemIDs.push(itemID);
            }
          }

          // Keep the item if it's not in the new message.
          return !isItemInMessage;
        }
      );

      // Now insert the message items back into the list at the right spot, but only the items we already had.
      if (existingItemIDs.length) {
        const itemIDsToInsert = itemIDsInNewMessage.filter((itemID) =>
          existingItemIDs.includes(itemID)
        );
        if (itemIDsToInsert.length) {
          newLocalMessageIDs.splice(firstFoundIndex, 0, ...itemIDsToInsert);
        }
      }

      newState = {
        ...newState,
        allMessageItemsByID: newAllMessageItemsByID,
        botMessageState: {
          ...newState.botMessageState,
          localMessageIDs: newLocalMessageIDs,
        },
      };
    }

    return applyFullMessage(newState, message);
  },

  [MESSAGE_SET_OPTION_SELECTED]: (
    state: AppState,
    action: { sentMessage: MessageRequest; messageID: string }
  ): AppState => {
    const newMessagesByID = {
      ...state.allMessageItemsByID,
    };
    newMessagesByID[action.messageID] = {
      ...state.allMessageItemsByID[action.messageID],
      ui_state: {
        ...state.allMessageItemsByID[action.messageID].ui_state,
        optionSelected: action.sentMessage,
      },
    };

    return {
      ...state,
      allMessageItemsByID: newMessagesByID,
    };
  },

  [ADD_IS_TYPING_COUNTER]: (
    state: AppState,
    action: { addToIsTyping: number }
  ): AppState => {
    return {
      ...state,
      botMessageState: {
        ...state.botMessageState,
        isTypingCounter: Math.max(
          state.botMessageState.isTypingCounter + action.addToIsTyping,
          0
        ),
      },
    };
  },

  [ADD_IS_LOADING_COUNTER]: (
    state: AppState,
    action: { addToIsLoading: number }
  ): AppState => {
    return {
      ...state,
      botMessageState: {
        ...state.botMessageState,
        isLoadingCounter: Math.max(
          state.botMessageState.isLoadingCounter + action.addToIsLoading,
          0
        ),
      },
    };
  },

  [ADD_IS_HYDRATING_COUNTER]: (
    state: AppState,
    action: { addToIsHydrating: number }
  ): AppState => {
    return {
      ...state,
      botMessageState: {
        ...state.botMessageState,
        isHydratingCounter: Math.max(
          state.botMessageState.isHydratingCounter + action.addToIsHydrating,
          0
        ),
      },
    };
  },

  [SET_APP_STATE_VALUE]: (
    state: AppState,
    action: { key: keyof AppState; value: any }
  ): AppState => ({
    ...state,
    [action.key]: action.value,
  }),

  [UPDATE_PERSISTED_CHAT_STATE]: (
    state: AppState,
    action: { chatState: Partial<PersistedChatState> }
  ): AppState => ({
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      chatState: {
        ...state.persistedToBrowserStorage.chatState,
        ...action.chatState,
      },
    },
  }),

  [UPDATE_HAS_SENT_NON_WELCOME_MESSAGE]: (
    state: AppState,
    action: { hasSentNonWelcomeMessage: boolean }
  ): AppState => {
    if (
      state.persistedToBrowserStorage.chatState.hasSentNonWelcomeMessage ===
      action.hasSentNonWelcomeMessage
    ) {
      return state;
    }
    return {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        chatState: {
          ...state.persistedToBrowserStorage.chatState,
          hasSentNonWelcomeMessage: action.hasSentNonWelcomeMessage,
        },
        launcherState: {
          ...state.persistedToBrowserStorage.launcherState,
          hasSentNonWelcomeMessage: action.hasSentNonWelcomeMessage,
        },
      },
    };
  },

  [SET_VIEW_STATE]: (
    state: AppState,
    action: { viewState: ViewState }
  ): AppState => {
    return handleViewStateChange(state, action.viewState);
  },

  [SET_VIEW_CHANGING]: (
    state: AppState,
    action: { viewChanging: boolean }
  ): AppState => ({
    ...state,
    viewChanging: action.viewChanging,
  }),

  [SET_INITIAL_VIEW_CHANGE_COMPLETE]: (
    state: AppState,
    action: { changeComplete: boolean }
  ): AppState => ({
    ...state,
    initialViewChangeComplete: action.changeComplete,
  }),

  [UPDATE_BOT_NAME]: (state: AppState, action: { name: string }): AppState => {
    return {
      ...state,
      botName: action.name,
      headerDisplayName: state.theme.useAITheme
        ? state.headerDisplayName
        : action.name,
    };
  },

  [UPDATE_BOT_AVATAR_URL]: (
    state: AppState,
    action: { url: string }
  ): AppState => ({
    ...state,
    botAvatarURL: action.url,
  }),

  [UPDATE_LAUNCHER_AVATAR_URL]: (
    state: AppState,
    action: { source: string }
  ): AppState => ({
    ...state,
    launcher: {
      ...state.launcher,
      config: {
        ...state.launcher.config,
        mobile: {
          ...state.launcher.config.mobile,
          avatar_url_override: action.source,
        },
        desktop: {
          ...state.launcher.config.desktop,
          avatar_url_override: action.source,
        },
      },
    },
  }),

  [UPDATE_MAIN_HEADER_TITLE]: (
    state: AppState,
    action: { title: null | string }
  ): AppState => ({
    ...state,
    headerDisplayName: action.title,
  }),

  [UPDATE_CSS_VARIABLES]: (
    state: AppState,
    action: {
      variables: ObjectMap<string>;
      publicVars: ObjectMap<string>;
      whiteLabelVariables: WhiteLabelTheme;
    }
  ): AppState => {
    const { config } = state;
    const { variables } = action;
    // Update css variables in app config with merged css variables.
    const newConfig: AppConfig = {
      public: {
        ...config.public,
      },
    };
    return {
      ...state,
      // This is modifying the original config objects. We may need to hold a reference to the original at some point.
      config: newConfig,
      cssVariableOverrides: variables,
    };
  },

  // Right now we just merge here. When we understand home screen enough to open up these values to a developer,
  // we will probably want to split this reducer into individual parts.
  [UPDATE_HOME_SCREEN_CONFIG]: (
    state: AppState,
    action: { homeScreenConfig: HomeScreenConfig }
  ): AppState => {
    // background_gradient is deprecated. When it's removed the following config manipulation function can be removed
    // and the merge in this reducer can go back to using action.homeScreenConfig for the new value instead of
    // newHomeScreenConfig.
    const newHomeScreenConfig = action.homeScreenConfig;

    return {
      ...state,
      homeScreenConfig: mergeWith(
        {},
        state.homeScreenConfig,
        newHomeScreenConfig,
        replaceCurrentArrayValue
      ),
    };
  },

  [SET_MESSAGE_UI_PROPERTY]: <TPropertyName extends keyof LocalMessageUIState>(
    state: AppState,
    action: {
      localMessageID: string;
      propertyName: TPropertyName;
      propertyValue: LocalMessageUIState[TPropertyName];
    }
  ): AppState => {
    return applyLocalMessageUIState(
      state,
      action.localMessageID,
      action.propertyName,
      action.propertyValue
    );
  },

  [SET_MESSAGE_HISTORY_PROPERTY]: <TPropertyName extends keyof MessageHistory>(
    state: AppState,
    action: {
      messageID: string;
      propertyName: TPropertyName;
      propertyValue: MessageHistory[TPropertyName];
    }
  ): AppState => {
    const { messageID, propertyName, propertyValue } = action;
    const oldMessage = state.allMessagesByID[messageID];
    if (oldMessage) {
      return {
        ...state,
        allMessagesByID: {
          ...state.allMessagesByID,
          [messageID]: {
            ...oldMessage,
            history: {
              ...oldMessage.history,
              [propertyName]: propertyValue,
            },
          },
        },
      };
    }
    return state;
  },

  [SET_MESSAGE_UI_STATE_INTERNAL_PROPERTY]: <
    TPropertyName extends keyof MessageUIStateInternal
  >(
    state: AppState,
    action: {
      messageID: string;
      propertyName: TPropertyName;
      propertyValue: MessageUIStateInternal[TPropertyName];
    }
  ): AppState => {
    const { messageID, propertyName, propertyValue } = action;
    const oldMessage = state.allMessagesByID[messageID];
    if (oldMessage) {
      return {
        ...state,
        allMessagesByID: {
          ...state.allMessagesByID,
          [messageID]: {
            ...oldMessage,
            ui_state_internal: {
              ...oldMessage.ui_state_internal,
              [propertyName]: propertyValue,
            },
          },
        },
      };
    }
    return state;
  },

  [MERGE_HISTORY]: (
    state: AppState,
    action: { messageID: string; history: MessageHistory }
  ): AppState => {
    const oldMessage = state.allMessagesByID[action.messageID];
    if (oldMessage) {
      return {
        ...state,
        allMessagesByID: {
          ...state.allMessagesByID,
          [action.messageID]: {
            ...oldMessage,
            history: merge({}, oldMessage.history, action.history),
          },
        },
      };
    }
    return state;
  },

  [ANNOUNCE_MESSAGE]: (
    state: AppState,
    action: { message: AnnounceMessage }
  ): AppState => ({
    ...state,
    announceMessage: action.message,
  }),

  [ACCEPTED_DISCLAIMER]: (state: AppState): AppState => ({
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      chatState: {
        ...state.persistedToBrowserStorage.chatState,
        disclaimersAccepted: {
          ...state.persistedToBrowserStorage.chatState.disclaimersAccepted,
          [window.location.hostname]: true,
        },
      },
    },
  }),

  [SET_HOME_SCREEN_IS_OPEN]: (
    state: AppState,
    { isOpen }: { isOpen: boolean }
  ) => setHomeScreenOpenState(state, isOpen),

  [TOGGLE_HOME_SCREEN]: (state: AppState) =>
    setHomeScreenOpenState(
      state,
      !state.persistedToBrowserStorage.chatState.homeScreenState
        .isHomeScreenOpen,
      true
    ),

  [UPDATE_LAUNCHER_CONFIG]: (
    state: AppState,
    action: { launcherConfig: LauncherConfig }
  ) => {
    const newConfig = merge({}, state.launcher.config, action.launcherConfig);
    return {
      ...state,
      launcher: {
        ...state.launcher,
        config: newConfig,
      },
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        launcherState: {
          ...state.persistedToBrowserStorage.launcherState,
          desktopLauncherIsExpanded:
            newConfig.is_on && newConfig.desktop.is_on
              ? state.persistedToBrowserStorage.launcherState
                  .desktopLauncherIsExpanded
              : false,
          mobileLauncherIsExtended:
            newConfig.is_on && newConfig.mobile.is_on
              ? state.persistedToBrowserStorage.launcherState
                  .mobileLauncherIsExtended
              : false,
        },
      },
    };
  },

  [SET_LAUNCHER_PROPERTY]: <TPropertyName extends keyof PersistedLauncherState>(
    state: AppState,
    action: {
      propertyName: TPropertyName;
      propertyValue: PersistedLauncherState[TPropertyName];
    }
  ) => {
    return {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        launcherState: {
          ...state.persistedToBrowserStorage.launcherState,
          [action.propertyName]: action.propertyValue,
        },
      },
    };
  },

  [SET_LAUNCHER_CONFIG_PROPERTY]: <
    TPropertyName extends keyof LauncherInternalCallToActionConfig
  >(
    state: AppState,
    action: {
      propertyName: TPropertyName;
      propertyValue: LauncherInternalCallToActionConfig[TPropertyName];
      launcherType?: LauncherType.DESKTOP | LauncherType.MOBILE;
    }
  ) => {
    const newState = {
      ...state,
      launcher: {
        ...state.launcher,
        config: {
          ...state.launcher.config,
        },
      },
    };

    if (!action.launcherType || action.launcherType === LauncherType.DESKTOP) {
      newState.launcher.config.desktop = {
        ...state.launcher.config.desktop,
        [action.propertyName]: action.propertyValue,
      };
    }

    if (!action.launcherType || action.launcherType === LauncherType.MOBILE) {
      newState.launcher.config.mobile = {
        ...state.launcher.config.mobile,
        [action.propertyName]: action.propertyValue,
      };
    }

    return newState;
  },

  [SET_CHAT_MESSAGES_PROPERTY]: <TPropertyName extends keyof ChatMessagesState>(
    state: AppState,
    action: {
      propertyName: TPropertyName;
      propertyValue: ChatMessagesState[TPropertyName];
    }
  ) => {
    return applyBotMessageState(state, {
      [action.propertyName]: action.propertyValue,
    });
  },

  [SET_LAUNCHER_MINIMIZED]: (state: AppState) => {
    return {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        launcherState: {
          ...state.persistedToBrowserStorage.launcherState,
          desktopLauncherIsExpanded: false,
          desktopLauncherWasMinimized: true,
        },
      },
    };
  },

  [OPEN_IFRAME_CONTENT]: (
    state: AppState,
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
        messageID: "iframe_ariaOpenedPanel",
      },
    };
  },

  [CLOSE_IFRAME_PANEL]: (state: AppState) => {
    return {
      ...state,
      iFramePanelState: {
        ...state.iFramePanelState,
        isOpen: false,
      },
      announceMessage: {
        messageID: "iframe_ariaClosedPanel",
      },
    };
  },

  [SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN]: (
    state: AppState,
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

  [SET_CUSTOM_PANEL_OPEN]: (state: AppState, action: { isOpen: boolean }) => {
    return {
      ...state,
      customPanelState: {
        ...state.customPanelState,
        isOpen: action.isOpen,
      },
    };
  },

  [SET_CUSTOM_PANEL_OPTIONS]: (
    state: AppState,
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

  [SET_TOUR_DATA]: (
    state: AppState,
    action: { newActiveTourMessageID: string }
  ): AppState => {
    const newStateWithPersistedTourData = {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        chatState: {
          ...state.persistedToBrowserStorage.chatState,
          persistedTourState: {
            activeTourID: action.newActiveTourMessageID,
            activeTourCurrentStepIndex: 0,
          },
        },
        launcherState: {
          ...state.persistedToBrowserStorage.launcherState,
          activeTour: true,
        },
      },
    };
    return populateTourStepItems(newStateWithPersistedTourData);
  },

  [CLEAR_TOUR_DATA]: (state: AppState): AppState => {
    return clearTourState(state);
  },

  [CHANGE_STEP_IN_TOUR]: (
    state: AppState,
    action: { newStepNumber: number }
  ): AppState => {
    return {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        chatState: {
          ...state.persistedToBrowserStorage.chatState,
          persistedTourState: {
            ...state.persistedToBrowserStorage.chatState.persistedTourState,
            activeTourCurrentStepIndex: Math.max(
              Math.min(
                action.newStepNumber,
                state.tourState.activeTourStepItems.length - 1
              ),
              0
            ),
          },
        },
      },
    };
  },

  [UPDATE_INPUT_STATE]: (
    state: AppState,
    action: { newState: Partial<InputState>; isInputToHumanAgent: boolean }
  ) => {
    const currentInputState = getInputState(state, action.isInputToHumanAgent);
    const newInputState = {
      ...currentInputState,
      ...action.newState,
    };
    const newState = applyInputState(
      state,
      newInputState,
      action.isInputToHumanAgent
    );
    return newState;
  },

  [SET_IS_BROWSER_PAGE_VISIBLE]: (
    state: AppState,
    action: { isVisible: boolean }
  ) => {
    // If the page becomes visible while the main window is open, then clear the number of unread messages.
    let numUnreadMessages;
    const isMainWindowOpen =
      state.persistedToBrowserStorage.launcherState.viewState.mainWindow;
    if (isMainWindowOpen && action.isVisible) {
      numUnreadMessages = 0;
    } else {
      numUnreadMessages = state.humanAgentState.numUnreadMessages;
    }

    return {
      ...state,
      isBrowserPageVisible: action.isVisible,
      humanAgentState: {
        ...state.humanAgentState,
        numUnreadMessages,
      },
    };
  },

  [ADD_INPUT_FILE]: (
    state: AppState,
    {
      file,
      isInputToHumanAgent,
    }: { file: FileUpload; isInputToHumanAgent: boolean }
  ) => {
    const currentInputState = getInputState(state, isInputToHumanAgent);
    return applyInputState(
      state,
      {
        ...currentInputState,
        files: [...currentInputState.files, file],
      },
      isInputToHumanAgent
    );
  },

  [REMOVE_INPUT_FILE]: (
    state: AppState,
    {
      fileID,
      isInputToHumanAgent,
    }: { fileID: string; isInputToHumanAgent: boolean }
  ) => {
    const currentInputState = getInputState(state, isInputToHumanAgent);
    const newUploads = [...currentInputState.files];
    const index = newUploads.findIndex((file) => file.id === fileID);
    if (index !== -1) {
      newUploads.splice(index, 1);
    }
    return applyInputState(
      state,
      {
        ...currentInputState,
        files: newUploads,
      },
      isInputToHumanAgent
    );
  },

  [REMOVE_LOCAL_MESSAGE_ITEM]: (
    state: AppState,
    { localMessageItemID }: { localMessageItemID: string }
  ) => {
    const newLocalMessageIDs = state.botMessageState.localMessageIDs.filter(
      (id) => id !== localMessageItemID
    );
    const allMessageItemsByID = {
      ...state.allMessageItemsByID,
    };
    if (allMessageItemsByID[localMessageItemID]) {
      delete allMessageItemsByID[localMessageItemID];
    }
    return {
      ...state,
      allMessageItemsByID,
      botMessageState: {
        ...state.botMessageState,
        localMessageIDs: newLocalMessageIDs,
      },
    };
  },

  [ADD_NOTIFICATION]: (
    state: AppState,
    {
      notification,
      notificationID,
    }: { notificationID: string; notification: NotificationMessage }
  ) => {
    return {
      ...state,
      notifications: state.notifications.concat({
        id: notificationID,
        notification,
      }),
    };
  },

  [REMOVE_NOTIFICATIONS]: (
    state: AppState,
    { groupID, notificationID }: { groupID?: string; notificationID?: string }
  ) => {
    return {
      ...state,
      notifications: state.notifications.filter((notification) => {
        if (notificationID) {
          return notification.id !== notificationID;
        }
        return notification.notification.groupID !== groupID;
      }),
    };
  },

  [REMOVE_ALL_NOTIFICATIONS]: (state: AppState) => {
    return {
      ...state,
      notifications: [],
    };
  },

  [CLEAR_INPUT_FILES]: (
    state: AppState,
    { isInputToHumanAgent }: { isInputToHumanAgent: boolean }
  ) => {
    const currentInputState = getInputState(state, isInputToHumanAgent);
    return applyInputState(
      state,
      {
        ...currentInputState,
        files: [],
      },
      isInputToHumanAgent
    );
  },

  [FILE_UPLOAD_INPUT_ERROR]: (
    state: AppState,
    {
      fileID,
      errorMessage,
      isInputToHumanAgent,
    }: { fileID: string; errorMessage: string; isInputToHumanAgent: boolean }
  ) => {
    const currentInputSate = getInputState(state, isInputToHumanAgent);
    const newUploads = [...currentInputSate.files];
    const index = newUploads.findIndex((file) => file.id === fileID);
    if (index !== -1) {
      newUploads[index] = {
        ...newUploads[index],
        isError: true,
        errorMessage,
        status: FileStatusValue.COMPLETE,
      };
    }
    return applyInputState(
      state,
      {
        ...currentInputSate,
        files: newUploads,
      },
      isInputToHumanAgent
    );
  },

  [ADD_NESTED_MESSAGES]: (
    state: AppState,
    { localMessageItems }: { localMessageItems: LocalMessageItem[] }
  ) => {
    const allMessageItemsByID = { ...state.allMessageItemsByID };

    localMessageItems.forEach((localMessageItem) => {
      allMessageItemsByID[localMessageItem.ui_state.id] = localMessageItem;
    });

    return {
      ...state,
      allMessageItemsByID,
    };
  },

  [SET_RESPONSE_PANEL_IS_OPEN]: (
    state: AppState,
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
    state: AppState,
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

  [STREAMING_START]: (
    state: AppState,
    { messageID }: { messageID: string }
  ) => {
    // Add an empty placeholder where we will start adding the streaming chunks as they come in.
    const streamIntoResponse: MessageResponse = {
      id: messageID,
      output: {
        generic: [],
      },
      history: {
        timestamp: Date.now(),
      },
    };

    return applyFullMessage(state, streamIntoResponse);
  },

  [STREAMING_MERGE_HISTORY]: (
    state: AppState,
    {
      messageID,
      history,
    }: { messageID: string; history: DeepPartial<MessageHistory> }
  ) => {
    const existingMessage = state.allMessagesByID[messageID];
    const newMessage = merge({}, existingMessage, { history });
    if (existingMessage) {
      return {
        ...state,
        allMessagesByID: {
          ...state.allMessagesByID,
          [messageID]: newMessage,
        },
      };
    }

    return state;
  },

  [STREAMING_ADD_CHUNK]: (
    state: AppState,
    {
      chunkItem,
      fullMessageID,
      isCompleteItem,
      disableFadeAnimation,
    }: {
      fullMessageID: string;
      chunkItem: DeepPartial<GenericItem>;
      isCompleteItem: boolean;
      disableFadeAnimation: boolean;
    }
  ) => {
    const message = state.allMessagesByID[fullMessageID] as MessageResponse;

    // This might be undefined if we haven't seen this item before.
    const localItemID = streamItemID(fullMessageID, chunkItem);
    const existingLocalMessageItem = state.allMessageItemsByID[localItemID];
    let { localMessageIDs } = state.botMessageState;
    let newItem: LocalMessageItem;
    if (!existingLocalMessageItem) {
      // This is a new item we haven't seen before. We will need the response type to know what to with this item which
      // should always be available in the first chunk. We will then need to add this item to the store so it'll appear.
      newItem = outputItemToLocalItem(
        chunkItem as GenericItem,
        message as MessageResponse,
        false
      );
      newItem.ui_state.needsAnnouncement = false;
      newItem.ui_state.disableFadeAnimation = disableFadeAnimation;
      newItem.ui_state.isIntermediateStreaming = true;
      if (isCompleteItem) {
        newItem.ui_state.streamingState = { chunks: [], isDone: true };
      } else {
        newItem.ui_state.streamingState = {
          chunks: [chunkItem],
          isDone: false,
        };
      }
      localMessageIDs = [...localMessageIDs, localItemID];
      if (!newItem.item.response_type) {
        throw new Error(
          `New chunk item does not have a response_type: ${JSON.stringify(
            chunkItem
          )}`
        );
      }
    } else if (isCompleteItem) {
      // This is a complete item.
      newItem = outputItemToLocalItem(
        chunkItem as GenericItem,
        message as MessageResponse,
        false
      );
      newItem.ui_state.needsAnnouncement = false;
      newItem.ui_state.disableFadeAnimation = disableFadeAnimation;
      newItem.ui_state.streamingState = { chunks: [], isDone: true };
    } else {
      // This is a new chunk on an existing item. We need to merge it with the existing item and add the new chunk.
      newItem = {
        ...existingLocalMessageItem,
        ui_state: {
          ...existingLocalMessageItem?.ui_state,
          streamingState: {
            ...existingLocalMessageItem?.ui_state.streamingState,
            chunks: [
              ...(existingLocalMessageItem?.ui_state.streamingState?.chunks ||
                []),
              chunkItem,
            ],
          },
        },
      };
    }

    return {
      ...state,
      allMessageItemsByID: {
        ...state.allMessageItemsByID,
        [localItemID]: newItem,
      },
      botMessageState: {
        ...state.botMessageState,
        localMessageIDs,
      },
    };
  },

  [UPDATE_CHAT_HEADER_CONFIG]: (
    state: AppState,
    { chatHeaderConfig }: { chatHeaderConfig: ChatHeaderConfig }
  ) => {
    return {
      ...state,
      chatHeaderState: {
        ...state.chatHeaderState,
        config: {
          ...state.chatHeaderState.config,
          ...chatHeaderConfig,
        },
      },
    };
  },

  [UPDATE_MAX_VISIBLE_HEADER_OBJECTS]: (
    state: AppState,
    { maxTotal }: { maxTotal: number }
  ) => {
    return {
      ...state,
      chatHeaderState: {
        ...state.chatHeaderState,
        maxVisibleHeaderObjects: maxTotal,
      },
    };
  },

  [SET_STOP_STREAMING_BUTTON_VISIBLE]: (
    state: AppState,
    { isVisible }: { isVisible: boolean }
  ) => {
    return {
      ...state,
      botInputState: {
        ...state.botInputState,
        stopStreamingButtonState: {
          ...state.botInputState.stopStreamingButtonState,
          isVisible,
        },
      },
    };
  },

  [SET_STOP_STREAMING_BUTTON_DISABLED]: (
    state: AppState,
    { isDisabled }: { isDisabled: boolean }
  ) => {
    return {
      ...state,
      botInputState: {
        ...state.botInputState,
        stopStreamingButtonState: {
          ...state.botInputState.stopStreamingButtonState,
          isDisabled,
        },
      },
    };
  },

  [SET_STREAM_ID]: (
    state: AppState,
    { currentStreamID }: { currentStreamID: string }
  ) => {
    return {
      ...state,
      botInputState: {
        ...state.botInputState,
        stopStreamingButtonState: {
          ...state.botInputState.stopStreamingButtonState,
          currentStreamID,
        },
      },
    };
  },

  [UPDATE_MAIN_HEADER_AVATAR]: (
    state: AppState,
    { config }: { config: ChatHeaderAvatarConfig }
  ) => {
    return {
      ...state,
      headerAvatarConfig: config,
    };
  },
};

/**
 * Applies a change to the current input state. This will determine which input state should be updated based on whether
 * the user is connected to an agent or not.
 */
function applyInputState(
  state: AppState,
  newInputState: InputState,
  isInputToHumanAgent: boolean
): AppState {
  if (isInputToHumanAgent) {
    return {
      ...state,
      humanAgentState: {
        ...state.humanAgentState,
        inputState: newInputState,
      },
    };
  }

  return {
    ...state,
    botInputState: newInputState,
  };
}
/**
 * Returns the given input state.
 */
function getInputState(state: AppState, isInputToHumanAgent: boolean) {
  return isInputToHumanAgent
    ? state.humanAgentState.inputState
    : state.botInputState;
}

// Merge in the other reducers.
Object.assign(reducers, humanAgentReducers);

export { reducers, ReducerType };

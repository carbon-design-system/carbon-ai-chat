/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import merge from "lodash-es/merge.js";
import { DeepPartial } from "../../types/utilities/DeepPartial";
import { isBrowser } from "../utils/browserUtils";

import { outputItemToLocalItem } from "../schema/outputItemToLocalItem";
import {
  AnnounceMessage,
  AppState,
  AppStateMessages,
  ChatMessagesState,
  FileUpload,
  InputState,
  PersistedState,
  ThemeState,
  ViewState,
} from "../../types/state/AppState";
import { CustomPanelConfigOptions } from "../../types/instance/apiTypes";
import {
  LocalMessageItem,
  LocalMessageUIState,
} from "../../types/messaging/LocalMessageItem";
import { FileStatusValue } from "../utils/constants";
import { isRequest, isResponse, streamItemID } from "../utils/messageUtils";
import {
  ACCEPTED_DISCLAIMER,
  ADD_INPUT_FILE,
  ADD_IS_HYDRATING_COUNTER,
  ADD_IS_LOADING_COUNTER,
  ADD_LOCAL_MESSAGE_ITEM,
  ADD_MESSAGE,
  ADD_NESTED_MESSAGES,
  ADD_NOTIFICATION,
  ANNOUNCE_MESSAGE,
  CHANGE_STATE,
  CLEAR_INPUT_FILES,
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
  SET_LAUNCHER_MINIMIZED,
  SET_LAUNCHER_PROPERTY,
  SET_MESSAGE_RESPONSE_HISTORY_PROPERTY,
  SET_MESSAGE_UI_STATE_INTERNAL_PROPERTY,
  SET_MESSAGE_UI_PROPERTY,
  SET_RESPONSE_PANEL_CONTENT,
  SET_RESPONSE_PANEL_IS_OPEN,
  SET_STOP_STREAMING_BUTTON_DISABLED,
  SET_STOP_STREAMING_BUTTON_VISIBLE,
  SET_STREAM_ID,
  SET_IS_RESTARTING,
  SET_VIEW_CHANGING,
  SET_VIEW_STATE,
  STREAMING_ADD_CHUNK,
  STREAMING_MERGE_MESSAGE_OPTIONS,
  STREAMING_START,
  TOGGLE_HOME_SCREEN,
  UPDATE_HAS_SENT_NON_WELCOME_MESSAGE,
  UPDATE_INPUT_STATE,
  UPDATE_LOCAL_MESSAGE_ITEM,
  UPDATE_MESSAGE,
  UPDATE_PERSISTED_STATE,
  UPDATE_THEME_STATE,
  RESET_IS_HYDRATING_COUNTER,
  RESET_IS_LOADING_COUNTER,
} from "./actions";
import { humanAgentReducers } from "./humanAgentReducers";
import {
  applyAssistantMessageState,
  applyFullMessage,
  applyLocalMessageUIState,
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_IFRAME_PANEL_STATE,
  handleViewStateChange,
  setHomeScreenOpenState,
} from "./reducerUtils";
import {
  HumanAgentMessageType,
  ConversationalSearchItemCitation,
  GenericItem,
  IFrameItem,
  Message,
  MessageRequest,
  MessageResponse,
  SearchResult,
  MessageUIStateInternal,
  MessageResponseOptions,
  MessageResponseHistory,
  MessageRequestHistory,
} from "../../types/messaging/Messages";
import { NotificationMessage } from "../../types/instance/apiTypes";

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
    action: { partialState: DeepPartial<AppState> },
  ): AppState => {
    const { partialState } = action;
    if (!partialState) {
      return state;
    }

    if (Object.is(partialState as unknown, state)) {
      return state;
    }

    const { config, ...rest } = partialState;
    const nextState = merge({}, state, rest);

    // Handle config separately because callers sometimes pass a completely rebuilt AppConfig (for example after
    // recomputing derived fields based on a new PublicConfig). A blind deep merge would blend the new tree with the
    // previous one, leaving behind stale nested values like the old language pack. By detecting a full config payload
    // and replacing it wholesale we ensure each update starts from a clean AppConfig while still allowing partial
    // updates (e.g. `config: { derived: { languagePack: ... } }`) to merge as before.
    if (config !== undefined) {
      if (config && Object.prototype.hasOwnProperty.call(config, "public")) {
        nextState.config = config as AppState["config"];
      } else if (config) {
        nextState.config = merge({}, nextState.config, config);
      } else {
        nextState.config = config as AppState["config"];
      }
    }

    return nextState;
  },

  [HYDRATE_CHAT]: (state: AppState): AppState => ({
    ...state,
    isHydrated: true,
  }),

  [RESTART_CONVERSATION]: (state: AppState): AppState => {
    let newState: AppState = {
      ...state,
      assistantMessageState: {
        ...state.assistantMessageState,
        localMessageIDs: [],
        messageIDs: [],
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
      isHydrated: false,
      catastrophicErrorType: null,
    };

    if (newState.config.public.homescreen?.isOn) {
      newState = setHomeScreenOpenState(newState, true);
    }
    return newState;
  },

  [HYDRATE_MESSAGE_HISTORY]: (
    state: AppState,
    action: { messageHistory: AppStateMessages },
  ): AppState => {
    const newState = {
      ...state,
      ...action.messageHistory,
    };

    return newState;
  },

  [ADD_LOCAL_MESSAGE_ITEM]: (
    state: AppState,
    action: {
      messageItem: LocalMessageItem;
      message: Message;
      addMessage: boolean;
      addAfterID: string;
    },
  ): AppState => {
    const { messageItem, message, addMessage, addAfterID } = action;
    const { id } = messageItem.ui_state;

    // If we receive back a silent message, we don't want to add to the store.
    const isSilent = message.history.silent;
    let newState: AppState = state;

    if (addMessage) {
      newState = applyFullMessage(newState, message);
    }

    const currentIndex =
      newState.assistantMessageState.localMessageIDs.findIndex(
        (existingID) => existingID === id,
      );
    const newLocalMessageIDs = [
      ...newState.assistantMessageState.localMessageIDs,
    ];

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
        (existingID) => existingID === addAfterID,
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
        assistantMessageState: {
          ...newState.assistantMessageState,
          localMessageIDs: newLocalMessageIDs,
        },
      };

      if (newState.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen) {
        // When a message has been sent, we don't want the home screen open anymore.
        newState = setHomeScreenOpenState(newState, false);
      }

      const isAssistantMessage = !messageItem.item.agent_message_type;
      const isMainWindowOpen =
        state.persistedToBrowserStorage.viewState.mainWindow;
      if (
        !isAssistantMessage &&
        (!isMainWindowOpen || !state.isBrowserPageVisible)
      ) {
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
    { messageIDs }: { messageIDs: string[] },
  ): AppState => {
    const idsSet = new Set(messageIDs);

    const newAllMessages = { ...state.allMessagesByID };
    const newAllMessageItems = { ...state.allMessageItemsByID };

    // Remove all the message IDs from the message list.
    const newMessageIDs = state.assistantMessageState.messageIDs.filter(
      (messageID) => !idsSet.has(messageID),
    );

    // Remove all the message items from the items list for items that are part of one of the messages being
    // removed. Also remove the matching items from the map.
    const newMessageItemsIDs =
      state.assistantMessageState.localMessageIDs.filter((messageItemID) => {
        const messageItem = newAllMessageItems[messageItemID];
        const removeItem = idsSet.has(messageItem?.fullMessageID);
        if (removeItem) {
          delete newAllMessageItems[messageItemID];
        }
        return !removeItem;
      });

    // Remove the message objects from the map.
    messageIDs.forEach((messageID) => {
      delete newAllMessages[messageID];
    });

    const newState: AppState = {
      ...state,
      allMessagesByID: newAllMessages,
      allMessageItemsByID: newAllMessageItems,
      assistantMessageState: {
        ...state.assistantMessageState,
        messageIDs: newMessageIDs,
        localMessageIDs: newMessageItemsIDs,
      },
    };

    return newState;
  },

  [UPDATE_LOCAL_MESSAGE_ITEM]: (
    state: AppState,
    action: { messageItem: LocalMessageItem },
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
    action: { message: Message },
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
      const newLocalMessageIDs =
        state.assistantMessageState.localMessageIDs.filter((itemID, index) => {
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
        });

      // Now insert the message items back into the list at the right spot, but only the items we already had.
      if (existingItemIDs.length) {
        const itemIDsToInsert = itemIDsInNewMessage.filter((itemID) =>
          existingItemIDs.includes(itemID),
        );
        if (itemIDsToInsert.length) {
          newLocalMessageIDs.splice(firstFoundIndex, 0, ...itemIDsToInsert);
        }
      }

      newState = {
        ...newState,
        allMessageItemsByID: newAllMessageItemsByID,
        assistantMessageState: {
          ...newState.assistantMessageState,
          localMessageIDs: newLocalMessageIDs,
        },
      };
    }

    return applyFullMessage(newState, message);
  },

  [MESSAGE_SET_OPTION_SELECTED]: (
    state: AppState,
    action: { sentMessage: MessageRequest; messageID: string },
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

  [RESET_IS_LOADING_COUNTER]: (state: AppState): AppState => {
    return {
      ...state,
      assistantMessageState: {
        ...state.assistantMessageState,
        isMessageLoadingCounter: 0,
        isMessageLoadingText: undefined,
      },
    };
  },

  [ADD_IS_LOADING_COUNTER]: (
    state: AppState,
    action: { addToIsLoading: number; message?: string },
  ): AppState => {
    const isMessageLoadingCounter = Math.max(
      state.assistantMessageState.isMessageLoadingCounter +
        action.addToIsLoading,
      0,
    );
    return {
      ...state,
      assistantMessageState: {
        ...state.assistantMessageState,
        isMessageLoadingCounter,
        isMessageLoadingText:
          isMessageLoadingCounter > 0 && action.message
            ? action.message
            : undefined,
      },
    };
  },

  [RESET_IS_HYDRATING_COUNTER]: (state: AppState): AppState => {
    return {
      ...state,
      assistantMessageState: {
        ...state.assistantMessageState,
        isHydratingCounter: 0,
      },
    };
  },

  [ADD_IS_HYDRATING_COUNTER]: (
    state: AppState,
    action: { addToIsHydrating: number },
  ): AppState => {
    return {
      ...state,
      assistantMessageState: {
        ...state.assistantMessageState,
        isHydratingCounter: Math.max(
          state.assistantMessageState.isHydratingCounter +
            action.addToIsHydrating,
          0,
        ),
      },
    };
  },

  [SET_APP_STATE_VALUE]: (
    state: AppState,
    action: { key: keyof AppState; value: any },
  ): AppState => ({
    ...state,
    [action.key]: action.value,
  }),

  [UPDATE_PERSISTED_STATE]: (
    state: AppState,
    action: { chatState: Partial<PersistedState> },
  ): AppState => ({
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      ...action.chatState,
    },
  }),

  [UPDATE_HAS_SENT_NON_WELCOME_MESSAGE]: (
    state: AppState,
    action: { hasSentNonWelcomeMessage: boolean },
  ): AppState => {
    if (
      state.persistedToBrowserStorage.hasSentNonWelcomeMessage ===
      action.hasSentNonWelcomeMessage
    ) {
      return state;
    }
    return {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        hasSentNonWelcomeMessage: action.hasSentNonWelcomeMessage,
      },
    };
  },

  [SET_IS_RESTARTING]: (
    state: AppState,
    action: { isRestarting: boolean },
  ): AppState => ({
    ...state,
    isRestarting: action.isRestarting,
  }),

  [SET_VIEW_STATE]: (
    state: AppState,
    action: { viewState: ViewState },
  ): AppState => {
    return handleViewStateChange(state, action.viewState);
  },

  [SET_VIEW_CHANGING]: (
    state: AppState,
    action: { viewChanging: boolean },
  ): AppState => ({
    ...state,
    viewChanging: action.viewChanging,
  }),

  [SET_INITIAL_VIEW_CHANGE_COMPLETE]: (
    state: AppState,
    action: { changeComplete: boolean },
  ): AppState => ({
    ...state,
    initialViewChangeComplete: action.changeComplete,
  }),

  [SET_MESSAGE_UI_PROPERTY]: <TPropertyName extends keyof LocalMessageUIState>(
    state: AppState,
    action: {
      localMessageID: string;
      propertyName: TPropertyName;
      propertyValue: LocalMessageUIState[TPropertyName];
    },
  ): AppState => {
    return applyLocalMessageUIState(
      state,
      action.localMessageID,
      action.propertyName,
      action.propertyValue,
    );
  },

  [SET_MESSAGE_RESPONSE_HISTORY_PROPERTY]: <
    TPropertyName extends keyof MessageResponseHistory,
  >(
    state: AppState,
    action: {
      messageID: string;
      propertyName: TPropertyName;
      propertyValue: MessageResponseHistory[TPropertyName];
    },
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
    TPropertyName extends keyof MessageUIStateInternal,
  >(
    state: AppState,
    action: {
      messageID: string;
      propertyName: TPropertyName;
      propertyValue: MessageUIStateInternal[TPropertyName];
    },
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
    action: {
      messageID: string;
      history: MessageResponseHistory | MessageRequestHistory;
    },
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
    action: { message: AnnounceMessage },
  ): AppState => ({
    ...state,
    announceMessage: action.message,
  }),

  [ACCEPTED_DISCLAIMER]: (state: AppState): AppState => ({
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      disclaimersAccepted: {
        ...state.persistedToBrowserStorage.disclaimersAccepted,
        [isBrowser ? window.location.hostname : "localhost"]: true,
      },
    },
  }),

  [SET_HOME_SCREEN_IS_OPEN]: (
    state: AppState,
    { isOpen }: { isOpen: boolean },
  ) => setHomeScreenOpenState(state, isOpen),

  [TOGGLE_HOME_SCREEN]: (state: AppState) =>
    setHomeScreenOpenState(
      state,
      !state.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen,
      true,
    ),

  [SET_LAUNCHER_PROPERTY]: <TPropertyName extends keyof PersistedState>(
    state: AppState,
    action: {
      propertyName: TPropertyName;
      propertyValue: PersistedState[TPropertyName];
    },
  ) => {
    return {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        [action.propertyName]: action.propertyValue,
      },
    };
  },

  [SET_CHAT_MESSAGES_PROPERTY]: <TPropertyName extends keyof ChatMessagesState>(
    state: AppState,
    action: {
      propertyName: TPropertyName;
      propertyValue: ChatMessagesState[TPropertyName];
    },
  ) => {
    return applyAssistantMessageState(state, {
      [action.propertyName]: action.propertyValue,
    });
  },

  [SET_LAUNCHER_MINIMIZED]: (state: AppState) => {
    return {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        launcherIsExpanded: false,
      },
    };
  },

  [OPEN_IFRAME_CONTENT]: (
    state: AppState,
    { messageItem }: { messageItem: IFrameItem },
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
    },
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
    action: { options: CustomPanelConfigOptions },
  ) => {
    return {
      ...state,
      customPanelState: {
        ...state.customPanelState,
        options: action.options,
      },
    };
  },

  [UPDATE_INPUT_STATE]: (
    state: AppState,
    action: { newState: Partial<InputState>; isInputToHumanAgent: boolean },
  ) => {
    const currentInputState = getInputState(state, action.isInputToHumanAgent);
    const newInputState = {
      ...currentInputState,
      ...action.newState,
    };
    const newState = applyInputState(
      state,
      newInputState,
      action.isInputToHumanAgent,
    );
    return newState;
  },

  [SET_IS_BROWSER_PAGE_VISIBLE]: (
    state: AppState,
    action: { isVisible: boolean },
  ) => {
    // If the page becomes visible while the main window is open, then clear the number of unread messages.
    const isMainWindowOpen =
      state.persistedToBrowserStorage.viewState.mainWindow;
    const numUnreadMessages =
      isMainWindowOpen && action.isVisible
        ? 0
        : state.humanAgentState.numUnreadMessages;

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
    }: { file: FileUpload; isInputToHumanAgent: boolean },
  ) => {
    const currentInputState = getInputState(state, isInputToHumanAgent);
    return applyInputState(
      state,
      {
        ...currentInputState,
        files: [...currentInputState.files, file],
      },
      isInputToHumanAgent,
    );
  },

  [REMOVE_INPUT_FILE]: (
    state: AppState,
    {
      fileID,
      isInputToHumanAgent,
    }: { fileID: string; isInputToHumanAgent: boolean },
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
      isInputToHumanAgent,
    );
  },

  [REMOVE_LOCAL_MESSAGE_ITEM]: (
    state: AppState,
    { localMessageItemID }: { localMessageItemID: string },
  ) => {
    const newLocalMessageIDs =
      state.assistantMessageState.localMessageIDs.filter(
        (id) => id !== localMessageItemID,
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
      assistantMessageState: {
        ...state.assistantMessageState,
        localMessageIDs: newLocalMessageIDs,
      },
    };
  },

  [ADD_NOTIFICATION]: (
    state: AppState,
    {
      notification,
      notificationID,
    }: { notificationID: string; notification: NotificationMessage },
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
    { groupID, notificationID }: { groupID?: string; notificationID?: string },
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
    { isInputToHumanAgent }: { isInputToHumanAgent: boolean },
  ) => {
    const currentInputState = getInputState(state, isInputToHumanAgent);
    return applyInputState(
      state,
      {
        ...currentInputState,
        files: [],
      },
      isInputToHumanAgent,
    );
  },

  [FILE_UPLOAD_INPUT_ERROR]: (
    state: AppState,
    {
      fileID,
      errorMessage,
      isInputToHumanAgent,
    }: { fileID: string; errorMessage: string; isInputToHumanAgent: boolean },
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
      isInputToHumanAgent,
    );
  },

  [ADD_NESTED_MESSAGES]: (
    state: AppState,
    { localMessageItems }: { localMessageItems: LocalMessageItem[] },
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
    { isOpen }: { isOpen: boolean },
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
    }: { localMessageItem: LocalMessageItem; isMessageForInput: boolean },
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
    { messageID }: { messageID: string },
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

  [STREAMING_MERGE_MESSAGE_OPTIONS]: (
    state: AppState,
    {
      messageID,
      message_options,
    }: {
      messageID: string;
      message_options: DeepPartial<MessageResponseOptions>;
    },
  ) => {
    const existingMessage = state.allMessagesByID[messageID];
    const newMessage = merge({}, existingMessage, { message_options });

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
    },
  ) => {
    const message = state.allMessagesByID[fullMessageID] as MessageResponse;

    // This might be undefined if we haven't seen this item before.
    const localItemID = streamItemID(fullMessageID, chunkItem);
    const existingLocalMessageItem = state.allMessageItemsByID[localItemID];
    let { localMessageIDs } = state.assistantMessageState;
    let newItem: LocalMessageItem;
    if (!existingLocalMessageItem) {
      // This is a new item we haven't seen before. We will need the response type to know what to with this item which
      // should always be available in the first chunk. We will then need to add this item to the store so it'll appear.
      newItem = outputItemToLocalItem(
        chunkItem as GenericItem,
        message as MessageResponse,
        false,
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
            chunkItem,
          )}`,
        );
      }
    } else if (isCompleteItem) {
      // This is a complete item. Update the existing item instead of creating a new one
      // to preserve object identity and prevent component re-mounting.
      const updatedItem = {
        ...existingLocalMessageItem.item,
        ...chunkItem,
      } as GenericItem;

      newItem = {
        ...existingLocalMessageItem,
        item: updatedItem,
        ui_state: {
          ...existingLocalMessageItem.ui_state,
          // Mark streaming as complete and clear intermediate state
          isIntermediateStreaming: false,
          streamingState: { chunks: [], isDone: true },
        },
      };
    } else {
      // This is a new chunk on an existing item. We need to merge it with the existing item and add the new chunk.
      const existingChunks =
        existingLocalMessageItem?.ui_state.streamingState?.chunks || [];
      const newChunks = [...existingChunks, chunkItem];

      newItem = {
        ...existingLocalMessageItem,
        ui_state: {
          ...existingLocalMessageItem?.ui_state,
          streamingState: {
            ...existingLocalMessageItem?.ui_state.streamingState,
            chunks: newChunks,
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
      assistantMessageState: {
        ...state.assistantMessageState,
        localMessageIDs,
      },
    };
  },

  [SET_STOP_STREAMING_BUTTON_VISIBLE]: (
    state: AppState,
    { isVisible }: { isVisible: boolean },
  ) => {
    return {
      ...state,
      assistantInputState: {
        ...state.assistantInputState,
        stopStreamingButtonState: {
          ...state.assistantInputState.stopStreamingButtonState,
          isVisible,
        },
      },
    };
  },

  [SET_STOP_STREAMING_BUTTON_DISABLED]: (
    state: AppState,
    { isDisabled }: { isDisabled: boolean },
  ) => {
    return {
      ...state,
      assistantInputState: {
        ...state.assistantInputState,
        stopStreamingButtonState: {
          ...state.assistantInputState.stopStreamingButtonState,
          isDisabled,
        },
      },
    };
  },

  [SET_STREAM_ID]: (
    state: AppState,
    { currentStreamID }: { currentStreamID: string },
  ) => {
    return {
      ...state,
      assistantInputState: {
        ...state.assistantInputState,
        stopStreamingButtonState: {
          ...state.assistantInputState.stopStreamingButtonState,
          currentStreamID,
        },
      },
    };
  },

  [UPDATE_THEME_STATE]: (
    state: AppState,
    { themeState }: { themeState: ThemeState },
  ) => {
    return {
      ...state,
      config: {
        ...state.config,
        derived: {
          ...state.config.derived,
          themeWithDefaults: themeState,
        },
      },
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
  isInputToHumanAgent: boolean,
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
    assistantInputState: newInputState,
  };
}
/**
 * Returns the given input state.
 */
function getInputState(state: AppState, isInputToHumanAgent: boolean) {
  return isInputToHumanAgent
    ? state.humanAgentState.inputState
    : state.assistantInputState;
}

// Merge in the other reducers.
Object.assign(reducers, humanAgentReducers);

export { reducers, ReducerType };

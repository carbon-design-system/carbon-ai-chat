/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import merge from 'lodash-es/merge.js';
import { DeepPartial } from '../../types/utilities/DeepPartial';
import { isBrowser } from '../utils/browserUtils';

import {
  AnnounceMessage,
  AppState,
  AppStateMessages,
  CatastrophicErrorPanelState,
  ChatMessagesState,
  FileUpload,
  InputState,
  PendingUpload,
  PendingUploadStatus,
  PersistedState,
  ThemeState,
  ViewState,
} from '../../types/state/AppState';
import {
  CustomPanelConfigOptions,
  WorkspaceCustomPanelConfigOptions,
} from '../../types/instance/apiTypes';
import {
  LocalMessageItem,
  LocalMessageUIState,
} from '../../types/messaging/LocalMessageItem';
import { FileStatusValue } from '../utils/constants';
import { isRequest, isResponse } from '../utils/messageUtils';
import {
  ACCEPTED_DISCLAIMER,
  ADD_INPUT_FILE,
  ADD_IS_HYDRATING_COUNTER,
  ADD_IS_LOADING_COUNTER,
  ADD_LOCAL_MESSAGE_ITEM,
  ADD_MESSAGE,
  ANNOUNCE_MESSAGE,
  CHANGE_STATE,
  CLEAR_INPUT_FILES,
  CLEAR_STRUCTURED_DATA,
  CLOSE_IFRAME_PANEL,
  FILE_UPLOAD_INPUT_ERROR,
  HYDRATE_CHAT,
  HYDRATE_MESSAGE_HISTORY,
  MERGE_HISTORY,
  MESSAGE_SET_OPTION_SELECTED,
  OPEN_IFRAME_CONTENT,
  REMOVE_INPUT_FILE,
  REMOVE_LOCAL_MESSAGE_ITEM,
  REMOVE_MESSAGES,
  RESTART_CONVERSATION,
  SET_APP_STATE_VALUE,
  SET_CHAT_MESSAGES_PROPERTY,
  SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN,
  SET_CUSTOM_PANEL_OPEN,
  SET_CUSTOM_PANEL_OPTIONS,
  SET_WORKSPACE_PANEL_OPEN,
  SET_WORKSPACE_PANEL_OPTIONS,
  SET_WORKSPACE_PANEL_DATA,
  SET_HISTORY_PANEL_OPEN,
  SET_HISTORY_PANEL_OPTIONS,
  SET_HOME_SCREEN_IS_OPEN,
  SET_INITIAL_VIEW_CHANGE_COMPLETE,
  SET_IS_BROWSER_PAGE_VISIBLE,
  SET_LAUNCHER_MINIMIZED,
  SET_LAUNCHER_PROPERTY,
  SET_MESSAGE_RESPONSE_HISTORY_PROPERTY,
  SET_MESSAGE_UI_STATE_INTERNAL_PROPERTY,
  SET_MESSAGE_UI_PROPERTY,
  SET_MESSAGE_WAS_ANNOUNCED,
  SET_RESPONSE_PANEL_CONTENT,
  SET_RESPONSE_PANEL_IS_OPEN,
  SET_STOP_STREAMING_BUTTON_DISABLED,
  SET_STOP_STREAMING_BUTTON_VISIBLE,
  SET_STREAM_ID,
  SET_IS_RESTARTING,
  SET_VIEW_CHANGING,
  SET_VIEW_STATE,
  SET_ACTIVE_RESPONSE_ID,
  TOGGLE_HOME_SCREEN,
  UPDATE_CATASTROPHIC_ERROR_PANEL,
  UPDATE_HAS_SENT_NON_WELCOME_MESSAGE,
  UPDATE_INPUT_STATE,
  UPDATE_LOCAL_MESSAGE_ITEM,
  UPDATE_STRUCTURED_DATA,
  UPDATE_MESSAGE,
  UPSERT_MESSAGE,
  END_MESSAGE_STREAMING,
  UPDATE_PERSISTED_STATE,
  UPDATE_THEME_STATE,
  RESET_IS_HYDRATING_COUNTER,
  RESET_IS_LOADING_COUNTER,
  ADD_PENDING_UPLOAD,
  UPDATE_PENDING_UPLOAD,
  REMOVE_PENDING_UPLOAD,
} from './actions';
import type { MessageWriteOptions, ReceivedLocalItems } from './actions';
import { humanAgentReducers } from './humanAgentReducers';
import {
  applyAssistantMessageState,
  applyChunkWrite,
  applyFullMessage,
  applyLocalMessageUIState,
  computeLocalIDInsertionPoint,
  rebuildLocalItemsForUpsert,
  keepStreamedItemsOnly,
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_WORKSPACE_PANEL_STATE,
  DEFAULT_IFRAME_PANEL_STATE,
  handleViewStateChange,
  setHomeScreenOpenState,
  keepPriorUIStateInternal,
  keepMessageRefIfUnchanged,
} from './reducerUtils';
import {
  HumanAgentMessageType,
  ConversationalSearchItemCitation,
  IFrameItem,
  Message,
  MessageRequest,
  MessageResponse,
  SearchResult,
  MessageUIStateInternal,
  MessageResponseHistory,
  MessageRequestHistory,
} from '../../types/messaging/Messages';

type ReducerType = (state: AppState, action?: any) => AppState;

/**
 * Rebuilds `pendingStructuredData` by combining `manualStructuredData` with the
 * `contributedData` from every completed upload in `pendingUploads`.
 *
 * - `fields` arrays are **concatenated** (not merged by index) so that manual fields
 *   and upload-contributed fields coexist side-by-side.
 * - `user_defined` objects are deep-merged; later entries win on scalar conflicts.
 *
 * Returns `undefined` when there is nothing to combine.
 */
function rebuildPendingStructuredData(
  inputState: InputState
): import('../../types/messaging/Messages').StructuredData | undefined {
  type SD = import('../../types/messaging/Messages').StructuredData;
  type SF = import('../../types/messaging/Messages').StructuredField;

  const parts: SD[] = [];

  if (inputState.manualStructuredData) {
    parts.push(inputState.manualStructuredData);
  }

  for (const upload of inputState.pendingUploads) {
    if (
      upload.status === PendingUploadStatus.COMPLETE &&
      upload.contributedData
    ) {
      parts.push(upload.contributedData);
    }
  }

  if (parts.length === 0) {
    return undefined;
  }

  // Concatenate all fields arrays.
  const allFields: SF[] = [];
  for (const part of parts) {
    if (part.fields) {
      allFields.push(...part.fields);
    }
  }

  // Deep-merge all user_defined objects.
  const userDefinedParts = parts
    .map((p) => p.user_defined)
    .filter((ud): ud is Record<string, unknown> => ud != null);
  const mergedUserDefined =
    userDefinedParts.length > 0 ? merge({}, ...userDefinedParts) : undefined;

  const result: SD = {};
  if (allFields.length > 0) {
    result.fields = allFields;
  }
  if (mergedUserDefined !== undefined) {
    result.user_defined = mergedUserDefined;
  }

  return result;
}

// The set of agent message types that should be excluded on the unread agent message count.
const EXCLUDE_HUMAN_AGENT_UNREAD = new Set([
  HumanAgentMessageType.USER_ENDED_CHAT,
  HumanAgentMessageType.CHAT_WAS_ENDED,
  HumanAgentMessageType.RELOAD_WARNING,
]);

/**
 * Returns `localMessageIDs` with `id` in it: in its own place when it is already there,
 * else at the end, or after `addAfterID` when that is there.
 */
function withLocalMessageID(
  localMessageIDs: string[],
  id: string,
  addAfterID: string
): string[] {
  const currentIndex = localMessageIDs.indexOf(id);
  const newLocalMessageIDs = [...localMessageIDs];

  let insertAtIndex = currentIndex;

  if (currentIndex !== -1) {
    // Remove the ID from the array. We may insert it back at this index.
    newLocalMessageIDs.splice(currentIndex, 1);
  } else {
    // By default, insert the new ID at the end.
    insertAtIndex = newLocalMessageIDs.length;
  }

  // If an "addAfterID" was provided, use that to determine where to put this new ID.
  const afterIDIndex = addAfterID ? newLocalMessageIDs.indexOf(addAfterID) : -1;
  if (afterIDIndex !== -1) {
    insertAtIndex = afterIDIndex + 1;
  }

  // Insert the ID.
  newLocalMessageIDs.splice(insertAtIndex, 0, id);
  return newLocalMessageIDs;
}

/**
 * Applies what showing a new local item does beyond listing it: the home screen closes,
 * and a human agent's message counts as unread while the chat is out of sight.
 *
 * @param state The state before the item was shown, which says whether the chat was in
 * sight.
 * @param newState The state with the item shown.
 * @param messageItem The local item shown.
 * @param message The message the item belongs to.
 */
function applyLocalItemShown(
  state: AppState,
  newState: AppState,
  messageItem: LocalMessageItem,
  message: Message
): AppState {
  if (newState.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen) {
    // When a message has been sent, we don't want the home screen open anymore.
    newState = setHomeScreenOpenState(newState, false);
  }

  const isAssistantMessage = !messageItem.item.agent_message_type;
  const isMainWindowOpen = state.persistedToBrowserStorage.viewState.mainWindow;
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
  return newState;
}

/**
 * Shows a local item, placed by {@link withLocalMessageID}, and replaces any local item
 * with its id. Nothing shows for a `history.silent` message.
 */
function applyLocalMessageItem(
  state: AppState,
  {
    messageItem,
    message,
    addMessage,
    addAfterID,
  }: {
    messageItem: LocalMessageItem;
    message: Message;
    addMessage: boolean;
    addAfterID: string;
  }
): AppState {
  const withMessage = addMessage ? applyFullMessage(state, message) : state;

  // If we receive back a silent message, we don't want to add to the store.
  if (message.history.silent) {
    return withMessage;
  }

  const { id } = messageItem.ui_state;
  const newState: AppState = {
    ...withMessage,
    allMessageItemsByID: {
      ...withMessage.allMessageItemsByID,
      [id]: messageItem,
    },
    assistantMessageState: {
      ...withMessage.assistantMessageState,
      localMessageIDs: withLocalMessageID(
        withMessage.assistantMessageState.localMessageIDs,
        id,
        addAfterID
      ),
    },
  };
  return applyLocalItemShown(state, newState, messageItem, message);
}

/**
 * Applies a write from `addMessage` or `final_response` the way `ADD_MESSAGE` and
 * `ADD_LOCAL_MESSAGE_ITEM` did. The first write stores the message, makes it the active
 * response, and keeps only the streamed items the message still has. Each later write
 * shows one item, with the items nested in it, and changes nothing else about the message.
 */
function applyReceivedWrite(
  state: AppState,
  message: MessageResponse,
  { localItem, nestedLocalItems, addAfterID }: ReceivedLocalItems
): AppState {
  if (!localItem) {
    return applyAssistantMessageState(
      applyFullMessage(keepStreamedItemsOnly(state, message), message),
      { activeResponseId: message.id }
    );
  }

  const allMessageItemsByID = { ...state.allMessageItemsByID };
  nestedLocalItems.forEach((nested) => {
    allMessageItemsByID[nested.ui_state.id] = nested;
  });
  return applyLocalMessageItem(
    { ...state, allMessageItemsByID },
    { messageItem: localItem, message, addMessage: false, addAfterID }
  );
}

const reducers: { [key: string]: ReducerType } = {
  [CHANGE_STATE]: (
    state: AppState,
    action: { partialState: DeepPartial<AppState> }
  ): AppState => {
    const { partialState } = action;
    if (!partialState) {
      return state;
    }

    if (Object.is(partialState as unknown, state)) {
      return state;
    }

    const { config, ...rest } = partialState;
    // `merge({}, state, rest)` deep-clones the whole tree, which hands every
    // slice a fresh reference. When the caller only updates `config` (e.g.
    // applyConfigChangesDynamically dispatches `{ config }` on any config
    // change), that would churn unrelated slices like `assistantInputState`
    // and force avoidable re-renders. Only pay for the deep clone/merge when
    // there are non-config slices to merge; otherwise shallow-copy so unchanged
    // slices keep their references.
    const nextState =
      Object.keys(rest).length > 0 ? merge({}, state, rest) : { ...state };

    // Handle config separately because callers sometimes pass a completely rebuilt AppConfig (for example after
    // recomputing derived fields based on a new PublicConfig). A blind deep merge would blend the new tree with the
    // previous one, leaving behind stale nested values. By detecting a full config payload and replacing it wholesale
    // we ensure each update starts from a clean AppConfig while still allowing partial config updates (e.g.
    // `config: { derived: { header: ... } }`) to merge as before.
    if (config !== undefined) {
      if (config && Object.prototype.hasOwnProperty.call(config, 'public')) {
        nextState.config = config as AppState['config'];
      } else if (config) {
        nextState.config = merge({}, nextState.config, config);
      } else {
        nextState.config = config as AppState['config'];
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
        activeResponseId: null,
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
      workspacePanelState: {
        ...DEFAULT_WORKSPACE_PANEL_STATE,
      },
      isHydrated: false,
      catastrophicErrorType: null,
      catastrophicErrorPanelState: {
        ...state.catastrophicErrorPanelState,
        isOpen: false,
      },
    };

    if (newState.config.public.homescreen?.isOn) {
      newState = setHomeScreenOpenState(newState, true, false);
    }
    return newState;
  },

  [HYDRATE_MESSAGE_HISTORY]: (
    state: AppState,
    action: { messageHistory: AppStateMessages }
  ): AppState => {
    const newState = {
      ...state,
      ...action.messageHistory,
    };

    const messageIDs = newState.assistantMessageState.messageIDs;

    return {
      ...newState,
      assistantMessageState: {
        ...newState.assistantMessageState,
        activeResponseId: messageIDs.length
          ? messageIDs[messageIDs.length - 1]
          : null,
      },
    };
  },

  [ADD_LOCAL_MESSAGE_ITEM]: (
    state: AppState,
    action: {
      messageItem: LocalMessageItem;
      message: Message;
      addMessage: boolean;
      addAfterID: string;
    }
  ): AppState => applyLocalMessageItem(state, action),

  [REMOVE_MESSAGES]: (
    state: AppState,
    { messageIDs }: { messageIDs: string[] }
  ): AppState => {
    const idsSet = new Set(messageIDs);

    const newAllMessages = { ...state.allMessagesByID };
    const newAllMessageItems = { ...state.allMessageItemsByID };

    // Remove all the message IDs from the message list.
    const newMessageIDs = state.assistantMessageState.messageIDs.filter(
      (messageID) => !idsSet.has(messageID)
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
        activeResponseId: newMessageIDs.length
          ? newMessageIDs[newMessageIDs.length - 1]
          : null,
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

  [UPSERT_MESSAGE]: (
    state: AppState,
    action: {
      message: Message;
      isStreaming?: boolean;
      holdFromIndex?: number;
      options?: MessageWriteOptions;
    }
  ): AppState => {
    const { message, isStreaming = false, holdFromIndex, options } = action;
    const messageID = message.id;

    if (!isResponse(message)) {
      return state;
    }

    // Until `final_response`, a chunk stream keeps the rules it has always had.
    if (options?.origin === 'chunk' && isStreaming) {
      return applyChunkWrite(state, message, options.chunk);
    }

    // A message from `addMessage` or `final_response` keeps the rules it has always had.
    if (options?.received) {
      return applyReceivedWrite(state, message, options.received);
    }

    const messageResponse = keepPriorUIStateInternal(
      message,
      state.allMessagesByID[messageID]
    );

    const { newLocalItemsByID, newLocalIDsForMessage } =
      rebuildLocalItemsForUpsert(
        state,
        messageResponse,
        isStreaming,
        true,
        holdFromIndex
      );

    const { otherLocalIDs, insertPoint } = computeLocalIDInsertionPoint(
      state.assistantMessageState.localMessageIDs,
      state.allMessageItemsByID,
      messageID
    );
    const newLocalMessageIDs = [
      ...otherLocalIDs.slice(0, insertPoint),
      ...newLocalIDsForMessage,
      ...otherLocalIDs.slice(insertPoint),
    ];

    const prevMessage = state.allMessagesByID[messageID];
    const nextMessageRef = keepMessageRefIfUnchanged(
      state,
      messageResponse,
      newLocalIDsForMessage,
      newLocalItemsByID
    );

    let nextMessageIDs = state.assistantMessageState.messageIDs;
    if (!prevMessage) {
      nextMessageIDs = [...nextMessageIDs, messageID];
    }

    const newState: AppState = {
      ...state,
      allMessagesByID: {
        ...state.allMessagesByID,
        [messageID]: nextMessageRef,
      },
      allMessageItemsByID: newLocalItemsByID,
      assistantMessageState: {
        ...state.assistantMessageState,
        messageIDs: nextMessageIDs,
        localMessageIDs: newLocalMessageIDs,
        activeResponseId: messageID,
      },
    };

    if (
      newLocalIDsForMessage.length &&
      newState.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen
    ) {
      return setHomeScreenOpenState(newState, false);
    }
    return newState;
  },

  [END_MESSAGE_STREAMING]: (
    state: AppState,
    action: { messageID: string }
  ): AppState => {
    const { messageID } = action;

    let changed = false;
    const newLocalItems: Record<string, LocalMessageItem> = {
      ...state.allMessageItemsByID,
    };

    for (const localID of Object.keys(newLocalItems)) {
      const localItem = newLocalItems[localID];
      if (localItem?.fullMessageID !== messageID) {
        continue;
      }
      const { streamingState } = localItem.ui_state;
      if (streamingState?.isDone !== false) {
        // Already settled — leave the reference alone so subscribers don't re-render.
        continue;
      }
      // A chunk-delivered item holds only its first delta in `item`; the rest is in
      // `chunks`, which renderers stop reading once `isDone` flips. Fold the accumulated
      // text into the item so a stream cut off before its closing chunk keeps the text
      // it had already shown.
      const textChunks = (streamingState?.chunks ?? []) as { text?: string }[];
      const accumulatedText = textChunks.some(
        (chunk) => typeof chunk.text === 'string'
      )
        ? textChunks.map((chunk) => chunk.text ?? '').join('')
        : undefined;
      newLocalItems[localID] = {
        ...localItem,
        item:
          accumulatedText === undefined
            ? localItem.item
            : { ...localItem.item, text: accumulatedText },
        ui_state: {
          ...localItem.ui_state,
          streamingState: { ...streamingState, chunks: [], isDone: true },
        },
      };
      changed = true;
    }

    if (!changed) {
      return state;
    }

    return { ...state, allMessageItemsByID: newLocalItems };
  },

  [ADD_MESSAGE]: (state: AppState, action: { message: Message }): AppState =>
    applyFullMessage(state, action.message),

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
    action: { addToIsLoading: number; message?: string }
  ): AppState => {
    const isMessageLoadingCounter = Math.max(
      state.assistantMessageState.isMessageLoadingCounter +
        action.addToIsLoading,
      0
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
    action: { addToIsHydrating: number }
  ): AppState => {
    return {
      ...state,
      assistantMessageState: {
        ...state.assistantMessageState,
        isHydratingCounter: Math.max(
          state.assistantMessageState.isHydratingCounter +
            action.addToIsHydrating,
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

  [UPDATE_CATASTROPHIC_ERROR_PANEL]: (
    state: AppState,
    action: { panelState: Partial<CatastrophicErrorPanelState> }
  ): AppState => ({
    ...state,
    catastrophicErrorPanelState: {
      ...state.catastrophicErrorPanelState,
      ...action.panelState,
    },
  }),

  [UPDATE_PERSISTED_STATE]: (
    state: AppState,
    action: { chatState: Partial<PersistedState> }
  ): AppState => ({
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      ...action.chatState,
    },
  }),

  [UPDATE_HAS_SENT_NON_WELCOME_MESSAGE]: (
    state: AppState,
    action: { hasSentNonWelcomeMessage: boolean }
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
    action: { isRestarting: boolean }
  ): AppState => ({
    ...state,
    isRestarting: action.isRestarting,
  }),

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

  [SET_MESSAGE_WAS_ANNOUNCED]: (
    state: AppState,
    action: { localMessageID: string }
  ): AppState => {
    // `wasAnnounced` outlives the clear, so an upsert that rebuilds the item knows not
    // to announce it again.
    const { localMessageID } = action;
    return applyLocalMessageUIState(
      applyLocalMessageUIState(
        state,
        localMessageID,
        'needsAnnouncement',
        false
      ),
      localMessageID,
      'wasAnnounced',
      true
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
    TPropertyName extends keyof MessageUIStateInternal,
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
    action: {
      messageID: string;
      history: MessageResponseHistory | MessageRequestHistory;
    }
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
      disclaimersAccepted: {
        ...state.persistedToBrowserStorage.disclaimersAccepted,
        [isBrowser() ? window.location.hostname : 'localhost']: true,
      },
    },
  }),

  [SET_HOME_SCREEN_IS_OPEN]: (
    state: AppState,
    { isOpen }: { isOpen: boolean }
  ) => setHomeScreenOpenState(state, isOpen),

  [TOGGLE_HOME_SCREEN]: (state: AppState) => {
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
    state: AppState,
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

  [SET_CHAT_MESSAGES_PROPERTY]: <TPropertyName extends keyof ChatMessagesState>(
    state: AppState,
    action: {
      propertyName: TPropertyName;
      propertyValue: ChatMessagesState[TPropertyName];
    }
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

  [CLOSE_IFRAME_PANEL]: (state: AppState) => {
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

  [SET_WORKSPACE_PANEL_OPEN]: (
    state: AppState,
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
    state: AppState,
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
    state: AppState,
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
    state: AppState,
    action: { isOpen: boolean }
  ): AppState => {
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
    state: AppState,
    action: { isMobile: boolean; isOpen?: boolean }
  ): AppState => {
    return {
      ...state,
      historyPanelState: {
        ...state.historyPanelState,
        isMobile: action.isMobile,
        isOpen: action.isOpen ?? state.historyPanelState.isOpen,
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
    const newLocalMessageIDs =
      state.assistantMessageState.localMessageIDs.filter(
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
      assistantMessageState: {
        ...state.assistantMessageState,
        localMessageIDs: newLocalMessageIDs,
      },
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

  [UPDATE_STRUCTURED_DATA]: (
    state: AppState,
    {
      structuredData,
      isInputToHumanAgent,
    }: {
      structuredData:
        import('../../types/messaging/Messages').StructuredData | undefined;
      isInputToHumanAgent: boolean;
    }
  ) => {
    const currentInputState = getInputState(state, isInputToHumanAgent);
    const nextInputState: InputState = {
      ...currentInputState,
      manualStructuredData: structuredData,
    };
    nextInputState.pendingStructuredData =
      rebuildPendingStructuredData(nextInputState);
    return applyInputState(state, nextInputState, isInputToHumanAgent);
  },

  [CLEAR_STRUCTURED_DATA]: (
    state: AppState,
    { isInputToHumanAgent }: { isInputToHumanAgent: boolean }
  ) => {
    const currentInputState = getInputState(state, isInputToHumanAgent);
    return applyInputState(
      state,
      {
        ...currentInputState,
        manualStructuredData: undefined,
        pendingUploads: [],
        pendingStructuredData: undefined,
      },
      isInputToHumanAgent
    );
  },

  [ADD_PENDING_UPLOAD]: (
    state: AppState,
    {
      upload,
      isInputToHumanAgent,
    }: { upload: PendingUpload; isInputToHumanAgent: boolean }
  ) => {
    const currentInputState = getInputState(state, isInputToHumanAgent);
    const nextInputState: InputState = {
      ...currentInputState,
      pendingUploads: [...currentInputState.pendingUploads, upload],
    };
    nextInputState.pendingStructuredData =
      rebuildPendingStructuredData(nextInputState);
    return applyInputState(state, nextInputState, isInputToHumanAgent);
  },

  [UPDATE_PENDING_UPLOAD]: (
    state: AppState,
    {
      uploadId,
      patch,
      isInputToHumanAgent,
    }: {
      uploadId: string;
      patch: Partial<PendingUpload>;
      isInputToHumanAgent: boolean;
    }
  ) => {
    const currentInputState = getInputState(state, isInputToHumanAgent);
    const nextUploads = currentInputState.pendingUploads.map((u) =>
      u.id === uploadId ? { ...u, ...patch } : u
    );
    const nextInputState: InputState = {
      ...currentInputState,
      pendingUploads: nextUploads,
    };
    nextInputState.pendingStructuredData =
      rebuildPendingStructuredData(nextInputState);
    return applyInputState(state, nextInputState, isInputToHumanAgent);
  },

  [REMOVE_PENDING_UPLOAD]: (
    state: AppState,
    {
      uploadId,
      isInputToHumanAgent,
    }: { uploadId: string; isInputToHumanAgent: boolean }
  ) => {
    const currentInputState = getInputState(state, isInputToHumanAgent);
    const nextUploads = currentInputState.pendingUploads.filter(
      (u) => u.id !== uploadId
    );
    const nextInputState: InputState = {
      ...currentInputState,
      pendingUploads: nextUploads,
    };
    nextInputState.pendingStructuredData =
      rebuildPendingStructuredData(nextInputState);
    return applyInputState(state, nextInputState, isInputToHumanAgent);
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

  [SET_STOP_STREAMING_BUTTON_VISIBLE]: (
    state: AppState,
    { isVisible }: { isVisible: boolean }
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
    { isDisabled }: { isDisabled: boolean }
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
    { currentStreamID }: { currentStreamID: string }
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

  [SET_ACTIVE_RESPONSE_ID]: (
    state: AppState,
    { activeResponseId }: { activeResponseId: string | null }
  ) => {
    return {
      ...state,
      assistantMessageState: {
        ...state.assistantMessageState,
        activeResponseId,
      },
    };
  },

  [UPDATE_THEME_STATE]: (
    state: AppState,
    { themeState }: { themeState: ThemeState }
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

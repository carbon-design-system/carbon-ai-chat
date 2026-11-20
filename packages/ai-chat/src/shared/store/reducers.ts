/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import type { StoreReduction } from './appStore';
import type { MessageOwnershipReceipt } from './messageOwnership';

import cloneDeep from 'lodash-es/cloneDeep.js';
import isEqual from 'lodash-es/isEqual.js';
import isPlainObject from 'lodash-es/isPlainObject.js';
import merge from 'lodash-es/merge.js';
import { DeepPartial } from '../../types/utilities/DeepPartial';

import { ConversationState } from '../../types/state/ConversationState';
import {
  AppStateMessages,
  ChatMessagesState,
} from '../../types/state/ChatMessagesState';
import { FileUpload } from '../../types/config/ServiceDeskConfig';
import {
  InputState,
  PendingUpload,
  PendingUploadStatus,
} from '../../types/state/InputState';
import { PersistedState } from '../../types/state/PersistedState';
import { ThemeState } from '../../types/state/ThemeState';
import {
  LocalMessageItem,
  LocalMessageUIState,
} from '../../types/messaging/LocalMessageItem';

import { FileStatusValue } from '../utils/constants';

import { isResponse } from '../utils/messageUtils';
import {
  ADD_INPUT_FILE,
  ADD_LOCAL_MESSAGE_ITEM,
  ADD_MESSAGE,
  CHANGE_STATE,
  CLEAR_INPUT_FILES,
  CLEAR_STRUCTURED_DATA,
  FILE_UPLOAD_INPUT_ERROR,
  HYDRATE_CHAT,
  HYDRATE_MESSAGE_HISTORY,
  MERGE_HISTORY,
  MESSAGE_SET_OPTION_SELECTED,
  REMOVE_INPUT_FILE,
  REMOVE_LOCAL_MESSAGE_ITEM,
  REMOVE_MESSAGES,
  RESTART_CONVERSATION,
  SET_APP_STATE_VALUE,
  SET_CHAT_MESSAGES_PROPERTY,
  SET_MESSAGE_RESPONSE_HISTORY_PROPERTY,
  SET_MESSAGE_UI_STATE_INTERNAL_PROPERTY,
  SET_MESSAGE_UI_PROPERTY,
  SET_MESSAGE_WAS_ANNOUNCED,
  SET_STOP_STREAMING_BUTTON_DISABLED,
  SET_STOP_STREAMING_BUTTON_METADATA_DISABLED,
  SET_STOP_STREAMING_BUTTON_VISIBLE,
  SET_STREAM_ID,
  SET_IS_RESTARTING,
  SET_ACTIVE_RESPONSE_ID,
  UPDATE_HAS_SENT_NON_WELCOME_MESSAGE,
  UPDATE_INPUT_STATE,
  UPDATE_LOCAL_MESSAGE_ITEM,
  UPDATE_STRUCTURED_DATA,
  UPDATE_MESSAGE,
  UPSERT_MESSAGE,
  END_MESSAGE_STREAMING,
  UPDATE_PERSISTED_STATE,
  RESET_PERSISTED_STATE,
  UPDATE_THEME_STATE,
  ADD_PENDING_UPLOAD,
  UPDATE_PENDING_UPLOAD,
  REMOVE_PENDING_UPLOAD,
  SET_CONVERSATION_LIFECYCLE,
} from './actions';

import type {
  MessageWriteOptions,
  ReceivedLocalItems,
} from './messageWriteTypes';

import { humanAgentReducers } from './humanAgentReducers';

import {
  applyAssistantMessageState,
  applyChunkWriteWithIdentity,
  applyFullMessageWithIdentity,
  applyLocalMessageUIState,
  computeLocalIDInsertionPoint,
  rebuildLocalItemsForUpsert,
  keepStreamedItemsOnly,
  keepPriorUIStateInternal,
  keepMessageRefIfUnchanged,
  DEFAULT_PERSISTED_TO_BROWSER,
} from './reducerUtils';

import {
  Message,
  MessageRequest,
  MessageResponse,
  MessageUIStateInternal,
  MessageResponseHistory,
  MessageRequestHistory,
} from '../../types/messaging/Messages';

type ReducerType = (
  state: ConversationState,
  action?: any
) => ConversationState;

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
 * Shows a local item, placed by {@link withLocalMessageID}, and replaces any local item
 * with its id. Nothing shows for a `history.silent` message.
 */
function applyLocalMessageItemWithOwnership(
  state: ConversationState,
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
): StoreReduction<ConversationState> {
  const full = addMessage
    ? applyFullMessageWithIdentity(state, message)
    : undefined;
  const withMessage = full ? full.state : state;
  const ownership: MessageOwnershipReceipt = {
    kind: 'addLocal',
    messageID: full?.messageID,
  };

  // If we receive back a silent message, we don't want to add to the store.
  if (message.history.silent) {
    return { state: withMessage, ownership };
  }

  const { id } = messageItem.ui_state;
  const newState: ConversationState = {
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
  // The local wrapper is an internal DTO; host callbacks receive its item only.
  ownership.local = { id, parentID: messageItem.fullMessageID };
  return { state: newState, ownership };
}

function applyLocalMessageItem(
  state: ConversationState,
  action: Parameters<typeof applyLocalMessageItemWithOwnership>[1]
): ConversationState {
  return applyLocalMessageItemWithOwnership(state, action).state;
}

/**
 * Applies a write from `addMessage` or `final_response` the way `ADD_MESSAGE` and
 * `ADD_LOCAL_MESSAGE_ITEM` did. The first write stores the message, makes it the active
 * response, and keeps only the streamed items the message still has. Each later write
 * shows one item, with the items nested in it, and changes nothing else about the message.
 */
function applyReceivedWrite(
  state: ConversationState,
  message: MessageResponse,
  { localItem, nestedLocalItems, addAfterID }: ReceivedLocalItems,
  messageID: string
): StoreReduction<ConversationState> {
  if (!localItem) {
    const full = applyFullMessageWithIdentity(
      keepStreamedItemsOnly(state, message),
      message
    );
    return {
      state: applyAssistantMessageState(full.state, {
        activeResponseId: message.id,
      }),
      ownership: { kind: 'upsert', messageID: full.messageID },
    };
  }

  const allMessageItemsByID = { ...state.allMessageItemsByID };
  nestedLocalItems.forEach((nested) => {
    allMessageItemsByID[nested.ui_state.id] = nested;
  });
  return {
    state: applyLocalMessageItem(
      { ...state, allMessageItemsByID },
      { messageItem: localItem, message, addMessage: false, addAfterID }
    ),
    ownership: { kind: 'upsert', messageID },
  };
}

// Keep unchanged branches stable while preserving the existing index-wise array patch behavior.
function mergeStatePatch(currentValue: unknown, patchValue: unknown): unknown {
  if (patchValue === undefined || Object.is(currentValue, patchValue)) {
    return currentValue;
  }

  if (Array.isArray(patchValue)) {
    const currentArray = Array.isArray(currentValue) ? currentValue : [];
    let nextArray = currentArray;

    Object.keys(patchValue).forEach((key) => {
      const index = Number(key);
      const currentItem = currentArray[index];
      const nextItem = mergeStatePatch(currentItem, patchValue[index]);
      if (!Object.is(currentItem, nextItem)) {
        if (nextArray === currentArray) {
          nextArray = currentArray.slice();
        }
        nextArray[index] = nextItem;
      }
    });

    return nextArray;
  }

  if (isPlainObject(patchValue)) {
    const currentObject = isPlainObject(currentValue)
      ? (currentValue as Record<string, unknown>)
      : {};
    let nextObject = currentObject;

    Object.keys(patchValue).forEach((key) => {
      const currentItem = currentObject[key];
      const nextItem = mergeStatePatch(
        currentItem,
        (patchValue as Record<string, unknown>)[key]
      );
      if (!Object.is(currentItem, nextItem)) {
        if (nextObject === currentObject) {
          nextObject = { ...currentObject };
        }
        nextObject[key] = nextItem;
      }
    });

    return nextObject;
  }

  return patchValue;
}

const stateReducers: { [key: string]: ReducerType } = {
  [CHANGE_STATE]: (
    state: ConversationState,
    action: { partialState: DeepPartial<ConversationState> }
  ): ConversationState => {
    const { partialState } = action;
    if (!partialState) {
      return state;
    }

    if (Object.is(partialState as unknown, state)) {
      return state;
    }

    const { config, ...rest } = partialState;
    let nextState = mergeStatePatch(state, rest) as ConversationState;

    // Handle config separately because callers sometimes pass a completely rebuilt AppConfig (for example after
    // recomputing derived fields based on a new PublicConfig). A blind deep merge would blend the new tree with the
    // previous one, leaving behind stale nested values. By detecting a full config payload and replacing it wholesale
    // we ensure each update starts from a clean AppConfig while still allowing partial config updates (e.g.
    // `config: { derived: { header: ... } }`) to merge as before.
    if (config !== undefined) {
      if (config && Object.prototype.hasOwnProperty.call(config, 'public')) {
        if (!isEqual(state.config, config)) {
          nextState = {
            ...nextState,
            config: config as ConversationState['config'],
          };
        }
      } else if (config) {
        const nextConfig = mergeStatePatch(nextState.config, config);
        if (nextConfig !== nextState.config) {
          nextState = {
            ...nextState,
            config: nextConfig as ConversationState['config'],
          };
        }
      } else if (config !== nextState.config) {
        nextState = {
          ...nextState,
          config: config as ConversationState['config'],
        };
      }
    }

    return nextState;
  },

  [HYDRATE_CHAT]: (state: ConversationState): ConversationState => ({
    ...state,
    isHydrated: true,
  }),

  // The view partition resets its panels and home screen on the same action.
  [RESTART_CONVERSATION]: (state: ConversationState): ConversationState => ({
    ...state,
    assistantMessageState: {
      ...state.assistantMessageState,
      localMessageIDs: [],
      messageIDs: [],
      activeResponseId: null,
    },
    allMessageItemsByID: {},
    allMessagesByID: {},
    isHydrated: false,
  }),

  [SET_CONVERSATION_LIFECYCLE]: (
    state: ConversationState,
    action: {
      status: ConversationState['conversationStatus'];
      error: ConversationState['conversationError'];
    }
  ): ConversationState => ({
    ...state,
    conversationStatus: action.status,
    conversationError: action.error,
  }),

  [HYDRATE_MESSAGE_HISTORY]: (
    state: ConversationState,
    action: { messageHistory: AppStateMessages }
  ): ConversationState => {
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

  [END_MESSAGE_STREAMING]: (
    state: ConversationState,
    action: { messageID: string }
  ): ConversationState => {
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

  [MESSAGE_SET_OPTION_SELECTED]: (
    state: ConversationState,
    action: { sentMessage: MessageRequest; messageID: string }
  ): ConversationState => {
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

  [SET_APP_STATE_VALUE]: (
    state: ConversationState,
    action: { key: keyof ConversationState; value: any }
  ): ConversationState =>
    // Keys the conversation doesn't hold belong to a partition's reducer.
    action.key in state ? { ...state, [action.key]: action.value } : state,

  [UPDATE_PERSISTED_STATE]: (
    state: ConversationState,
    action: { chatState: Partial<PersistedState> }
  ): ConversationState => {
    // The view partition applies the saved fields it holds.
    const { hasSentNonWelcomeMessage, humanAgentState } = action.chatState;
    return {
      ...state,
      persistedToBrowserStorage: {
        ...state.persistedToBrowserStorage,
        ...(hasSentNonWelcomeMessage !== undefined && {
          hasSentNonWelcomeMessage,
        }),
        ...(humanAgentState !== undefined && { humanAgentState }),
      },
    };
  },

  [RESET_PERSISTED_STATE]: (
    state: ConversationState,
    _action: { keepOpenState: boolean }
  ): ConversationState => ({
    ...state,
    persistedToBrowserStorage: {
      hasSentNonWelcomeMessage:
        DEFAULT_PERSISTED_TO_BROWSER.hasSentNonWelcomeMessage,
      humanAgentState: cloneDeep(DEFAULT_PERSISTED_TO_BROWSER.humanAgentState),
    },
  }),

  [UPDATE_HAS_SENT_NON_WELCOME_MESSAGE]: (
    state: ConversationState,
    action: { hasSentNonWelcomeMessage: boolean }
  ): ConversationState => {
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
    state: ConversationState,
    action: { isRestarting: boolean }
  ): ConversationState => ({
    ...state,
    isRestarting: action.isRestarting,
  }),

  [SET_MESSAGE_UI_PROPERTY]: <TPropertyName extends keyof LocalMessageUIState>(
    state: ConversationState,
    action: {
      localMessageID: string;
      propertyName: TPropertyName;
      propertyValue: LocalMessageUIState[TPropertyName];
    }
  ): ConversationState => {
    return applyLocalMessageUIState(
      state,
      action.localMessageID,
      action.propertyName,
      action.propertyValue
    );
  },

  [SET_MESSAGE_WAS_ANNOUNCED]: (
    state: ConversationState,
    action: { localMessageID: string }
  ): ConversationState => {
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
    state: ConversationState,
    action: {
      messageID: string;
      propertyName: TPropertyName;
      propertyValue: MessageResponseHistory[TPropertyName];
    }
  ): ConversationState => {
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
    state: ConversationState,
    action: {
      messageID: string;
      propertyName: TPropertyName;
      propertyValue: MessageUIStateInternal[TPropertyName];
    }
  ): ConversationState => {
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
    state: ConversationState,
    action: {
      messageID: string;
      history: MessageResponseHistory | MessageRequestHistory;
    }
  ): ConversationState => {
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

  [SET_CHAT_MESSAGES_PROPERTY]: <TPropertyName extends keyof ChatMessagesState>(
    state: ConversationState,
    action: {
      propertyName: TPropertyName;
      propertyValue: ChatMessagesState[TPropertyName];
    }
  ) => {
    return applyAssistantMessageState(state, {
      [action.propertyName]: action.propertyValue,
    });
  },

  [UPDATE_INPUT_STATE]: (
    state: ConversationState,
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

  [ADD_INPUT_FILE]: (
    state: ConversationState,
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
    state: ConversationState,
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

  [CLEAR_INPUT_FILES]: (
    state: ConversationState,
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
    state: ConversationState,
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
    state: ConversationState,
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
    state: ConversationState,
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
    state: ConversationState,
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
    state: ConversationState,
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
    state: ConversationState,
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

  [SET_STOP_STREAMING_BUTTON_VISIBLE]: (
    state: ConversationState,
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
    state: ConversationState,
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

  [SET_STOP_STREAMING_BUTTON_METADATA_DISABLED]: (
    state: ConversationState,
    { isMetadataDisabled }: { isMetadataDisabled: boolean }
  ) => ({
    ...state,
    assistantInputState: {
      ...state.assistantInputState,
      stopStreamingButtonState: {
        ...state.assistantInputState.stopStreamingButtonState,
        isMetadataDisabled,
      },
    },
  }),

  [SET_STREAM_ID]: (
    state: ConversationState,
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
    state: ConversationState,
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
    state: ConversationState,
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
  state: ConversationState,
  newInputState: InputState,
  isInputToHumanAgent: boolean
): ConversationState {
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
function getInputState(state: ConversationState, isInputToHumanAgent: boolean) {
  return isInputToHumanAgent
    ? state.humanAgentState.inputState
    : state.assistantInputState;
}

// Merge in the other reducers.
Object.assign(stateReducers, humanAgentReducers);

const ownershipReducers: {
  [key: string]: (
    state: ConversationState,
    action: any
  ) => StoreReduction<ConversationState>;
} = {
  [ADD_LOCAL_MESSAGE_ITEM]: (
    state: ConversationState,
    action: {
      messageItem: LocalMessageItem;
      message: Message;
      addMessage: boolean;
      addAfterID: string;
    }
  ): StoreReduction<ConversationState> =>
    applyLocalMessageItemWithOwnership(state, action),
  [REMOVE_MESSAGES]: (
    state: ConversationState,
    { messageIDs }: { messageIDs: string[] }
  ): StoreReduction<ConversationState> => {
    const idsSet = new Set(messageIDs);
    const removedMessages: string[] = [];
    const removedLocals: string[] = [];

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
          removedLocals.push(messageItemID);
        }
        return !removeItem;
      });

    // Remove the message objects from the map.
    messageIDs.forEach((messageID) => {
      delete newAllMessages[messageID];
      removedMessages.push(messageID);
    });

    const newState: ConversationState = {
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

    return {
      state: newState,
      ownership: {
        kind: 'remove',
        messageIDs: removedMessages,
        localIDs: removedLocals,
      },
    };
  },
  [UPDATE_LOCAL_MESSAGE_ITEM]: (
    state: ConversationState,
    action: { messageItem: LocalMessageItem }
  ): StoreReduction<ConversationState> => {
    const { messageItem } = action;
    let localID: string;
    const nextState = {
      ...state,
      allMessageItemsByID: {
        ...state.allMessageItemsByID,
        [(localID = messageItem.ui_state.id)]: messageItem,
      },
    };
    return {
      state: nextState,
      ownership: {
        kind: 'updateLocal',
        localID,
        parentID: messageItem.fullMessageID,
      },
    };
  },
  [UPDATE_MESSAGE]: (
    state: ConversationState,
    action: { message: Message }
  ): StoreReduction<ConversationState> => {
    const { message } = action;
    let messageID: string;
    const nextState = {
      ...state,
      allMessagesByID: {
        ...state.allMessagesByID,
        [(messageID = message.id)]: message,
      },
    };
    return {
      state: nextState,
      ownership: { kind: 'updateMessage', messageID },
    };
  },
  [UPSERT_MESSAGE]: (
    state: ConversationState,
    action: {
      message: Message;
      isStreaming?: boolean;
      holdFromIndex?: number;
      options?: MessageWriteOptions;
    }
  ): StoreReduction<ConversationState> => {
    const { message, isStreaming = false, holdFromIndex, options } = action;
    const messageID = message.id;

    if (!isResponse(message)) {
      return { state };
    }

    const ownership: MessageOwnershipReceipt = { kind: 'upsert', messageID };

    // Until `final_response`, a chunk stream keeps the rules it has always had.
    if (options?.origin === 'chunk' && isStreaming) {
      const result = applyChunkWriteWithIdentity(state, message, options.chunk);
      return {
        state: result.state,
        ownership: { kind: 'upsert', messageID: result.messageID },
      };
    }

    // A message from `addMessage` or `final_response` keeps the rules it has always had.
    if (options?.received) {
      return applyReceivedWrite(state, message, options.received, messageID);
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
        holdFromIndex,
        options?.pauseReveal
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

    const newState: ConversationState = {
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

    return { state: newState, ownership };
  },
  [ADD_MESSAGE]: (
    state: ConversationState,
    action: { message: Message }
  ): StoreReduction<ConversationState> => {
    const result = applyFullMessageWithIdentity(state, action.message);
    return {
      state: result.state,
      ownership: { kind: 'addMessage', messageID: result.messageID },
    };
  },
  [REMOVE_LOCAL_MESSAGE_ITEM]: (
    state: ConversationState,
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
    const nextState = {
      ...state,
      allMessageItemsByID,
      assistantMessageState: {
        ...state.assistantMessageState,
        localMessageIDs: newLocalMessageIDs,
      },
    };
    return {
      state: nextState,
      ownership: { kind: 'removeLocal', localID: localMessageItemID },
    };
  },
  [RESTART_CONVERSATION]: (state, action) => ({
    state: stateReducers[RESTART_CONVERSATION](state, action),
    ownership: { kind: 'reset' },
  }),
  [HYDRATE_MESSAGE_HISTORY]: (state, action) => ({
    state: stateReducers[HYDRATE_MESSAGE_HISTORY](state, action),
    ownership: { kind: 'history' },
  }),
};

const reductions: typeof ownershipReducers = {
  ...Object.fromEntries(
    Object.entries(stateReducers).map(([type, reduce]) => [
      type,
      (state: ConversationState, action: any) => ({
        state: reduce(state, action),
      }),
    ])
  ),
  ...ownershipReducers,
};

const reducers: { [key: string]: ReducerType } = Object.fromEntries(
  Object.entries(reductions).map(([type, reduce]) => [
    type,
    (state: ConversationState, action: any) => reduce(state, action).state,
  ])
);

/** Selects the same reducer at the same action-type reads as the state-only root. */
function reduceWithMessageOwnership(
  state: ConversationState,
  action: { type: string; [key: string]: unknown } | undefined
): StoreReduction<ConversationState> {
  return action && reductions[action.type]
    ? reductions[action.type](state, action)
    : { state };
}

export { reducers, ReducerType, reduceWithMessageOwnership };

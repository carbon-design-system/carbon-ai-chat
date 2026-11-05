/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ADD_MESSAGE,
  ADD_LOCAL_MESSAGE_ITEM,
  UPSERT_MESSAGE,
  HYDRATE_MESSAGE_HISTORY,
  REMOVE_MESSAGES,
  REMOVE_LOCAL_MESSAGE_ITEM,
  RESTART_CONVERSATION,
  UPDATE_MESSAGE,
  UPDATE_LOCAL_MESSAGE_ITEM,
} from './messageActionTypes';

import { DeepPartial } from '../../types/utilities/DeepPartial';

import type { MessageWriteOptions } from './messageWriteTypes';

import {
  ConversationState,
  AppStateMessages,
  ChatMessagesState,
  FileUpload,
  InputState,
  PersistedState,
  ThemeState,
} from '../../types/state/AppState';
import type { StructuredData } from '../../types/messaging/Messages';

import type { ConversationStatus } from '../../types/instance/PublicChatState';

import {
  LocalMessageItem,
  LocalMessageUIState,
  MessageErrorState,
} from '../../types/messaging/LocalMessageItem';

import {
  Message,
  MessageRequest,
  MessageRequestHistory,
  MessageResponseHistory,
  MessageUIStateInternal,
} from '../../types/messaging/Messages';

const CHANGE_STATE = 'CHANGE_STATE';
const HYDRATE_CHAT = 'HYDRATE_CHAT';
const SET_APP_STATE_VALUE = 'SET_APP_STATE_VALUE';
const MESSAGE_SET_OPTION_SELECTED = 'MESSAGE_SET_OPTION_SELECTED';
const SET_MESSAGE_UI_PROPERTY = 'SET_MESSAGE_UI_PROPERTY';
const SET_MESSAGE_WAS_ANNOUNCED = 'SET_MESSAGE_WAS_ANNOUNCED';
const SET_MESSAGE_UI_STATE_INTERNAL_PROPERTY =
  'SET_MESSAGE_UI_STATE_INTERNAL_PROPERTY';
const SET_MESSAGE_RESPONSE_HISTORY_PROPERTY =
  'SET_MESSAGE_RESPONSE_HISTORY_PROPERTY';
const MERGE_HISTORY = 'MERGE_HISTORY';
const SET_CHAT_MESSAGES_PROPERTY = 'SET_CHAT_MESSAGES_PROPERTY';
const UPDATE_HAS_SENT_NON_WELCOME_MESSAGE =
  'UPDATE_HAS_SENT_NON_WELCOME_MESSAGE';
const UPDATE_PERSISTED_STATE = 'UPDATE_PERSISTED_STATE';
const RESET_PERSISTED_STATE = 'RESET_PERSISTED_STATE';
const END_MESSAGE_STREAMING = 'END_MESSAGE_STREAMING';
const UPDATE_INPUT_STATE = 'UPDATE_INPUT_STATE';
const ADD_INPUT_FILE = 'ADD_INPUT_FILE';
const CLEAR_INPUT_FILES = 'CLEAR_INPUT_FILES';
const REMOVE_INPUT_FILE = 'REMOVE_INPUT_FILE';
const FILE_UPLOAD_INPUT_ERROR = 'FILE_UPLOAD_INPUT_ERROR';
const SET_STOP_STREAMING_BUTTON_VISIBLE = 'SET_STOP_STREAMING_BUTTON_VISIBLE';
const SET_STOP_STREAMING_BUTTON_DISABLED = 'SET_STOP_STREAMING_BUTTON_DISABLED';
const SET_STOP_STREAMING_BUTTON_METADATA_DISABLED =
  'SET_STOP_STREAMING_BUTTON_METADATA_DISABLED';
const SET_STREAM_ID = 'SET_STREAM_ID';
const UPDATE_THEME_STATE = 'UPDATE_THEME_STATE';
const SET_IS_RESTARTING = 'SET_IS_RESTARTING';
const SET_ACTIVE_RESPONSE_ID = 'SET_ACTIVE_RESPONSE_ID';
const UPDATE_STRUCTURED_DATA = 'UPDATE_STRUCTURED_DATA';
const CLEAR_STRUCTURED_DATA = 'CLEAR_STRUCTURED_DATA';
const ADD_PENDING_UPLOAD = 'ADD_PENDING_UPLOAD';
const UPDATE_PENDING_UPLOAD = 'UPDATE_PENDING_UPLOAD';
const REMOVE_PENDING_UPLOAD = 'REMOVE_PENDING_UPLOAD';
const SET_CONVERSATION_LIFECYCLE = 'SET_CONVERSATION_LIFECYCLE';

interface UnknownAction {
  type: string;
  // Optionally, include any unknown payload or meta fields if desired
  [extraProps: string]: any;
}

const actions = {
  /**
   * Allows you to change any portion of the app state.
   */
  changeState(partialState: DeepPartial<ConversationState>): UnknownAction {
    // Using "UnknownAction" here seems to be required or our dts bundler blows up on this with a "this node exceeds the
    // maximum length" error.
    return { type: CHANGE_STATE, partialState };
  },

  chatWasHydrated() {
    return { type: HYDRATE_CHAT };
  },

  /**
   * Replaces the transcript with loaded history. `insertsHistory` is true when
   * the history was merged in front of the current transcript instead.
   */
  hydrateMessageHistory(
    messageHistory: AppStateMessages,
    insertsHistory = false
  ) {
    return { type: HYDRATE_MESSAGE_HISTORY, messageHistory, insertsHistory };
  },

  removeMessages(messageIDs: string[]) {
    return { type: REMOVE_MESSAGES, messageIDs };
  },

  restartConversation() {
    return {
      type: RESTART_CONVERSATION,
    };
  },

  /**
   * Adds the given message item to the message list. If the message item is already in the list, it will not be
   * added again and will be left at its current position (unless addAfterID is provided) but the contents of the
   * message will be replaced with the new item.
   *
   * @param messageItem The message item to add or replaced.
   * @param message The full message the item belongs to.
   * @param addMessage Indicates if the full message should also be added to the store along with the item.
   * @param addAfterID Indicates if the message item should be inserted immediately after another item that may
   * already be in the list. If this value is not provided, the item will be inserted at the end of the list (if it
   * does not already exist in the list).
   */
  addLocalMessageItem(
    messageItem: LocalMessageItem,
    message: Message,
    addMessage: boolean,
    addAfterID?: string
  ) {
    return {
      type: ADD_LOCAL_MESSAGE_ITEM,
      messageItem,
      message,
      addMessage,
      addAfterID,
    };
  },

  /**
   * Adds the given message to the message list.
   */
  addMessage(message: Message) {
    return { type: ADD_MESSAGE, message };
  },

  updateLocalMessageItem(messageItem: LocalMessageItem) {
    return { type: UPDATE_LOCAL_MESSAGE_ITEM, messageItem };
  },

  updateMessage(message: Message) {
    return { type: UPDATE_MESSAGE, message };
  },

  /**
   * Replaces or inserts the given assistant {@link MessageResponse} in the store, keyed
   * by `message.id`. The reducer preserves position in the message ordering and reuses
   * existing `LocalMessageItem` references for items deep-equal to their predecessor so
   * components that subscribe to unchanged siblings do not re-render.
   */
  upsertMessage(
    message: Message,
    isStreaming = false,
    holdFromIndex?: number,
    options?: MessageWriteOptions
  ) {
    return {
      type: UPSERT_MESSAGE,
      message,
      isStreaming,
      holdFromIndex,
      options,
    };
  },

  /**
   * Marks every local item belonging to `messageID` as no longer streaming.
   *
   * Streaming UI (the markdown element's in-progress table treatment, for one) keys off
   * `ui_state.streamingState.isDone`. Reaching that state used to depend on the host
   * sending a `complete_item` or `final_response` chunk, so a stream that ended any other
   * way — the user pressing stop, `customSendMessage` throwing, a timeout — left items
   * stuck mid-stream forever. Dispatch this wherever a stream terminates so the end state
   * does not depend on host cooperation.
   */
  endMessageStreaming(messageID: string) {
    return { type: END_MESSAGE_STREAMING, messageID };
  },

  messageSetOptionSelected(messageID: string, sentMessage: MessageRequest) {
    return {
      type: MESSAGE_SET_OPTION_SELECTED,
      messageID,
      sentMessage,
    };
  },

  updatePersistedState(chatState: Partial<PersistedState>) {
    return {
      type: UPDATE_PERSISTED_STATE,
      chatState,
    };
  },

  /**
   * Returns the saved session state to its defaults. The main window and
   * launcher keep their state when `keepOpenState` is true; otherwise the
   * launcher shows.
   */
  resetPersistedState(keepOpenState: boolean) {
    return {
      type: RESET_PERSISTED_STATE,
      keepOpenState,
    };
  },

  updateHasSentNonWelcomeMessage(hasSentNonWelcomeMessage: boolean) {
    return {
      type: UPDATE_HAS_SENT_NON_WELCOME_MESSAGE,
      hasSentNonWelcomeMessage,
    };
  },

  setAppStateValue<K extends keyof ConversationState>(
    key: K,
    value: ConversationState[K]
  ) {
    return {
      type: SET_APP_STATE_VALUE,
      key,
      value,
    };
  },

  setConversationLifecycle(status: ConversationStatus) {
    return { type: SET_CONVERSATION_LIFECYCLE, status };
  },

  setActiveResponseId(activeResponseId: string | null) {
    return {
      type: SET_ACTIVE_RESPONSE_ID,
      activeResponseId,
    };
  },

  /**
   * Sets the give property of the {@link LocalMessageUIState} associated with the message of the given ID to the
   * given value.
   *
   * @param localMessageID The ID of the message to update.
   * @param propertyName The name of the property to update.
   * @param propertyValue The value to set on the property.
   */
  setMessageUIProperty<TPropertyName extends keyof LocalMessageUIState>(
    localMessageID: string,
    propertyName: TPropertyName,
    propertyValue: LocalMessageUIState[TPropertyName]
  ) {
    return {
      type: SET_MESSAGE_UI_PROPERTY,
      localMessageID,
      propertyName,
      propertyValue,
    };
  },

  /**
   * Sets the give property of the {@link MessageHistory} associated with the message of the given ID to the given
   * value.
   *
   * @param messageID The ID of the message to update.
   * @param propertyName The name of the property to update.
   * @param propertyValue The value to set on the property.
   */
  setMessageResponseHistoryProperty<
    TPropertyName extends keyof MessageResponseHistory,
  >(
    messageID: string,
    propertyName: TPropertyName,
    propertyValue: MessageResponseHistory[TPropertyName]
  ) {
    return {
      type: SET_MESSAGE_RESPONSE_HISTORY_PROPERTY,
      messageID,
      propertyName,
      propertyValue,
    };
  },

  /**
   * Sets the give property of the {@link MessageUIStateInternal} associated with the message of the given ID to the given
   * value.
   *
   * @param messageID The ID of the message to update.
   * @param propertyName The name of the property to update.
   * @param propertyValue The value to set on the property.
   */
  setMessageUIStateInternalProperty<
    TPropertyName extends keyof MessageUIStateInternal,
  >(
    messageID: string,
    propertyName: TPropertyName,
    propertyValue: MessageUIStateInternal[TPropertyName]
  ) {
    return {
      type: SET_MESSAGE_UI_STATE_INTERNAL_PROPERTY,
      messageID,
      propertyName,
      propertyValue,
    };
  },

  /**
   * Merges the given object into the history for the given message.
   */
  mergeMessageHistory(
    messageID: string,
    history: MessageResponseHistory | MessageRequestHistory
  ) {
    return { type: MERGE_HISTORY, messageID, history };
  },

  setMessageErrorState(messageID: string, errorState: MessageErrorState) {
    return actions.setMessageResponseHistoryProperty(
      messageID,
      'error_state',
      errorState
    );
  },

  /**
   * Marks the given message to indicate that it has been announced and doesn't need to be announced again.
   */
  setMessageWasAnnounced(messageID: string) {
    return { type: SET_MESSAGE_WAS_ANNOUNCED, localMessageID: messageID };
  },

  /**
   * Sets the property on one of the {@link ChatMessagesState} values.
   */
  setChatMessagesStateProperty<TPropertyName extends keyof ChatMessagesState>(
    propertyName: TPropertyName,
    propertyValue: ChatMessagesState[TPropertyName]
  ) {
    return { type: SET_CHAT_MESSAGES_PROPERTY, propertyName, propertyValue };
  },

  /**
   * Updates the state of the input field.
   */
  updateInputState(
    newState: Partial<InputState>,
    isInputToHumanAgent: boolean
  ) {
    return { type: UPDATE_INPUT_STATE, newState, isInputToHumanAgent };
  },

  /**
   * Adds a new file to the input area for uploaded.
   */
  addInputFile(file: FileUpload, isInputToHumanAgent: boolean) {
    return { type: ADD_INPUT_FILE, file, isInputToHumanAgent };
  },

  /**
   * Removes a file attachment from the upload attachments area.
   */
  removeFileUpload(fileID: string, isInputToHumanAgent: boolean) {
    return { type: REMOVE_INPUT_FILE, fileID, isInputToHumanAgent };
  },

  /**
   * Removes the local message item with the given ID from the message list.
   */
  removeLocalMessageItem(localMessageItemID: string) {
    return { type: REMOVE_LOCAL_MESSAGE_ITEM, localMessageItemID };
  },

  /**
   * Updates the input area to indicate that a file upload is in error.
   */
  fileUploadInputError(
    fileID: string,
    errorMessage: string,
    isInputToHumanAgent: boolean
  ) {
    return {
      type: FILE_UPLOAD_INPUT_ERROR,
      fileID,
      errorMessage,
      isInputToHumanAgent,
    };
  },

  /**
   * Removes all the files from the input area.
   */
  clearInputFiles(isInputToHumanAgent: boolean) {
    return { type: CLEAR_INPUT_FILES, isInputToHumanAgent };
  },

  setStopStreamingButtonVisible(isVisible: boolean) {
    return { type: SET_STOP_STREAMING_BUTTON_VISIBLE, isVisible };
  },

  setStopStreamingButtonDisabled(isDisabled: boolean) {
    return { type: SET_STOP_STREAMING_BUTTON_DISABLED, isDisabled };
  },

  setStopStreamingButtonMetadataDisabled(isMetadataDisabled: boolean) {
    return {
      type: SET_STOP_STREAMING_BUTTON_METADATA_DISABLED,
      isMetadataDisabled,
    };
  },

  setStreamID(currentStreamID: string) {
    return { type: SET_STREAM_ID, currentStreamID };
  },

  setIsRestarting(isRestarting: boolean) {
    return { type: SET_IS_RESTARTING, isRestarting };
  },

  updateThemeState(themeState: ThemeState) {
    return { type: UPDATE_THEME_STATE, themeState };
  },

  /**
   * Updates the pending structured data in the input state. The updater function receives the current
   * pending structured data and should return the new value (or undefined to clear it).
   */
  updateStructuredData(
    structuredData: StructuredData | undefined,
    isInputToHumanAgent: boolean
  ) {
    return {
      type: UPDATE_STRUCTURED_DATA,
      structuredData,
      isInputToHumanAgent,
    };
  },

  /**
   * Clears the pending structured data from the input state after it has been merged into an outgoing message.
   * Also clears all pending uploads and manual structured data.
   */
  clearStructuredData(isInputToHumanAgent: boolean) {
    return { type: CLEAR_STRUCTURED_DATA, isInputToHumanAgent };
  },

  /**
   * Adds a new pending upload entry to the input state.
   */
  addPendingUpload(
    upload: import('../../types/state/AppState').PendingUpload,
    isInputToHumanAgent: boolean
  ) {
    return { type: ADD_PENDING_UPLOAD, upload, isInputToHumanAgent };
  },

  /**
   * Updates an existing pending upload entry (e.g. to mark it complete or errored).
   */
  updatePendingUpload(
    uploadId: string,
    patch: Partial<import('../../types/state/AppState').PendingUpload>,
    isInputToHumanAgent: boolean
  ) {
    return {
      type: UPDATE_PENDING_UPLOAD,
      uploadId,
      patch,
      isInputToHumanAgent,
    };
  },

  /**
   * Removes a pending upload entry by ID (e.g. when the user deletes an attachment).
   */
  removePendingUpload(uploadId: string, isInputToHumanAgent: boolean) {
    return { type: REMOVE_PENDING_UPLOAD, uploadId, isInputToHumanAgent };
  },
};

export default actions;

export {
  CHANGE_STATE,
  SET_APP_STATE_VALUE,
  ADD_LOCAL_MESSAGE_ITEM,
  UPDATE_LOCAL_MESSAGE_ITEM,
  HYDRATE_MESSAGE_HISTORY,
  HYDRATE_CHAT,
  MESSAGE_SET_OPTION_SELECTED,
  SET_MESSAGE_UI_PROPERTY,
  SET_MESSAGE_WAS_ANNOUNCED,
  RESTART_CONVERSATION,
  ADD_MESSAGE,
  UPDATE_HAS_SENT_NON_WELCOME_MESSAGE,
  UPDATE_PERSISTED_STATE,
  RESET_PERSISTED_STATE,
  SET_MESSAGE_RESPONSE_HISTORY_PROPERTY,
  UPDATE_MESSAGE,
  UPSERT_MESSAGE,
  END_MESSAGE_STREAMING,
  SET_CHAT_MESSAGES_PROPERTY,
  UPDATE_INPUT_STATE,
  ADD_INPUT_FILE,
  REMOVE_INPUT_FILE,
  FILE_UPLOAD_INPUT_ERROR,
  CLEAR_INPUT_FILES,
  REMOVE_LOCAL_MESSAGE_ITEM,
  REMOVE_MESSAGES,
  MERGE_HISTORY,
  SET_STOP_STREAMING_BUTTON_VISIBLE,
  SET_STOP_STREAMING_BUTTON_DISABLED,
  SET_STOP_STREAMING_BUTTON_METADATA_DISABLED,
  SET_STREAM_ID,
  UPDATE_THEME_STATE,
  SET_MESSAGE_UI_STATE_INTERNAL_PROPERTY,
  SET_IS_RESTARTING,
  ADD_PENDING_UPLOAD,
  UPDATE_PENDING_UPLOAD,
  REMOVE_PENDING_UPLOAD,
  SET_ACTIVE_RESPONSE_ID,
  UPDATE_STRUCTURED_DATA,
  CLEAR_STRUCTURED_DATA,
  SET_CONVERSATION_LIFECYCLE,
};

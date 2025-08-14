/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { DeepPartial } from "../../../types/utilities/DeepPartial";

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
  MessageErrorState,
} from "../../../types/messaging/LocalMessageItem";
import ObjectMap from "../../../types/utilities/ObjectMap";
import { uuid } from "../utils/lang/uuid";
import { ChatHeaderAvatarConfig } from "../../../types/instance/ChatInstance";
import {
  ConversationalSearchItemCitation,
  GenericItem,
  IFrameItem,
  Message,
  MessageRequest,
  MessageRequestHistory,
  MessageResponseHistory,
  MessageResponseOptions,
  MessageUIStateInternal,
  SearchResult,
} from "../../../types/messaging/Messages";
import { WhiteLabelTheme } from "../../../types/config/PublicConfig";
import { HomeScreenConfig } from "../../../types/config/HomeScreenConfig";
import {
  LauncherType,
  NotificationMessage,
} from "../../../types/instance/apiTypes";
import { ChatHeaderConfig } from "../../../types/config/ChatHeaderConfig";

const CHANGE_STATE = "CHANGE_STATE";
const UPDATE_BOT_NAME = "UPDATE_BOT_NAME";
const UPDATE_BOT_AVATAR_URL = "UPDATE_BOT_AVATAR_URL";
const UPDATE_LAUNCHER_AVATAR_URL = "UPDATE_LAUNCHER_AVATAR_URL";
const UPDATE_MAIN_HEADER_TITLE = "UPDATE_MAIN_HEADER_TITLE";
const HYDRATE_CHAT = "HYDRATE_CHAT";
const HYDRATE_MESSAGE_HISTORY = "HYDRATE_MESSAGE_HISTORY";
const ADD_LOCAL_MESSAGE_ITEM = "ADD_LOCAL_MESSAGE_ITEM";
const REMOVE_MESSAGES = "REMOVE_MESSAGES";
const UPDATE_LOCAL_MESSAGE_ITEM = "UPDATE_LOCAL_MESSAGE_ITEM";
const SET_APP_STATE_VALUE = "SET_APP_STATE_VALUE";
const ADD_IS_TYPING_COUNTER = "ADD_IS_TYPING_COUNTER";
const ADD_IS_LOADING_COUNTER = "ADD_IS_LOADING_COUNTER";
const ADD_IS_HYDRATING_COUNTER = "ADD_IS_HYDRATING_COUNTER";
const SET_VIEW_STATE = "SET_VIEW_STATE";
const SET_VIEW_CHANGING = "SET_VIEW_CHANGING";
const SET_INITIAL_VIEW_CHANGE_COMPLETE = "SET_INITIAL_VIEW_CHANGE_COMPLETE";
const UPDATE_CSS_VARIABLES = "UPDATE_CSS_VARIABLES";
const MESSAGE_SET_OPTION_SELECTED = "MESSAGE_SET_OPTION_SELECTED";
const SET_MESSAGE_UI_PROPERTY = "SET_MESSAGE_UI_PROPERTY";
const SET_MESSAGE_UI_STATE_INTERNAL_PROPERTY =
  "SET_MESSAGE_UI_STATE_INTERNAL_PROPERTY";
const SET_MESSAGE_RESPONSE_HISTORY_PROPERTY =
  "SET_MESSAGE_RESPONSE_HISTORY_PROPERTY";
const MERGE_HISTORY = "MERGE_HISTORY";
const SET_LAUNCHER_PROPERTY = "SET_LAUNCHER_PROPERTY";
const SET_LAUNCHER_CONFIG_PROPERTY = "SET_LAUNCHER_CONFIG_PROPERTY";
const ANNOUNCE_MESSAGE = "ANNOUNCE_MESSAGE";
const SET_CHAT_MESSAGES_PROPERTY = "SET_CHAT_MESSAGES_PROPERTY";
const RESTART_CONVERSATION = "RESTART_CONVERSATION";
const ACCEPTED_DISCLAIMER = "ACCEPTED_DISCLAIMER";
const ADD_MESSAGE = "ADD_MESSAGE";
const UPDATE_HOME_SCREEN_CONFIG = "UPDATE_HOME_SCREEN_CONFIG";
const UPDATE_HAS_SENT_NON_WELCOME_MESSAGE =
  "UPDATE_HAS_SENT_NON_WELCOME_MESSAGE";
const UPDATE_PERSISTED_CHAT_STATE = "UPDATE_PERSISTED_CHAT_STATE";
const SET_HOME_SCREEN_IS_OPEN = "SET_HOME_SCREEN_IS_OPEN";
const UPDATE_LAUNCHER_CONFIG = "UPDATE_LAUNCHER_CONFIG";
const UPDATE_MESSAGE = "UPDATE_MESSAGE";
const SET_LAUNCHER_MINIMIZED = "SET_LAUNCHER_MINIMIZED";
const CLOSE_IFRAME_PANEL = "CLOSE_IFRAME_PANEL";
const OPEN_IFRAME_CONTENT = "OPEN_IFRAME_CONTENT";
const SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN =
  "SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN";
const SET_CUSTOM_PANEL_OPTIONS = "SET_CUSTOM_PANEL_OPTIONS";
const SET_CUSTOM_PANEL_OPEN = "SET_CUSTOM_PANEL_OPEN";
const TOGGLE_HOME_SCREEN = "GO_BACK_TO_HOME";
const UPDATE_INPUT_STATE = "UPDATE_INPUT_STATE";
const SET_IS_BROWSER_PAGE_VISIBLE = "SET_IS_PAGE_VISIBLE";
const ADD_INPUT_FILE = "ADD_INPUT_FILE";
const CLEAR_INPUT_FILES = "CLEAR_INPUT_FILES";
const REMOVE_INPUT_FILE = "REMOVE_INPUT_FILE";
const REMOVE_LOCAL_MESSAGE_ITEM = "REMOVE_LOCAL_MESSAGE_ITEM";
const FILE_UPLOAD_INPUT_ERROR = "FILE_UPLOAD_INPUT_ERROR";
const ADD_NESTED_MESSAGES = "ADD_NESTED_MESSAGES";
const SET_RESPONSE_PANEL_IS_OPEN = "SET_RESPONSE_PANEL_IS_OPEN";
const SET_RESPONSE_PANEL_CONTENT = "SET_PANEL_RESPONSE_CONTENT";
const STREAMING_ADD_CHUNK = "STREAMING_ADD_CHUNK";
const STREAMING_START = "STREAMING_START";
const STREAMING_MERGE_MESSAGE_OPTIONS = "STREAMING_MERGE_MESSAGE_OPTIONS";
const ADD_NOTIFICATION = "ADD_NOTIFICATION";
const REMOVE_ALL_NOTIFICATIONS = "REMOVE_ALL_NOTIFICATIONS";
const REMOVE_NOTIFICATIONS = "REMOVE_NOTIFICATIONS";
const UPDATE_CHAT_HEADER_CONFIG = "UPDATE_CHAT_HEADER_CONFIG";
const SET_STOP_STREAMING_BUTTON_VISIBLE = "SET_STOP_STREAMING_BUTTON_VISIBLE";
const SET_STOP_STREAMING_BUTTON_DISABLED = "SET_STOP_STREAMING_BUTTON_DISABLED";
const SET_STREAM_ID = "SET_STREAM_ID";
const UPDATE_MAIN_HEADER_AVATAR = "UPDATE_MAIN_HEADER_AVATAR";

/**
 * We had to downgrade to Redux 4 to beable to support AI chat users on React 17.
 * This type is included in Redux 5, but not 4.
 */
interface UnknownAction {
  type: string;
  // Optionally, include any unknown payload or meta fields if desired
  [extraProps: string]: any;
}

const actions = {
  /**
   * Allows you to change any portion of the app state.
   */
  changeState(partialState: DeepPartial<AppState>): UnknownAction {
    // Using "UnknownAction" here seems to be required or our dts bundler blows up on this with a "this node exceeds the
    // maximum length" error.
    return { type: CHANGE_STATE, partialState };
  },

  chatWasHydrated() {
    return { type: HYDRATE_CHAT };
  },

  hydrateMessageHistory(messageHistory: AppStateMessages) {
    return { type: HYDRATE_MESSAGE_HISTORY, messageHistory };
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
   * Adds the given message to the message list. This may also re-order any existing message items that are already
   * visible due to being received from previous streaming chunks.
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

  messageSetOptionSelected(messageID: string, sentMessage: MessageRequest) {
    return {
      type: MESSAGE_SET_OPTION_SELECTED,
      messageID,
      sentMessage,
    };
  },

  updatePersistedChatState(chatState: Partial<PersistedChatState>) {
    return {
      type: UPDATE_PERSISTED_CHAT_STATE,
      chatState,
    };
  },

  updateHasSentNonWelcomeMessage(hasSentNonWelcomeMessage: boolean) {
    return {
      type: UPDATE_HAS_SENT_NON_WELCOME_MESSAGE,
      hasSentNonWelcomeMessage,
    };
  },

  setAppStateValue<K extends keyof AppState>(key: K, value: AppState[K]) {
    return {
      type: SET_APP_STATE_VALUE,
      key,
      value,
    };
  },

  addIsTypingCounter(addToIsTyping: number) {
    return {
      type: ADD_IS_TYPING_COUNTER,
      addToIsTyping,
    };
  },

  addIsLoadingCounter(addToIsLoading: number) {
    return {
      type: ADD_IS_LOADING_COUNTER,
      addToIsLoading,
    };
  },

  addIsHydratingCounter(addToIsHydrating: number) {
    return {
      type: ADD_IS_HYDRATING_COUNTER,
      addToIsHydrating,
    };
  },

  updateBotName(name: string) {
    return { type: UPDATE_BOT_NAME, name };
  },

  updateMainHeaderTitle(title?: string) {
    return { type: UPDATE_MAIN_HEADER_TITLE, title };
  },

  updateBotAvatarURL(url: string) {
    return { type: UPDATE_BOT_AVATAR_URL, url };
  },

  updateCSSVariables(
    variables: ObjectMap<string>,
    publicVars: ObjectMap<string>,
    whiteLabelVariables: WhiteLabelTheme
  ) {
    return {
      type: UPDATE_CSS_VARIABLES,
      variables,
      publicVars,
      whiteLabelVariables,
    };
  },

  updateHomeScreenConfig(homeScreenConfig: HomeScreenConfig) {
    return { type: UPDATE_HOME_SCREEN_CONFIG, homeScreenConfig };
  },

  setViewState(viewState: ViewState) {
    return { type: SET_VIEW_STATE, viewState };
  },

  setViewChanging(viewChanging: boolean) {
    return { type: SET_VIEW_CHANGING, viewChanging };
  },

  setInitialViewChangeComplete(changeComplete: boolean) {
    return { type: SET_INITIAL_VIEW_CHANGE_COMPLETE, changeComplete };
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
   * Sets the value of one of the properties of {@link PersistedLauncherState}.
   */
  setLauncherProperty<TPropertyName extends keyof PersistedLauncherState>(
    propertyName: TPropertyName,
    propertyValue: PersistedLauncherState[TPropertyName]
  ) {
    return { type: SET_LAUNCHER_PROPERTY, propertyName, propertyValue };
  },

  setLauncherConfigProperty<
    TPropertyName extends keyof LauncherInternalCallToActionConfig
  >(
    propertyName: TPropertyName,
    propertyValue: LauncherInternalCallToActionConfig[TPropertyName],
    launcherType?: LauncherType.DESKTOP | LauncherType.MOBILE
  ) {
    return {
      type: SET_LAUNCHER_CONFIG_PROPERTY,
      propertyName,
      propertyValue,
      launcherType,
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
    TPropertyName extends keyof MessageResponseHistory
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
    TPropertyName extends keyof MessageUIStateInternal
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
      "error_state",
      errorState
    );
  },

  /**
   * Marks the given message to indicate that it has been announced and doesn't need to be announced again.
   */
  setMessageWasAnnounced(messageID: string) {
    return actions.setMessageUIProperty(messageID, "needsAnnouncement", false);
  },

  /**
   * Sets the given message as the current accessibility announcement so that it will immediately be read by a
   * screen reader.
   */
  announceMessage(message: AnnounceMessage) {
    return { type: ANNOUNCE_MESSAGE, message };
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
   * Add a notification to the state.
   */
  addNotification(notification: NotificationMessage) {
    const notificationID = uuid();
    return { type: ADD_NOTIFICATION, notificationID, notification };
  },

  /**
   * Remove notifications using the given ids.
   */
  removeNotifications({
    groupID,
    notificationID,
  }: {
    groupID?: string;
    notificationID?: string;
  }) {
    return { type: REMOVE_NOTIFICATIONS, groupID, notificationID };
  },

  /**
   * Remove all notifications from the state.
   */
  removeAllNotifications() {
    return { type: REMOVE_ALL_NOTIFICATIONS };
  },

  /**
   * Sets the disclaimer state for the current domain to true.
   */
  acceptDisclaimer() {
    return { type: ACCEPTED_DISCLAIMER };
  },

  /**
   * For toggling Home Screen open state.
   */
  setHomeScreenIsOpen(isOpen: boolean) {
    return { type: SET_HOME_SCREEN_IS_OPEN, isOpen };
  },

  updateLauncherConfig(launcherConfig: LauncherConfig) {
    return { type: UPDATE_LAUNCHER_CONFIG, launcherConfig };
  },

  setLauncherMinimized() {
    return { type: SET_LAUNCHER_MINIMIZED };
  },

  closeIFramePanel() {
    return { type: CLOSE_IFRAME_PANEL };
  },

  setIFrameContent(messageItem: IFrameItem) {
    return { type: OPEN_IFRAME_CONTENT, messageItem };
  },

  setViewSourcePanelIsOpen(
    isOpen: boolean,
    citationItem?: ConversationalSearchItemCitation,
    relatedSearchResult?: SearchResult
  ) {
    return {
      type: SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN,
      isOpen,
      citationItem,
      relatedSearchResult,
    };
  },

  setCustomPanelConfigOptions(options: CustomPanelConfigOptions) {
    return { type: SET_CUSTOM_PANEL_OPTIONS, options };
  },

  setCustomPanelOpen(isOpen: boolean) {
    return { type: SET_CUSTOM_PANEL_OPEN, isOpen };
  },

  /**
   * Switches between the bot and home screen views.
   */
  toggleHomeScreen() {
    return { type: TOGGLE_HOME_SCREEN };
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
   * Changes the values that indicates whether the browser page is visible.
   */
  setIsBrowserPageVisible(isVisible: boolean) {
    return { type: SET_IS_BROWSER_PAGE_VISIBLE, isVisible };
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

  addNestedMessages(localMessageItems: LocalMessageItem[]) {
    return { type: ADD_NESTED_MESSAGES, localMessageItems };
  },

  setResponsePanelIsOpen(isOpen: boolean) {
    return { type: SET_RESPONSE_PANEL_IS_OPEN, isOpen };
  },

  setResponsePanelContent(
    localMessageItem: LocalMessageItem,
    isMessageForInput = false
  ) {
    return {
      type: SET_RESPONSE_PANEL_CONTENT,
      localMessageItem,
      isMessageForInput,
    };
  },

  /**
   * Adds a message to the store to begin the streaming process.
   */
  streamingStart(messageID: string) {
    return { type: STREAMING_START, messageID };
  },

  /**
   * Merges the given message history object into an existing message object.
   */
  streamingMergeMessageOptions(
    messageID: string,
    message_options: DeepPartial<MessageResponseOptions>
  ) {
    return {
      type: STREAMING_MERGE_MESSAGE_OPTIONS,
      messageID,
      message_options,
    };
  },

  /**
   * Adds a new chunk of a streaming response to an existing message.
   */
  streamingAddChunk(
    fullMessageID: string,
    chunkItem: DeepPartial<GenericItem>,
    isCompleteItem: boolean,
    disableFadeAnimation: boolean
  ) {
    return {
      type: STREAMING_ADD_CHUNK,
      fullMessageID,
      chunkItem,
      isCompleteItem,
      disableFadeAnimation,
    };
  },

  updateChatHeaderConfig(chatHeaderConfig: ChatHeaderConfig) {
    return { type: UPDATE_CHAT_HEADER_CONFIG, chatHeaderConfig };
  },

  setStopStreamingButtonVisible(isVisible: boolean) {
    return { type: SET_STOP_STREAMING_BUTTON_VISIBLE, isVisible };
  },

  setStopStreamingButtonDisabled(isDisabled: boolean) {
    return { type: SET_STOP_STREAMING_BUTTON_DISABLED, isDisabled };
  },

  setStreamID(currentStreamID: string) {
    return { type: SET_STREAM_ID, currentStreamID };
  },

  updateMainHeaderAvatar(config: ChatHeaderAvatarConfig) {
    return { type: UPDATE_MAIN_HEADER_AVATAR, config };
  },
};

export default actions;

export {
  CHANGE_STATE,
  ADD_IS_LOADING_COUNTER,
  ADD_IS_TYPING_COUNTER,
  ADD_IS_HYDRATING_COUNTER,
  SET_APP_STATE_VALUE,
  ADD_LOCAL_MESSAGE_ITEM,
  UPDATE_LOCAL_MESSAGE_ITEM,
  HYDRATE_MESSAGE_HISTORY,
  HYDRATE_CHAT,
  SET_VIEW_STATE,
  SET_VIEW_CHANGING,
  SET_INITIAL_VIEW_CHANGE_COMPLETE,
  UPDATE_BOT_NAME,
  UPDATE_BOT_AVATAR_URL,
  UPDATE_LAUNCHER_AVATAR_URL,
  UPDATE_MAIN_HEADER_TITLE,
  UPDATE_CSS_VARIABLES,
  MESSAGE_SET_OPTION_SELECTED,
  SET_MESSAGE_UI_PROPERTY,
  ANNOUNCE_MESSAGE,
  RESTART_CONVERSATION,
  ACCEPTED_DISCLAIMER,
  ADD_MESSAGE,
  UPDATE_HOME_SCREEN_CONFIG,
  UPDATE_HAS_SENT_NON_WELCOME_MESSAGE,
  UPDATE_PERSISTED_CHAT_STATE,
  SET_HOME_SCREEN_IS_OPEN,
  UPDATE_LAUNCHER_CONFIG,
  SET_MESSAGE_RESPONSE_HISTORY_PROPERTY,
  UPDATE_MESSAGE,
  SET_LAUNCHER_PROPERTY,
  SET_LAUNCHER_CONFIG_PROPERTY,
  SET_LAUNCHER_MINIMIZED,
  CLOSE_IFRAME_PANEL,
  OPEN_IFRAME_CONTENT,
  SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN,
  SET_CUSTOM_PANEL_OPTIONS,
  SET_CUSTOM_PANEL_OPEN,
  SET_CHAT_MESSAGES_PROPERTY,
  TOGGLE_HOME_SCREEN,
  UPDATE_INPUT_STATE,
  SET_IS_BROWSER_PAGE_VISIBLE,
  ADD_INPUT_FILE,
  REMOVE_INPUT_FILE,
  FILE_UPLOAD_INPUT_ERROR,
  CLEAR_INPUT_FILES,
  ADD_NESTED_MESSAGES,
  SET_RESPONSE_PANEL_IS_OPEN,
  SET_RESPONSE_PANEL_CONTENT,
  STREAMING_ADD_CHUNK,
  STREAMING_START,
  STREAMING_MERGE_MESSAGE_OPTIONS,
  REMOVE_LOCAL_MESSAGE_ITEM,
  ADD_NOTIFICATION,
  REMOVE_MESSAGES,
  REMOVE_ALL_NOTIFICATIONS,
  REMOVE_NOTIFICATIONS,
  MERGE_HISTORY,
  UPDATE_CHAT_HEADER_CONFIG,
  SET_STOP_STREAMING_BUTTON_VISIBLE,
  SET_STOP_STREAMING_BUTTON_DISABLED,
  SET_STREAM_ID,
  UPDATE_MAIN_HEADER_AVATAR,
  SET_MESSAGE_UI_STATE_INTERNAL_PROPERTY,
};

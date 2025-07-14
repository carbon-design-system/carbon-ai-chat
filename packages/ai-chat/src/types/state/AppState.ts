/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  CustomMenuOption,
  type CustomPanelConfigOptions,
  EnglishLanguagePack,
  type FileUpload,
  LanguagePack,
  NotificationStateObject,
  type ViewState,
  ViewType,
} from "../instance/apiTypes";
import type { ChatHeaderConfig } from "../config/ChatHeaderConfig";
import type {
  ChatHeaderAvatarConfig,
  FileUploadCapabilities,
} from "../instance/ChatInstance";
import type { CornersType } from "../../chat/shared/utils/constants";
import type { AppConfig } from "./AppConfig";
import type { CarbonTheme } from "../utilities/carbonTypes";
import type { LauncherInternalConfig } from "../config/LauncherConfig";
import type { LocalMessageItem } from "../messaging/LocalMessageItem";
import ObjectMap from "../utilities/ObjectMap";
import { PersistedAgentState } from "./PersistedAgentState";
import type { PersistedTourState, TourState } from "./TourState";
import { HomeScreenConfig, HomeScreenState } from "../config/HomeScreenConfig";
import {
  ConversationalSearchItemCitation,
  GenericItem,
  IFrameItem,
  Message,
  SearchResult,
} from "../messaging/Messages";
import { LayoutConfig } from "../config/PublicConfig";
import { AgentAvailability } from "../config/ServiceDeskConfig";

/**
 * This contains the definitions for the redux application state.
 */

/**
 * The list of messages used by Carbon AI chat. These are in their own section for easy ability to restart.
 */
interface AppStateMessages {
  /**
   * This is the global map/registry of all the local message items by their IDs. This includes messages from
   * the bot as well as messages with a human agent. The order of the messages is controlled by the array of
   * local message IDs contained in {@link ChatMessagesState}.
   */
  allMessageItemsByID: ObjectMap<LocalMessageItem>;

  /**
   * This is the global map/registry of all full messages (as opposed to the local message items) in the system by their
   * message IDs. This includes messages with a human agent. The order of the messages is controlled by the array of
   * local message IDs contained in {@link ChatMessagesState}.
   */
  allMessagesByID: ObjectMap<Message>;

  /**
   * The state of messages when the user is interacting with the bot/assistant.
   */
  botMessageState: ChatMessagesState;
}

interface AppState extends AppStateMessages {
  /**
   * The state of the input area when the user is interacting with a bot (not a human agent).
   */
  botInputState: InputState;

  /**
   * The current state for the human agent system.
   */
  agentState: AgentState;

  /**
   * Whether we have hydrated Carbon AI chat. This means we have loaded session history if it exists as well as the
   * welcome node (if appropriate).
   */
  isHydrated: boolean;

  /**
   * The name visible on the header bar. Also used in logs and other messages. This value is first populated via config.
   */
  botName: string;

  /**
   * An override for specifically just the title in the header bar. Useful if you don't want to always show the name of
   * the assistant in the title bar, but want to keep it in the message. Also useful if you want the title of your chat
   * and the name of your assistant to be different values.
   */
  headerDisplayName: string;

  /**
   * The config of the chat header avatar.
   */
  headerAvatarConfig: ChatHeaderAvatarConfig;

  /**
   * The avatar visible on the header bar. This value (image url) is first populated via config.
   */
  botAvatarURL: string;

  /**
   * The current CSS variables added as overrides. We store this because as we live update we merge with the previous
   * value. If there are no overrides this can be undefined.
   */
  cssVariableOverrides: ObjectMap<string>;

  /**
   * The external configuration for the chat widget that includes the public config provided by the host page as well
   * as the remote config provided by the tooling.
   */
  config: AppConfig;

  /**
   * The config above gets manipulated by some reducers (particularly the updateCSSVariables action). Store the original
   * config in case we ever need to refer back to the non manipulated version.
   */
  originalConfig: AppConfig;

  /**
   * The language pack currently in use by the widget. This may be different from the language pack provided in the
   * original public config if it has been updated since. If no pack was provided in the public config, this value
   * will be set by the locale and is updated if the locale is changed.
   */
  languagePack: LanguagePack;

  /**
   * The locale currently in use by the widget. This may be different from the locale provided in the original
   * public config if it has been updated since. If this value is updated, the language pack will be updated as well
   * as long as one was not originally provided in the public config.
   */
  locale: string;

  /**
   * An ARIA message to be announced to the user. This will be announced whenever the message text changes.
   */
  announceMessage?: AnnounceMessage;

  /**
   * Indicates if the messages list should suspend its detection of scroll events on the messages list. The message
   * list uses a scroll listener to determine if the user has anchored the list to the bottom so that we can always
   * stay at the bottom. However, there are a number of cases where scrolling can occur automatically when the list
   * resizes that are not the result of the user scrolling. We want to ignore these scroll events.
   */
  suspendScrollDetection: boolean;

  /**
   * Active config for home screen derived from combining remote and local config.
   */
  homeScreenConfig: HomeScreenConfig;

  /**
   * Any items stored here is also persisted to sessionStorage IF sessionHistory is turned on. We rehydrate the redux
   * store with this information. Examples of things we store include if the Carbon AI chat is open and if you have an active
   * conversation with an agent.
   */
  persistedToBrowserStorage: PersistedToBrowserStorageState;

  /**
   * The current enum value for the width of the chat. Used to drive responsive design and to swap components out
   * in different view sizes as needed.
   */
  chatWidthBreakpoint: ChatWidthBreakpoint;

  /**
   * The current width of the chat in pixels.
   */
  chatWidth: number;

  /**
   * The current height of the chat in pixels.
   */
  chatHeight: number;

  /**
   * Has thrown an error that Carbon AI chat can not recover from.
   */
  catastrophicErrorType?: boolean;

  /**
   * The state of the Carbon AI chat launcher.
   */
  launcher: LauncherState;

  /**
   * The state of the iframe panel.
   */
  iFramePanelState: IFramePanelState;

  /**
   * The state of the conversational search citation panel.
   */
  viewSourcePanelState: ViewSourcePanelState;

  /**
   * Indicates if the app has been destroyed and should no longer be rendered.
   */
  isDestroyed: boolean;

  /**
   * The custom panel state.
   */
  customPanelState: CustomPanelState;

  /**
   * The state of the panel surfaced by response types, either with or without user input.
   */
  responsePanelState: MessagePanelState;

  /**
   * Indicates if the view is currently changing. This means that a fireViewChangeEventsAndChangeView function is
   * currently running and waiting to be resolved. This is used to stop these functions, and the events within them from
   * firing on top of each other.
   */
  viewChanging: boolean;

  /**
   * Indicates that Chat.ts has finished firing actions.changeView(). This signifies to the launcher and
   * other components that they may now begin their animations if they're visible.
   */
  initialViewChangeComplete: boolean;

  /**
   * Before Carbon AI chat is loaded, the initial view state is set to everything closed (which reflects the reality of the
   * page as Carbon AI chat is loading). This property is the view state we want Carbon AI chat to try to get to after it is loaded.
   * If a previous session already exists, then this target will be set to the previous view state so we get back to
   * where we were. If there is no session, this will be set to a default that is based on the current Carbon AI chat
   * config and page context (such as considering if openChatByDefault is set). After Carbon AI chat is loaded, this value is
   * no longer used.
   */
  targetViewState: ViewState;

  /**
   * All the currently configured custom menu options.
   */
  customMenuOptions: CustomMenuOption[];

  /**
   * The non-persisted state for tours.
   */
  tourState: TourState;

  /**
   * Indicates if we should display a transparent background covering the non-header area of the main window.
   */
  showNonHeaderBackgroundCover: boolean;

  /**
   * Indicates if the browser page is visible. This uses the Page Visibility API which needs to be taken with a
   * grain of salt. A visibility change only occurs if the page moves in or out of being 100% visible. This occurs
   * when you switch tabs within the same window or if you minimize/maximize a window. If you switch to a different
   * window, this window changes visibility only if the entire window is covered.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
   */
  isBrowserPageVisible: boolean;

  /**
   * Which carbon theme to use and whether the AI theme is enabled.
   */
  theme: ThemeState;

  layout: LayoutConfig;

  /**
   * The current state of notifications.
   */
  notifications: NotificationStateObject[];

  /**
   * The chat header state.
   */
  chatHeaderState: ChatHeaderState;
}

/**
 * The state of the input area where the user types messages.
 */
interface InputState extends FileUploadCapabilities {
  /**
   * Indicates if the input field is configured to be visible. This is only interpreted as the custom setting defined
   * by the host page if it turns off the field. The value of this may be overridden if the user is connected to an
   * agent where the field will automatically become visible and then hidden again when the agent chat has ended.
   */
  fieldVisible: boolean;

  /**
   * Indicates if the input field should be made readonly.
   */
  isReadonly: boolean;

  /**
   * The current set of file attachments selected to be uploaded.
   */
  files: FileUpload[];

  /**
   * The state of the stop streaming button to cancel streams from message responses.
   */
  stopStreamingButtonState: StopStreamingButtonState;
}

interface StopStreamingButtonState {
  /**
   * Determines if the button should be visible.
   */
  isVisible: boolean;

  /**
   * Determine if the button should be disabled.
   */
  isDisabled: boolean;

  /**
   * The stream id of the current response with an active stream. It is used by message service to stop streamed
   * responses coming from wxa.
   */
  currentStreamID?: string;
}

/**
 * Items current chat state.
 */
interface PersistedChatState {
  /**
   * The version of the Carbon AI chat that this data is persisted for. If there are any breaking changes to the
   * application state and a user reloads and gets a new version of the widget, bad things might happen so we'll
   * just invalidate the persisted storage if we ever attempt to load an old version on Carbon AI chat startup.
   */
  version: string;

  /**
   * Map of if a disclaimer has been accepted on a given window.hostname value.
   */
  disclaimersAccepted: ObjectMap<boolean>;

  /**
   * State of home screen.
   */
  homeScreenState: HomeScreenState;

  /**
   * If the user has received a message beyond the welcome node. We use this to mark if the chat has been interacted
   * with.
   */
  hasSentNonWelcomeMessage: boolean;

  /**
   * The persisted state for tours.
   */
  persistedTourState: PersistedTourState;

  /**
   * The persisted state for agents.
   */
  agentState: PersistedAgentState;
}

/**
 * Items stored in sessionStorage.
 */
interface PersistedLauncherState {
  /**
   * Indicates if this state was loaded from browser session storage or if was created as part of a new session.
   */
  wasLoadedFromBrowser: boolean;

  /**
   * The version of the Carbon AI chat that this data is persisted for. If there are any breaking changes to the
   * application state and a user reloads and gets a new version of the widget, bad things might happen so we'll
   * just invalidate the persisted storage if we ever attempt to load an old version on Carbon AI chat startup.
   */
  version: string;

  /**
   * Indicates which of the Carbon AI chat views are visible and which are hidden.
   */
  viewState: ViewState;

  /**
   * Indicates if there is currently an active tour. If there is then clicking on the launcher should open the tour
   * view.
   */
  activeTour: boolean;

  /**
   * Indicates if we should show an unread indicator on the launcher. This is a custom flag that is set by
   * {@link ChatActions.updateBotUnreadIndicatorVisibility} and will display an empty circle on
   * the launcher. This setting is overridden if there are any unread human agent messages in which case a circle
   * with a number is displayed.
   */
  showUnreadIndicator: boolean;

  /**
   * Indicates if the mobile launcher should be in the extended state.
   */
  mobileLauncherIsExtended: boolean;

  /**
   * Determines if the mobile launcher already played the extended animation and was reduced.
   */
  mobileLauncherWasReduced: boolean;

  /**
   * Determines if the mobile launcher previously played the bounce animation and should no longer be able to.
   */
  mobileLauncherDisableBounce: boolean;

  /**
   * Indicates the desktop launcher is in its expanded state.
   */
  desktopLauncherIsExpanded: boolean;

  /**
   * Indicates the desktop launcher has been minimized.
   */
  desktopLauncherWasMinimized: boolean;

  /**
   * The bounce turn the user is currently on in the sequence of bounces so that user doesn't start over in the
   * sequence. A turn is a full set of animations that are displayed when a bounce occurs and each turn of a bounce is
   * when a different bounce occurs at a different point in time. This is used for both the desktop and mobile launcher.
   */
  bounceTurn: number;

  /**
   * If the user has received a message beyond the welcome node. We use this to mark if the chat has been interacted
   * with. Note that this is a duplicate of the property on {@link PersistedChatState.hasSentNonWelcomeMessage}. It
   * is duplicated here so that this information may be available before hydration and before the user is known.
   * Note that this property reflects only the last user and should only be used when an approximate value is
   * acceptable.
   */
  hasSentNonWelcomeMessage: boolean;
}

/**
 * State shared with the sessionStorage so that as the user navigates the chat stays in the same UI state. This is in
 * addition to the data that the session history store.
 */
interface PersistedToBrowserStorageState {
  /**
   * Things stored that are related to the user profile. These are not accessible until the Carbon AI chat has been opened!
   */
  chatState: PersistedChatState;

  /**
   * Things stored that are not related to the user profile. These should only be things that are not sensitive like
   * "is the Carbon AI chat open".
   */
  launcherState: PersistedLauncherState;
}

/**
 * The state information for a specific instance of a chat panel that contains a list of messages.
 */
interface ChatMessagesState {
  /**
   * An array of local message item ids to correctly store the order of messages.
   */
  localMessageIDs: string[];

  /**
   * An array of message ids to correctly store the order of messages.
   */
  messageIDs: string[];

  /**
   * Counter that indicates if the other party (not the user) is typing and that a typing indicator should be displayed.
   * If "0" then we do not show typing indicator.
   */
  isTypingCounter: number;

  /**
   * Counter that indicates if a message is loading and a loading indicator should be displayed.
   * If "0" then we do not show loading indicator.
   */
  isLoadingCounter: number;

  /**
   * Counter that indicates if the chat is hydrating and a full screen loading state should be displayed.
   */
  isHydratingCounter: number;

  /**
   * Indicates if the scrollable area of the widget is anchored to the bottom such that if any changes in the scroll
   * panel size occur, the panel will automatically be scrolled back to the bottom. The anchor is enabled whenever
   * a scroll event occurs that brings the panel to the bottom. It also starts anchored as the panel is initially empty.
   */
  isScrollAnchored: boolean;
}

/**
 * This piece of state contains information about any connection to a human agent system.
 */
interface AgentState {
  /**
   * Indicates that we are currently attempting to connect the user to an agent.
   */
  isConnecting: boolean;

  /**
   * Indicates that we are currently attempting to re-connect the user to an agent. This occurs when Carbon AI chat is
   * initially loaded and the user was previously connected to an agent.
   */
  isReconnecting: boolean;

  /**
   * Information about the waiting status for the user before being connected to an agent. This can contain
   * information about the time to wait or the position in a queue. If this is null, no specific wait information is
   * available.
   */
  availability?: AgentAvailability;

  /**
   * Indicates the number of messages from an agent that are unread by a user. This is only indicated if the user is
   * on the bot view. All agent messages are marked as read if the user switches to the agent view. This count does
   * not include "agent joined" messages.
   */
  numUnreadMessages: number;

  /**
   * Indicates if there is currently a file upload in progress.
   */
  fileUploadInProgress: boolean;

  /**
   * The ID of the locale message that was used to start the current conversation with an agent.
   */
  activeLocalMessageID?: string;

  /**
   * Indicates if the modal for displaying a screen sharing requests should be shown.
   */
  showScreenShareRequest: boolean;

  /**
   * Indicates if the user is currently sharing their screen.
   */
  isScreenSharing: boolean;

  /**
   * Indicates if the agent is typing.
   */
  isAgentTyping: boolean;

  /**
   * The state of the input field while connecting or connected to an agent.
   */
  inputState: InputState;
}

/**
 * The state that controls how the agent interaction appears to the user.
 */
interface AgentDisplayState {
  /**
   * Indicates if the user should see that they are connecting or connected to an agent.
   */
  isConnectingOrConnected: boolean;

  /**
   * Indicates if the input field should be disabled.
   */
  disableInput: boolean;

  /**
   * The language pack key to show for the placeholder text in the input field (if the default should be overridden).
   */
  inputPlaceholderKey: keyof EnglishLanguagePack;

  /**
   * Indicates if the agent is typing.
   */
  isAgentTyping: boolean;
}

/**
 * This interface represents a piece of text that can be translated using a language pack. A piece of code that
 * needs to display a string from the language pack can specify the ID/Key of the message from the language pack and
 * optionally any parameters that need to be passed to the message formatter that are used inside the string. This
 * also allows a form where the text has already been translated and can be used as-is.
 */
interface AnnounceMessage {
  /**
   * If the text is just specified as text that's already been calculated, that text can just be set here.
   */
  messageText?: string;

  /**
   * If the text is defined by a message id that corresponds to one of the messages in our language pack, that
   * message id can be specified here. The message text will be formatted using this message id.
   */
  messageID?: keyof EnglishLanguagePack;

  /**
   * If the text is defined by a message id that corresponds to one of the messages in our language pack, any
   * optional parameters that are necessary for formatting the message with the given id are specified here.
   */
  messageValues?: Record<string, any>;
}

/**
 * The different available widths of a Carbon AI chat.
 */
enum ChatWidthBreakpoint {
  // < 360px
  NARROW = "narrow",
  // >= 360px
  STANDARD = "standard",
  // > 672 + 16 + 16px
  WIDE = "wide",
}

/**
 * The launcher config.
 */
interface LauncherState {
  /**
   * The current config state of launcher.
   */
  config: LauncherInternalConfig;
}

interface IFramePanelState {
  /**
   * Indicates if the iframe panel is open.
   */
  isOpen: boolean;

  /**
   * The iframe message item with the content to load.
   */
  messageItem: IFrameItem;
}

interface ViewSourcePanelState {
  /**
   * Indicates if the conversational search citation panel is open.
   */
  isOpen: boolean;

  /**
   * A citation either from ConversationalSearch or from legacy (non-conversational) search.
   */
  citationItem: ConversationalSearchItemCitation;

  /**
   * If the citation is for a {@link ConversationalSearchItem} then the ExpandToPanelCard should show a search result in
   * the panel because it has extra text and detail that could be valuable to the user.
   */
  relatedSearchResult?: SearchResult;
}

interface CustomPanelState {
  /**
   * Determines if the custom panel should be open.
   */
  isOpen: boolean;

  /**
   * The id of the panel that is currently in focus.
   */
  panelID: string;

  /**
   * Config options for the custom panels.
   */
  options: CustomPanelConfigOptions;
}

interface MessagePanelState<T extends GenericItem = GenericItem> {
  /**
   * Determines if the show panel is open.
   */
  isOpen: boolean;

  /**
   * The local message item that contains panel content to display.
   */
  localMessageItem: LocalMessageItem<T>;

  /**
   * Indicates if this message is part the most recent message response that allows for input. This will allow the panel
   * to reflect the state of the chat, such as disabling buttons that shouldn't be accessible anymore.
   */
  isMessageForInput: boolean;
}

/**
 * The theme state.
 */
interface ThemeState {
  /**
   * Indicates if the carbon for AI theme is enabled.
   */
  useAITheme: boolean;

  /**
   * A string identifying what Carbon Theme we should base UI variables off of. Defaults to 'g10'. See
   * https://carbondesignsystem.com/guidelines/color/tokens.
   */
  carbonTheme: CarbonTheme;

  /**
   * This flag is used to disable Carbon AI chat's rounded corners.
   */
  corners: CornersType;
}
interface ChatHeaderState {
  /**
   * The chat header config state.
   */
  config: ChatHeaderConfig;

  /**
   * The total number of chat header objects that are allowed to be visible in the chat header in each of the left and
   * right containers.
   */
  maxVisibleHeaderObjects: number;
}

export {
  AppStateMessages,
  AppState,
  PersistedToBrowserStorageState,
  AgentDisplayState,
  AgentState,
  ChatMessagesState,
  AnnounceMessage,
  ViewState,
  ViewType,
  PersistedChatState,
  PersistedLauncherState,
  LauncherState,
  IFramePanelState,
  ViewSourcePanelState,
  CustomPanelConfigOptions,
  CustomPanelState,
  InputState,
  FileUpload,
  MessagePanelState,
  ChatWidthBreakpoint,
  ThemeState,
};

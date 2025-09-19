/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance } from "../instance/ChatInstance";
import { CustomSendMessageOptions } from "./MessagingConfig";
import { MessageRequest } from "../messaging/Messages";
import { CornersType } from "./CornersType";
import type {
  ServiceDesk,
  ServiceDeskFactoryParameters,
  ServiceDeskPublicConfig,
} from "./ServiceDeskConfig";
import { HistoryItem } from "../messaging/History";
/**
 * This file contains the definition for the public application configuration operations that are provided by the
 * host page.
 */

/**
 * @category Config
 */
export interface PublicConfig {
  /**
   * This is a one-off listener for catastrophic errors. This is used instead of a normal event bus handler because this function can be
   * defined and called before the event bus has been created.
   */
  onError?: (data: OnErrorData) => void;

  /**
   * Render the chat launcher element used to open and close the chat window. If you elect to not show our built in
   * chat launcher, you will be responsible for firing the launcher:toggle, launcher:open or launcher:close events
   * from your own chat launcher. Or, you can use options.openChatByDefault to just have the chat interface be open
   * at initialization.
   */
  showLauncher?: boolean;

  /**
   * By default, the chat window will be rendered in a "closed" state.
   */
  openChatByDefault?: boolean;

  /**
   * Disclaimer screen configuration.
   */
  disclaimer?: DisclaimerPublicConfig;

  /**
   * This value is only used when a custom element is being used to render the widget. By default, a number of
   * enhancements to the widget are activated on mobile devices which can interfere with a custom element. This
   * value can be used to disable those enhancements while using a custom element.
   */
  disableCustomElementMobileEnhancements?: boolean;

  /**
   * Add a bunch of noisy console.log messages!
   */
  debug?: boolean;

  /**
   * Expose internal serviceManager on ChatInstance for testing purposes.
   * This should only be used in test environments.
   *
   * @internal
   */
  exposeServiceManagerForTesting?: boolean;

  /**
   * Sets theming configuration.
   */
  themeConfig?: ThemeConfig;

  /**
   * This is a factory for producing custom implementations of service desks. If this value is set, then this will
   * be used to create an instance of a {@link ServiceDesk} when the user attempts to connect to an agent.
   */
  serviceDeskFactory?: (
    parameters: ServiceDeskFactoryParameters,
  ) => Promise<ServiceDesk>;

  /**
   * Any public config to apply to service desks.
   */
  serviceDesk?: ServiceDeskPublicConfig;

  /**
   * If the Carbon AI Chat should grab focus if the Carbon AI Chat is open on page load. This applies to session history open
   * states as well as openByChatByDefault. This should be set to false if the Carbon AI Chat is embedded in the tooling, for
   * instance.
   */
  shouldTakeFocusIfOpensAutomatically?: boolean;

  /**
   * An optional namespace that can be added to the Carbon AI Chat that must be 30 characters or under. This value is
   * intended to enable multiple instances of the Carbon AI Chat to be used on the same page. The namespace for this web
   * chat. This value is used to generate a value to append to anything unique (id, session keys, etc) to allow
   * multiple Carbon AI Chats on the same page.
   *
   * Note: this value is used in the aria region label for the Carbon AI Chat. This means this value will be read out loud
   * by users using a screen reader.
   */
  namespace?: string;

  /**
   * Indicates if a focus trap should be enabled when the Carbon AI Chat is open.
   */
  enableFocusTrap?: boolean;

  /**
   * If true, disables functionality in Carbon AI Chat that changes the window title.
   */
  disableWindowTitleChanges?: boolean;

  /**
   * Indicates if Carbon AI Chat should sanitize HTML from the bot.
   */
  shouldSanitizeHTML?: boolean;

  /**
   * Extra config for controlling the behavior of the header.
   */
  headerConfig?: HeaderConfig;

  /**
   * The config object for changing Carbon AI Chat's layout.
   */
  layout?: LayoutConfig;

  /**
   * Config options for controlling messaging.
   */
  messaging?: PublicConfigMessaging;

  /**
   * @internal
   * @experimental
   * Sets the chat into a read only mode for displaying old conversations.
   */
  isReadonly?: boolean;

  /**
   * @internal
   * @experimental
   * Sets the avatar image.
   */
  botAvatarURL?: string;

  /**
   * @internal
   * @experimental
   * Sets the name of the bot.
   */
  botName?: string;
}

/**
 * @category Config
 */
export enum MinimizeButtonIconType {
  /**
   * This shows an "X" icon.
   */
  CLOSE = "close",

  /**
   * This shows a "-" icon.
   */
  MINIMIZE = "minimize",

  /**
   * This shows an icon that indicates that the Carbon AI Chat can be collapsed into a side panel.
   */
  SIDE_PANEL_LEFT = "side-panel-left",

  /**
   * This shows an icon that indicates that the Carbon AI Chat can be collapsed into a side panel.
   */
  SIDE_PANEL_RIGHT = "side-panel-right",
}

/**
 * @category Config
 */
export interface HeaderConfig {
  /**
   * Indicates the icon to use for the close button in the header.
   */
  minimizeButtonIconType?: MinimizeButtonIconType;

  /**
   * Hide the ability to minimize the Carbon AI Chat.
   */
  hideMinimizeButton?: boolean;

  /**
   * If true, shows the restart conversation button in the header of home screen and main chat.
   */
  showRestartButton?: boolean;

  /**
   * Indicates if the close and restart (X) button should be rendered.
   *
   */
  showCloseAndRestartButton?: boolean;
}

/**
 * @category Config
 */
export interface LayoutConfig {
  /**
   * Indicates if the Carbon AI Chat widget should keep its border and box-shadow.
   */
  showFrame?: boolean;

  /**
   * Indicates if content inside the Carbon AI Chat widget should be constrained to a max-width.
   *
   * At larger widths the card, carousel, options and conversational search response types
   * have pending issues.
   */
  hasContentMaxWidth?: boolean;
}

/**
 * Config options for controlling messaging.
 *
 * @category Config
 */
export interface PublicConfigMessaging {
  /**
   * Indicates if Carbon AI Chat should make a request for the welcome message when a new conversation begins. If this is
   * true, then Carbon AI Chat will start with an empty conversation.
   */
  skipWelcome?: boolean;

  /**
   * Changes the timeout used by the message service when making message calls. The timeout is in seconds. The
   * default is 150 seconds. After this time, an error will be shown in the client and an Abort signal will be sent
   * to customSendMessage. If set to 0, the chat will never timeout.
   */
  messageTimeoutSecs?: number;

  /**
   * Controls how long AI chat should wait before showing the loading indicator. If set to 0, the chat will never show
   * the loading indicator. This is tied to either {@link ChatInstance.messaging.addMessage} or {@link ChatInstance.messaging.addMessageChunk}
   * being called after this message was sent.
   *
   * If set to 0, the chat will never automatically show a loading indicator.
   */
  messageLoadingIndicatorTimeoutSecs?: number;

  /**
   * A callback for Carbon AI Chat to use to send messages to your assistant.
   *
   * Carbon AI Chat will queue up any additional user messages until the Promise from a previous call to customSendMessage
   * has resolved. If you do not make customSendMessage async, it will be up to you to manage what happens when a message is
   * sent when the previous is still processing. If the Promise rejects, an error indicator will be displayed next to the user's message.
   *
   * If the request takes longer than PublicConfigMessaging.messageTimeoutSecs than the AbortSignal will be sent.
   */
  customSendMessage?: (
    request: MessageRequest,
    requestOptions: CustomSendMessageOptions,
    instance: ChatInstance,
  ) => Promise<void> | void;

  /**
   * This is a callback function that is used by Carbon AI Chat to retrieve history data for populating the Carbon AI Chat. If
   * this function is defined, it will be used instead of any other mechanism for fetching history.
   */
  customLoadHistory?: (instance: ChatInstance) => Promise<HistoryItem[]>;
}

/**
 * @category Config
 */
export interface DisclaimerPublicConfig {
  /**
   * If the disclaimer is turned on.
   */
  is_on: boolean;

  /**
   * HTML content to show in disclaimer.
   */
  disclaimerHTML: string;
}

/**
 * A string identifying what Carbon Theme we should base UI variables off of. Defaults to 'g10'. See
 * https://carbondesignsystem.com/guidelines/color/tokens.
 *
 * @category Config
 */
export enum CarbonTheme {
  WHITE = "white",
  G10 = "g10",
  G90 = "g90",
  G100 = "g100",
}

/**
 * Enum for theme configuration values.
 *
 * @category Config
 */
export enum ThemeType {
  /**
   * Uses the Carbon AI theme styling.
   */
  CARBON_AI = "CarbonAI",

  /**
   * Uses white label theme styling.
   */
  WHITE_LABEL = "WhiteLabel",
}

/**
 * The different categories of errors that the system can record. These values are published for end user consumption.
 *
 * @category Config
 */
export enum OnErrorType {
  /**
   * Indicates an error sending a message to the assistant. This error is only generated after all retries have
   * failed and the system has given up.
   */
  MESSAGE_COMMUNICATION = "MESSAGE_COMMUNICATION",

  /**
   * This indicates an error in one of the components that occurs as part of rendering the UI.
   */
  RENDER = "RENDER",

  /**
   * This indicates a known error with the configuration for a service desk. Fired when a connect_to_agent
   * response type is received, but none is configured.
   */
  INTEGRATION_ERROR = "INTEGRATION_ERROR",

  /**
   * This indicates that some error occurred while trying to hydrate the chat. This will prevent the chat from
   * functioning.
   */
  HYDRATION = "HYDRATION",
}

/**
 * Fired when a serious error in the chat occurs.
 *
 * @category Config
 */
export interface OnErrorData {
  /**
   * The type of error that occurred.
   */
  errorType: OnErrorType;

  /**
   * A message associated with the error.
   */
  message: string;

  /**
   * An extra blob of data associated with the error. This may be a stack trace for thrown errors.
   */
  otherData?: unknown;

  /**
   * If the error is of the severity that requires a whole restart of Carbon AI Chat.
   */
  catastrophicErrorType?: boolean;
}

/**
 * @category Config
 */
export interface ThemeConfig {
  /**
   * A string identifying what Carbon Theme we should base UI variables off of. Defaults to 'g10'. See
   * https://carbondesignsystem.com/guidelines/color/tokens.
   */
  carbonTheme?: CarbonTheme;

  /**
   * @internal
   * Specifies which theme configuration to use.
   */
  theme?: ThemeType;

  /**
   * @internal
   * This object contains the style information that is provided by the tooling that changes various bits of
   * appearance in the widget. These are used to configure multiple CSS variables in an accessible way.
   * This is only available with using {@link ThemeType} set to `WHITE_LABEL`.
   */

  whiteLabelTheme?: WhiteLabelTheme;

  /**
   * This flag is used to disable Carbon AI Chat's rounded corners.
   */
  corners?: CornersType;
}

/**
 * @category Config
 *
 * @experimental
 */
export interface WhiteLabelTheme {
  /**
   * The secondary color which controls the color of the user sent chat bubble.
   */
  "BASE-secondary-color"?: string;

  /**
   * The primary color controls the color of the header.
   */
  "BASE-primary-color"?: string;

  /**
   * The accent color which controls things like focus and button colors throughout the widget.
   */
  "BASE-accent-color"?: string;
}

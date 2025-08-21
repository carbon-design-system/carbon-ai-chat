/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { IntlShape } from "react-intl";
import { DeepPartial } from "../utilities/DeepPartial";

import {
  CustomMenuOption,
  CustomPanels,
  LanguagePack,
  NotificationMessage,
  ViewState,
  ViewType,
} from "./apiTypes";
import { CornersType } from "../config/CornersType";
import { BusEvent, BusEventType } from "../events/eventBusTypes";
import { HomeScreenConfig } from "../config/HomeScreenConfig";
import { ChatInstanceMessaging } from "../config/MessagingConfig";
import { LauncherConfig } from "../config/LauncherConfig";
import { MessageRequest } from "../messaging/Messages";
import { ChatHeaderConfig } from "../config/ChatHeaderConfig";

/**
 * The interface represents the API contract with the chat widget and contains all the public methods and properties
 * that can be used with Carbon AI Chat.
 *
 * @category Instance
 */
export interface ChatInstance extends EventHandlers, ChatActions {
  /**
   * Renders the chat. This function is called by the React and web components.
   *
   * @internal
   */
  render: () => Promise<ChatInstance>;

  /**
   * Destroy the chat widget and return initial content to the DOM. This function is called by the React and web components.
   *
   * @internal
   */
  destroy: () => void;

  /**
   * Returns state information of the Carbon AI Chat that could be useful.
   */
  getState: () => PublicWebChatState;

  /**
   * Internal testing property that exposes the serviceManager.
   * Only available when exposeServiceManagerForTesting is set to true in PublicConfig.
   *
   * @internal
   */
  serviceManager?: any;
}

/**
 * This is the state made available by calling getState. This is a public method that returns immutable values.
 *
 * @category Instance
 */
export interface PublicWebChatState {
  /**
   * Is the Carbon AI Chat currently in an open state.
   */
  isWebChatOpen: boolean;

  /**
   * Is the Carbon AI Chat currently connected with a human agent.
   */
  isConnectedWithHumanAgent: boolean;

  /**
   * Indicates if Carbon AI Chat has requested to be connected to a human agent but an agent has not yet joined the
   * conversation.
   */
  isConnectingWithHumanAgent: boolean;

  /**
   * Is the home screen open.
   */
  isHomeScreenOpen: boolean;

  /**
   * Indicates if debugging is enabled.
   */
  isDebugEnabled: boolean;

  /**
   * Has the user sent a message that isn't requesting the welcome node.
   */
  hasUserSentMessage: boolean;

  /**
   * The current viewState of the Carbon AI Chat.
   */
  viewState: ViewState;

  /**
   * State regarding service desks.
   */
  serviceDesk: PublicWebChatServiceDeskState;

  /**
   * Returns the current locale in use by the widget. This may not match the locale that was provided in the
   * original public configuration if that value was invalid or if the locale has been changed since then.
   *
   * Example values include: 'en' and 'en-us'.
   */
  locale: string;

  /**
   * Returns an instance of the intl object that is used for generating translated text. Note that the object
   * returned from this function changes each time the locale or language pack is changed.
   */
  intl: IntlShape;
}

/**
 * @category Instance
 */
export interface PublicWebChatServiceDeskState {
  /**
   * Is the Carbon AI Chat currently connected with a human agent.
   */
  isConnected: boolean;

  /**
   * Indicates if Carbon AI Chat has requested to be connected to a human agent but an agent has not yet joined the
   * conversation.
   */
  isConnecting: boolean;

  /**
   * Indicates if a conversation with a human agent has been suspended.
   */
  isSuspended: boolean;
}

/**
 * This is a subset of the public interface that is managed by the event bus that is used for registering and
 * unregistering event listeners on the bus.
 *
 * @category Instance
 */
export interface EventHandlers {
  /**
   * Adds the given event handler as a listener for events of the given type.
   *
   * @param handlers The handler or handlers along with the event type to start listening for events.
   * @returns The instance for method chaining.
   */
  on: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers;

  /**
   * Removes an event listener that was previously added via {@link on} or {@link once}.
   *
   * @param handlers The handler or handlers along with the event type to stop listening for events.
   * @returns The instance for method chaining.
   */
  off: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers;

  /**
   * Adds the given event handler as a listener for events of the given type. After the first event is handled, this
   * handler will automatically be removed.
   *
   * @param handlers The handler or handlers along with the event type to start listening for an event.
   * @returns The instance for method chaining.
   */
  once: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers;
}

/**
 * The type of handler for event bus events. This function may return a Promise in which case, the bus will await
 * the result and the loop will block until the Promise is resolved.
 *
 * @category Instance
 */
export type EventBusHandler<T extends BusEvent = BusEvent> = (
  event: T,
  instance: ChatInstance,
) => unknown;

/**
 * The type of the object that is passed to the event bus functions (e.g. "on") when registering a handler.
 *
 * @category Instance
 */
export interface TypeAndHandler {
  /**
   * The type of event this handler is for.
   */
  type: BusEventType;

  /**
   * The handler for events of this type.
   */
  handler: EventBusHandler;
}

/**
 * The main chat header customization options.
 *
 * @category Instance
 */
export interface ChatHeaderAvatarConfig {
  /**
   * The url or data uri of the image to display in the main chat header.
   */
  url: string;

  /**
   * Indicates if the image should be given rounded corners. The default value is "square".
   */
  corners?: CornersType;
}

/**
 * Valid public CSS variables that can be controlled when white labeling is disabled.
 *
 * These variables map to CSS custom properties used in styling the AI chat interface.
 * This enum is used for type safety and documentation purposes.
 *
 * @category Instance
 */
export enum CSSVariable {
  /**
   * Controls the minimum height of the chat container when in float view.
   * Use this to adjust the overall vertical space the chat can occupy.
   */
  BASE_HEIGHT = "BASE-height",

  /**
   * Restricts the maximum height of the chat container when in float view.
   * This is useful to cap panel height and ensure it doesn't exceed view bounds.
   */
  BASE_MAX_HEIGHT = "BASE-max-height",

  /**
   * Sets the width of the chat panel in float view.
   * Can be used to widen the float version of the chat.
   */
  BASE_WIDTH = "BASE-width",

  /**
   * Controls the z-index of the chat overlay or container in float view.
   * Use to adjust stacking context if conflicts arise with other UI elements.
   */
  BASE_Z_INDEX = "BASE-z-index",
}

/**
 * This is a subset of the public interface that provides methods that can be used by the user to control the widget
 * and have it perform certain actions.
 *
 * @category Instance
 */
interface ChatActions {
  /**
   * Messaging actions for a chat instance.
   */
  messaging: ChatInstanceMessaging;
  /**
   * This function can be called when another component wishes this component to gain focus. It is up to the
   * component to decide where focus belongs. This may return true or false to indicate if a suitable focus location
   * was found.
   */
  requestFocus: () => boolean | void;

  /**
   * Sends the given message to the assistant on the remote server. This will result in a "pre:send" and "send" event
   * being fired on the event bus. The returned promise will resolve once a response has received and processed and
   * both the "pre:receive" and "receive" events have fired. It will reject when too many errors have occurred and
   * the system gives up retrying.
   *
   * @param message The message to send.
   * @param options Options for the message sent.
   */
  send: (
    message: MessageRequest | string,
    options?: SendOptions,
  ) => Promise<void>;

  /**
   * Updates the current locale. This will override the default values of the language pack.
   */
  updateLocale: (newLocale: string) => Promise<void>;

  /**
   * Updates the current language pack using the values from the provided language pack. This language pack does
   * not need to be complete; only the strings contained in it will be updated. Any strings that are missing will be
   * ignored and the current values will remain unchanged.
   */
  updateLanguagePack: (newPack: DeepPartial<LanguagePack>) => void;

  /**
   * This updates the map that can be used to override the values for CSS variables in the application.
   */
  updateCSSVariables: (
    publicVars: Partial<Record<CSSVariable, string>>,
  ) => void;

  /**
   * Fire the view:pre:change and view:change events and change the view of the Carbon AI Chat. If a {@link ViewType} is
   * provided then that view will become visible and the rest will be hidden. If a {@link ViewState} is provided that
   * includes all of the views then all of the views will be changed accordingly. If a partial {@link ViewState} is
   * provided then only the views provided will be changed.
   */
  changeView: (newView: ViewType | ViewState) => Promise<void>;

  /**
   * Returns the list of writable elements.
   */
  writeableElements: Partial<WriteableElements>;

  /**
   * The elements of Carbon AI Chat that need to be exposed for customers to manipulate. Unlike writeable elements, these
   * elements have existing content
   */
  elements: InstanceElements;

  /**
   * Sets the input field to be invisible. Helpful for when
   * you want to force input into a button, etc.
   */
  updateInputFieldVisibility: (isVisible: boolean) => void;

  /**
   * Changes the state of Carbon AI Chat to allow or disallow input. This includes the input field as well as inputs like
   * buttons and dropdowns.
   */
  updateInputIsDisabled: (isDisabled: boolean) => void;

  /**
   * Updates the visibility of the custom unread indicator that appears on the launcher. This indicator appears as a
   * small empty circle on the launcher. If there are any unread messages from a human agent, this indicator will be
   * shown with a number regardless of the custom setting of this flag.
   */
  updateBotUnreadIndicatorVisibility: (isVisible: boolean) => void;

  /**
   * Updates the currently active homeScreenConfig. Currently only used in tooling to show live updates when editing web
   * chat configuration.
   */
  updateHomeScreenConfig: (homeScreenConfig: HomeScreenConfig) => void;

  /**
   * Scrolls to the (original) message with the given ID. Since there may be multiple message items in a given
   * message, this will scroll the first message to the top of the message window.
   *
   * @param messageID The (original) message ID to scroll to.
   * @param animate Whether or not the scroll should be animated. Defaults to true.
   */
  scrollToMessage: (messageID: string, animate?: boolean) => void;

  /**
   * An instance of the custom panel with methods to manipulate the behavior of the custom panels.
   */
  customPanels: CustomPanels;

  /**
   * Updates the custom menu options.
   *
   * @experimental
   */
  updateCustomMenuOptions: (options: CustomMenuOption[]) => void;

  /**
   * Restarts the conversation with the assistant. This does not make any changes to a conversation with a human agent.
   * This will clear all the current assistant messages from the main bot view and cancel any outstanding
   * messages. This will also clear the current assistant session which will force a new session to start on the
   * next message.
   *
   * @deprecated Use {@link ChatInstanceMessaging.restartConversation} instead.
   */
  restartConversation: () => Promise<void>;

  /**
   * Initiates a doAutoScroll on the currently visible chat panel.
   */
  doAutoScroll: () => void;

  /**
   * Either increases or decreases the internal counter that indicates whether the "bot is loading" indicator is
   * shown. If the count is greater than zero, then the indicator is shown. Values of "increase" or "decrease" will
   * increase or decrease the value. Any other value will log an error.
   */
  updateIsLoadingCounter: (direction: IncreaseOrDecrease) => void;

  /**
   * Either increases or decreases the internal counter that indicates whether the hydration fullscreen loading state is
   * shown. If the count is greater than zero, then the indicator is shown. Values of "increase" or "decrease" will
   * increase or decrease the value. Any other value will log an error.
   */
  updateIsChatLoadingCounter: (direction: IncreaseOrDecrease) => void;

  /**
   * Updates the title of the bot panel. This value defaults to blank.
   *
   * @internal
   */
  updateMainHeaderTitle: (title?: null | string) => void;

  /**
   * Updates the avatar image of the bot panel.
   *
   * @internal
   */
  updateMainHeaderAvatar: (config?: ChatHeaderAvatarConfig) => void;

  /**
   * The state of notifications in the chat.
   *
   * @experimental
   */
  notifications: ChatInstanceNotifications;

  /**
   * Actions that are related to a service desk integration.
   */
  serviceDesk: ChatInstanceServiceDeskActions;

  /**
   * Updates the configuration that handles rendering custom objects in the chat header.
   */
  updateHeaderConfig: (config: ChatHeaderConfig) => void;

  /**
   * @internal
   * A method to update the bot name.
   */
  updateBotName: (name: string) => void;

  /**
   * @internal
   * A method to update the bot avatar.
   */
  updateBotAvatarURL: (url: string) => void;

  /**
   * Updates the Carbon AI Chat launcher config with new desktop and/or mobile titles.
   */
  updateLauncherConfig: (config: LauncherConfig) => void;
}

/**
 * @category Instance
 */
export type IncreaseOrDecrease = "increase" | "decrease";

/**
 * This interface represents the options for when a MessageRequest is sent to the server with the send method.
 *
 * @category Instance
 */
export interface SendOptions {
  /**
   * If you want to send a message to the API, but NOT have it show up in the UI, set this to true. The "pre:send"
   * and "send" events will still be fired but the message will not be added to the local message list displayed in
   * the UI. Note that the response message will still be added.
   */
  silent?: boolean;

  /**
   * @internal
   * Optionally, we can provide the original ID of the original message that present an option response_type that
   * provided the options that were selected. We use this to then set the `ui_state.setOptionSelected` in that
   * original message to be able to show which option was selected in the UI.
   */
  setValueSelectedForMessageID?: string;

  /**
   * @internal
   * If true indicates that this message should skip to the front of the queue and be sent as the next message
   * regardless of any other pending messages.
   */
  skipQueue?: boolean;

  /**
   * @internal
   * Indicates if the entrance fade animation for the message should be disabled.
   */
  disableFadeAnimation?: boolean;

  /**
   * @internal
   * Indicates if a call to send should return/resolve immediately when a streaming response begins and should not
   * wait for the entire streaming response to complete. By default, the call will wait until the entire process is
   * completed and the stream has sent all of its data to the client. If this is true, the function will return as
   * soon as the streaming begins (the first chunk is received). This is particularly useful when requesting the
   * welcome node as it would allow the welcome node to provide a streaming response without leaving Carbon AI Chat in a
   * loading state until the streaming is all done.
   */
  returnBeforeStreaming?: boolean;
}

/**
 * An object of elements we expose to developers to write to. Be sure to check the documentation of the React or
 * web component you are using for how to make use of this, as it differs based on implementation.
 *
 * @category Instance
 */
export type WriteableElements = Record<WriteableElementName, HTMLElement>;

/**
 * @category Instance
 */
export enum WriteableElementName {
  /**
   * An element that appears in the AI theme only and is shown beneath the title and description in the AI tooltip
   * content.
   */
  AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT = "aiTooltipAfterDescriptionElement",

  /**
   * An element that appears in the main message body directly above the welcome node.
   */
  WELCOME_NODE_BEFORE_ELEMENT = "welcomeNodeBeforeElement",

  /**
   * An element that appears in the header on a new line. Only visible while talking to the bot.
   */
  HEADER_BOTTOM_ELEMENT = "headerBottomElement",

  /**
   * An element that appears after the messages area and before the input area.
   */
  BEFORE_INPUT_ELEMENT = "beforeInputElement",

  /**
   * An element that appears above the input field on the home screen.
   */
  HOME_SCREEN_BEFORE_INPUT_ELEMENT = "homeScreenBeforeInputElement",

  /**
   * An element that appears on the home screen after the conversation starters.
   */
  HOME_SCREEN_AFTER_STARTERS_ELEMENT = "homeScreenAfterStartersElement",

  /**
   * An element that appears on the home screen above the welcome message and conversation starters.
   */
  HOME_SCREEN_HEADER_BOTTOM_ELEMENT = "homeScreenHeaderBottomElement",

  /**
   * An element to be housed in the custom panel.
   */
  CUSTOM_PANEL_ELEMENT = "customPanelElement",
}

/**
 * The interface represents the elements that Carbon AI Chat provides access to.
 *
 * @experimental
 *
 * @category Instance
 */
export interface InstanceElements {
  /**
   * Returns the element that represents the main window.
   *
   * @experimental
   */
  getMainWindow: () => HasAddRemoveClassName;

  /**
   * Returns the element that represents the input field (text area) on the main message area.
   *
   * This will likely change to a contenteditable div before we move away from experimental.
   *
   * @experimental
   */
  getMessageInput: () => InstanceInputElement;

  /**
   * Returns the element that represents the input field (text area) on the home screen.
   *
   * This will likely change to a contenteditable div before we move away from experimental.
   *
   * @experimental
   */
  getHomeScreenInput: () => InstanceInputElement;
}

/**
 * Represents one of the input elements that Carbon AI Chat provides access to custom code.
 *
 * @category Instance
 */
export interface InstanceInputElement {
  /**
   * The raw HTML element for the element.
   *
   * This will likely change to a contenteditable div before we move away from experimental.
   *
   * @experimental
   */
  getHTMLElement: () => HTMLTextAreaElement;

  /**
   * Sets the current text value inside the input.
   */
  setValue: (value: string) => void;

  /**
   * Enables or disables the handling of the enter key by the input field.
   */
  setEnableEnterKey: (isEnabled: boolean) => void;

  /**
   * Adds a listener that will fire whenever the value in the input field is changed. This fires immediately like an
   * "input" event and not only when focus is lost like a "change".
   */
  addChangeListener: (listener: ChangeFunction) => void;

  /**
   * Removes a change listener that was previously added.
   */
  removeChangeListener: (listener: ChangeFunction) => void;
}

/**
 * Add notification messages to the chat.
 *
 * @category Instance
 *
 * @experimental
 */
export interface ChatInstanceNotifications {
  /**
   * Add a system level notification to the list of system notifications.
   */
  addNotification: (notification: NotificationMessage) => void;

  /**
   * Remove a system level notification from the list of system notifications.
   */
  removeNotifications: (groupID: string) => void;

  /**
   * Remove all system level notifications from the list of system notifications.
   */
  removeAllNotifications: () => void;
}

/**
 * @category Instance
 */
export type ChangeFunction = (text: string) => void;

/**
 * Represents an item that can add or remove class names.
 *
 * @category Instance
 */
export interface HasAddRemoveClassName {
  /**
   * Adds the given class name to the element.
   */
  addClassName(name: string): void;

  /**
   * Removes the given class name from the element.
   */
  removeClassName(name: string): void;
}

/**
 * Upload options. Currently only applies to conversations with a human agent.
 *
 * @category Instance
 */
export interface FileUploadCapabilities {
  /**
   * Indicates that file uploads may be performed by the user.
   */
  allowFileUploads: boolean;

  /**
   * If file uploads are allowed, this indicates if more than one file may be selected at a time. The default is false.
   */
  allowMultipleFileUploads: boolean;

  /**
   * If file uploads are allowed, this is the set a file types that are allowed. This is filled into the "accept"
   * field for the file input element.
   */
  allowedFileUploadTypes: string;
}

/**
 * Start or end conversations with human agent.
 *
 * @category Instance
 */
export interface ChatInstanceServiceDeskActions {
  /**
   * Ends the conversation with a human agent. This does not request confirmation from the user first. If the user
   * is not connected or connecting to a human agent, this function has no effect. You can determine if the user is
   * connected or connecting by calling {@link ChatInstance.getState}. Note that this function
   * returns a Promise that only resolves when the conversation has ended. This includes after the
   * {@link BusEventType.HUMAN_AGENT_PRE_END_CHAT} and {@link BusEventType.HUMAN_AGENT_END_CHAT} events have been fired and
   * resolved.
   */
  endConversation: () => Promise<void>;

  /**
   * Sets the suspended state for an agent conversation. A conversation can be suspended or un-suspended only if the
   * user is currently connecting or connected to an agent. If a conversation is suspended, then messages from the user
   * will no longer be routed to the service desk and incoming messages from the service desk will not be displayed. In
   * addition, the current connection status with an agent will not be shown.
   */
  updateIsSuspended: (isSuspended: boolean) => Promise<void>;
}

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  CustomPanels,
  ViewState,
  ViewType,
  WorkspaceCustomPanelConfigOptions,
} from "./apiTypes";
import { BusEvent, BusEventType } from "../events/eventBusTypes";
import { ChatInstanceMessaging } from "../config/MessagingConfig";
import type { PersistedState } from "../state/AppState";
import type { PersistedHumanAgentState } from "../state/PersistedHumanAgentState";
import { MessageRequest } from "../messaging/Messages";
import type { ServiceManager } from "../../chat/services/ServiceManager";

/**
 * The interface represents the API contract with the chat widget and contains all the public methods and properties
 * that can be used with Carbon AI Chat.
 *
 * @category Instance
 */
export interface ChatInstance extends EventHandlers, ChatActions {
  /**
   * Returns state information of the Carbon AI Chat that could be useful.
   */
  getState: () => PublicChatState;

  /**
   * Manager for accessing and controlling custom panels.
   */
  customPanels?: CustomPanels;

  /**
   * Internal testing property that exposes the serviceManager.
   * Only available when exposeServiceManagerForTesting is set to true in PublicConfig.
   *
   * @internal
   */
  serviceManager?: ServiceManager;
}

/**
 * This is the state made available by calling {@link ChatInstance.getState}. This is a public method that returns immutable values.
 *
 * @category Instance
 */
export interface PublicInputState {
  /**
   * @experimental Raw text currently queued in the input before being sent to customSendMessage.
   */
  rawValue: string;
}

/**
 * Represents public state for default custom panel.
 *
 * @category Instance
 */
export interface PublicDefaultCustomPanelState {
  /** Indicates if the default custom panel overlay is currently open. */
  isOpen: boolean;
}
/**
 * Represents public state for workspace custom panel.
 *
 * @category Instance
 */
export interface PublicWorkspaceCustomPanelState {
  /** Indicates if the workspace custom panel overlay is currently open. */
  isOpen: boolean;
  /**
   * Config options for the workspace panels.
   */
  options: WorkspaceCustomPanelConfigOptions;
}

/**
 * Represents public state for each supported custom panel variant.
 *
 * @category Instance
 */
export interface PublicCustomPanelsState {
  /** State for the default overlay-style custom panel. */
  default: PublicDefaultCustomPanelState;
  /**
   * State for the workspace custom panel.
   *
   * @experimental
   */
  workspace: PublicWorkspaceCustomPanelState;
}

/**
 * Type returned by {@link ChatInstance.getState}.
 *
 * @category Instance
 */
export type PublicChatState = Readonly<
  Omit<PersistedState, "humanAgentState"> & {
    /**
     * Current human agent state.
     */
    humanAgent: PublicChatHumanAgentState;

    /**
     * Counter that indicates if a message is loading and a loading indicator should be displayed.
     * If "0" then we do not show loading indicator.
     */
    isMessageLoadingCounter: number;

    /**
     * Optional string to display next to the loading indicator.
     */
    isMessageLoadingText?: string;

    /**
     * Counter that indicates if the chat is hydrating and a full screen loading state should be displayed.
     */
    isHydratingCounter: number;

    /**
     * The message id of the currently active response. The "active response" is the latest response that has been
     * received or is expected. For instance, if you send another message the current activeResponseId will be set to
     * null until you get a new response back. This is meant to be used to disable any user inputs in a user_defined
     * response that you don't want active if its not a message you should be receiving inputs from.
     */
    activeResponseId: string | null;

    /**
     * @experimental State representing the main input surface.
     */
    input: PublicInputState;

    /**
     * @experimental State for any surfaced custom panels.
     */
    customPanels: PublicCustomPanelsState;
  }
>;

/**
 * Methods for controlling the input field.
 *
 * @category Instance
 */
export interface ChatInstanceInput {
  /**
   * @experimental Updates the raw text queued in the input before it is sent to customSendMessage.
   * Use this when you want to manipulate the canonical value while leaving presentation up to the default renderer or,
   * in the future, a custom slot implementation.
   *
   * @example
   * ```ts
   * instance.input.updateRawValue((prev) => `${prev} @celeste`);
   * ```
   */
  updateRawValue: (updater: (previous: string) => string) => void;
}

/**
 * Current connection state of the human agent experience.
 *
 * @category Instance
 */
export type PublicChatHumanAgentState = Readonly<
  PersistedHumanAgentState & {
    /** Indicates if Carbon AI Chat is attempting to connect to an agent. */
    isConnecting: boolean;
  }
>;

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
   * @deprecated Configure via {@link InputConfig.isVisible}.
   */
  updateInputFieldVisibility: (isVisible: boolean) => void;

  /**
   * @deprecated Configure via {@link InputConfig.isDisabled}
   * or {@link PublicConfig.isReadonly}.
   */
  updateInputIsDisabled: (isDisabled: boolean) => void;

  /**
   * @deprecated Configure via {@link LauncherConfig.showUnreadIndicator}.
   */
  updateAssistantUnreadIndicatorVisibility: (isVisible: boolean) => void;

  /**
   * Scrolls to the (original) message with the given ID. Since there may be multiple message items in a given
   * message, this will scroll the first message to the top of the message window.
   *
   * @param messageID The (original) message ID to scroll to.
   * @param animate Whether or not the scroll should be animated. Defaults to true.
   */
  scrollToMessage: (messageID: string, animate?: boolean) => void;

  /**
   * Restarts the conversation with the assistant. This does not make any changes to a conversation with a human agent.
   * This will clear all the current assistant messages from the main assistant view and cancel any outstanding
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
   * @param direction Either increases or decreases the internal counter that indicates whether the "message is loading"
   * indicator is shown. If the count is greater than zero, then the indicator is shown. Values of "increase" or "decrease" will
   * increase or decrease the value. "reset" will set the value back to 0. You may pass undefined as the first value
   * if you just wish to update the message.
   *
   * You can access the current value via {@link ChatInstance.getState}.
   *
   * @param message You can also, optionally, pass a plain text string as the second argument. It will display next to the loading indicator for
   * you to give meaningful feedback while the message is loading (or simple strings like "Thinking...", etc). The most
   * recent value will be used. So if you call it with a string value and then again with no value, the value will be
   * replaced with undefined and stop showing in the UI.
   */
  updateIsMessageLoadingCounter: (
    direction: IncreaseOrDecrease,
    message?: string,
  ) => void;

  /**
   * Either increases or decreases the internal counter that indicates whether the hydration fullscreen loading state is
   * shown. If the count is greater than zero, then the indicator is shown. Values of "increase" or "decrease" will
   * increase or decrease the value. "reset" will set the value back to 0.
   *
   * You can access the current value via {@link ChatInstance.getState}.
   */
  updateIsChatLoadingCounter: (direction: IncreaseOrDecrease) => void;

  /**
   * Actions for mutating the chat input contents.
   */
  input: ChatInstanceInput;

  /**
   * Actions that are related to a service desk integration.
   */
  serviceDesk: ChatInstanceServiceDeskActions;

  /**
   * Remove any record of the current session from the browser's SessionStorage.
   *
   * @param keepOpenState If we are destroying the session to restart the chat this can be used to preserve if the web
   * chat is open.
   */
  destroySession: (keepOpenState?: boolean) => Promise<void>;
}

/**
 * @category Instance
 */
export type IncreaseOrDecrease = "increase" | "decrease" | "reset" | undefined;

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
   * An element that appears in the header on a new line. Only visible while talking to the assistant.
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

  /**
   * An element to be housed in the custom panel.
   */
  WORKSPACE_PANEL_ELEMENT = "workspacePanelElement",
}

/**
 * @category Instance
 */
export type ChangeFunction = (text: string) => void;

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

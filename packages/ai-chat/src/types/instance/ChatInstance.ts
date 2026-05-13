/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { CustomPanels, ViewState, ViewType } from "./apiTypes";
import { ChatInstanceMessaging } from "../config/MessagingConfig";
import type { CatastrophicErrorPanelState } from "../state/AppState";
import { MessageRequest } from "../messaging/Messages";
import type { ServiceManager } from "../../chat/services/ServiceManager";
import { AutoScrollOptions } from "../utilities/HasDoAutoScroll";
import type { EventHandlers } from "./EventHandlers";
import type { PublicChatState } from "./PublicChatState";
import type { ChatInstanceInput } from "./ChatInstanceInput";
import type { ChatInstanceServiceDeskActions } from "./ChatInstanceServiceDeskActions";
import type { WriteableElements } from "./WriteableElements";

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
   * Fires an event that will open or close the Catastrophic Error Panel in the chat. This also accepts a
   * custom title and body text (markdown supported) to be displayed in the Catastrophic Error Panel.
   *
   * @param panelState The new state of the Catastrophic Error Panel, optionally including a custom title and body text.
   */
  updateCatastrophicErrorPanel: (
    panelState: CatastrophicErrorPanelState,
  ) => void;

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
   * Recalculates the chat's scroll position and spacer after an external layout change.
   *
   * Call this after your custom response component finishes rendering, loads media, or
   * otherwise changes height in a way the chat cannot detect automatically (e.g. after
   * injecting content via {@link WriteableElements}). The chat will re-pin the last
   * qualifying message to the top of the viewport and adjust the spacer accordingly.
   *
   * To scroll to the very bottom of the message list instead, pass `{ scrollToBottom: 0 }`.
   * The spacer reconciliation pass still runs after explicit top/bottom overrides so pin
   * geometry remains accurate for subsequent updates.
   *
   * @param options Optional overrides for scroll behavior. See {@link AutoScrollOptions}.
   */
  doAutoScroll: (options?: AutoScrollOptions) => void;

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
 * @category Instance
 */
export type ChangeFunction = (text: string) => void;

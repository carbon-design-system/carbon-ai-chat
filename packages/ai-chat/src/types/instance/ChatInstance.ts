/*
 *  Copyright IBM Corp. 2025, 2026
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
import type {
  CatastrophicErrorPanelState,
  PersistedState,
} from "../state/AppState";
import type { PersistedHumanAgentState } from "../state/PersistedHumanAgentState";
import { MessageRequest, StructuredData } from "../messaging/Messages";
import type { ServiceManager } from "../../chat/services/ServiceManager";
import { AutoScrollOptions } from "../utilities/HasDoAutoScroll";
import type { Editor, JSONContent } from "../utilities/tiptapReexports";

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

  /**
   * Tiptap-native JSON projection of the editor doc. Updated on every doc
   * change: user typing, paste, trigger-driven mentions/commands, host-pushed
   * `setContent` / `insertContent` writes, and any host-dispatched
   * transactions. Always consistent with `rawValue` (both derive from the
   * same underlying document; no extra storage).
   *
   * Hosts persisting this value should serialize through `editor.getJSON()`
   * (canonical) rather than partial walks; the JSONContent shape is
   * governed by Tiptap's stability guarantees.
   *
   * @experimental
   */
  content: JSONContent;

  /**
   * A snapshot of the pending structured data currently queued in the input. This data will be merged
   * into the next outgoing {@link MessageRequest} when the user sends a message via the UI.
   *
   * @experimental
   */
  structuredData?: StructuredData;

  /**
   * `true` while one or more file uploads initiated via {@link UploadConfig.onFileUpload} are still
   * in progress.  The send button is disabled while this is `true`.
   *
   * @experimental
   */
  hasInFlightUploads: boolean;
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

  /**
   * The ID of the workspace attached to this panel. Used to match with a given Preview Card.
   */
  workspaceID?: string;

  /**
   * Additional metadata associated with the workspace.
   */
  additionalData?: unknown;
}

/**
 * Represents public state for history panel.
 *
 * @category Instance
 */
export interface PublicHistoryPanelState {
  /** Indicates if the history panel is currently open. */
  isOpen: boolean;

  /** Indicates if the history panel should open in chat panel. */
  isMobile: boolean;
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

  /**
   * State for the history panel.
   */
  history: PublicHistoryPanelState;
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
     * State for any surfaced custom panels.
     */
    customPanels: PublicCustomPanelsState;

    /**
     * State for the workspace panel.
     *
     * @experimental
     */
    workspace: PublicWorkspaceCustomPanelState;
  }
>;

/**
 * Methods for controlling the input field.
 *
 * @category Instance
 */
export interface ChatInstanceInput {
  /**
   * @deprecated Use {@link ChatInstanceInput.setContent} instead. For a
   * string updater on a plain-text-only document, the equivalent call is:
   *
   * ```ts
   * const current = instance.getState().input.rawValue;
   * instance.input.setContent(updater(current));
   * ```
   *
   * Throws if the editor doc contains any node type other than
   * `paragraph`, `text`, or `hardBreak`, or if any text node carries
   * marks. Empty paragraphs pass through; `hardBreak` renders as `\n` in
   * the rawValue projection. Emits one deprecation warning per session.
   */
  updateRawValue: (updater: (previous: string) => string) => void;

  /**
   * Replace the entire input content with a Tiptap JSONContent doc (or a
   * plain string for the simple plain-text case), or with the result of
   * a reducer that receives the current JSONContent and returns the next.
   *
   * Throws "Input is not currently rendered" when called before the
   * input is mounted.
   *
   * @example
   * ```ts
   * instance.input.setContent({
   *   type: "doc",
   *   content: [{
   *     type: "paragraph",
   *     content: [
   *       { type: "text", text: "Hi " },
   *       { type: "mention", attrs: { id: "1", label: "Alice", value: "@alice" } },
   *     ],
   *   }],
   * });
   *
   * instance.input.setContent("Hi @alice");
   * ```
   *
   * @experimental
   */
  setContent: (
    next: JSONContent | string | ((previous: JSONContent) => JSONContent),
  ) => void;

  /**
   * Insert content at the current cursor position, or at `options.at`
   * (a ProseMirror document offset — NOT a JSONContent array index).
   * Accepts a JSONContent fragment or a plain string.
   *
   * Throws "Input is not currently rendered" when called before the
   * input is mounted.
   *
   * @experimental
   */
  insertContent: (
    content: JSONContent | string,
    options?: { at?: number },
  ) => void;

  /**
   * Updates the pending structured data that will be merged into the next outgoing {@link MessageRequest}
   * when the user sends a message via the UI send button or Enter key. The updater function receives the
   * current pending structured data (or `undefined` if none is set) and should return the new value.
   * Return `undefined` to clear the pending structured data.
   *
   * This is the primary mechanism for pushing structured inputs (form fields, file references, etc.)
   * into the active input so they are included when the user hits Send.
   *
   * @example
   * ```ts
   * // Add a field to the pending structured data
   * instance.input.updateStructuredData((prev) => ({
   *   ...prev,
   *   fields: [
   *     ...(prev?.fields ?? []),
   *     { id: 'rating', type: 'number', value: 4 }
   *   ]
   * }));
   *
   * // Replace all pending structured data
   * instance.input.updateStructuredData(() => ({
   *   fields: [{ id: 'selection', type: 'multi_select', value: ['a', 'b'] }]
   * }));
   *
   * // Clear pending structured data
   * instance.input.updateStructuredData(() => undefined);
   * ```
   *
   * @experimental
   */
  updateStructuredData: (
    updater: (
      previous: StructuredData | undefined,
    ) => StructuredData | undefined,
  ) => void;

  /**
   * Returns the live Tiptap {@link Editor} instance, or `null` when the
   * input is not currently rendered. Probe semantics — safe to call
   * repeatedly; never throws.
   *
   * Sole escape hatch from the curated public surface. Use it for direct
   * Tiptap operations the facade doesn't cover:
   * - `editor.commands.*` for imperative actions (focus, blur,
   *   clearContent, setTextSelection, selectAll, undo, redo, plus
   *   everything else Tiptap exposes — toggleBold, insertContentAt, etc.)
   * - `editor.chain()` for command chaining
   * - `editor.view` for the live PM `EditorView`
   * - `editor.view.dispatch(setHostOriginMeta(tr))` for raw transaction
   *   dispatch — the host owns the `aichatOrigin` meta tagging
   * - `editor.state.doc` for the live PMNode
   * - `editor.getJSON()` for a JSONContent snapshot (equivalent to
   *   `getState().input.content` but live, not the immutable store copy)
   * - `editor.extensionStorage` for per-extension state
   * - `editor.on(...)` for low-level event subscriptions
   *
   * **Working with `getEditor()` from React** — three patterns:
   *
   * 1. **Subscribe via WC events when possible.** The shell-level
   *    `cds-aichat-input-*` events (`-change`, `-focus`, `-blur`,
   *    `-typing`) are re-emitted from the prompt-line and survive editor
   *    recreate. Reach for `getEditor().on(...)` only when the WC events
   *    don't cover what you need.
   *
   * 2. **Don't capture in state.** `useState(getEditor())` retains a
   *    stale reference after recreate; the editor is destroyed when
   *    `tiptap.extensions` (or any chat-domain config) changes. Call
   *    `getEditor()` inside handlers, or use a `useEffect` keyed on the
   *    configs that trigger recreate:
   *    ```ts
   *    useEffect(() => {
   *      const editor = chat.instance.input.getEditor();
   *      if (!editor) return;
   *      const handler = () => { ... };
   *      editor.on("update", handler);
   *      return () => editor.off("update", handler);
   *    }, [extensions, mention, command]);
   *    ```
   *
   * 3. **Memoize the configs.** `tiptap.extensions` (and the chat-domain
   *    configs) must be reference-stable across renders. The editor
   *    recreates on every reference change; an unmemoized array
   *    re-creates the editor on every host render, losing selection
   *    mid-edit.
   *
   * Hosts wanting a throw-on-unmount contract write the three-line guard
   * themselves: `const ed = instance.input.getEditor(); if (!ed) throw
   * new Error("input not mounted"); ed.commands.focus();`. No Carbon
   * helper.
   *
   * @experimental
   */
  getEditor: () => Editor | null;
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
   * An element that appears in the header's fixed-actions slot (before close/minimize buttons).
   */
  HEADER_FIXED_ACTIONS_ELEMENT = "headerFixedActionsElement",

  /**
   * An element that appears after the messages area and before the input area.
   */
  BEFORE_INPUT_ELEMENT = "beforeInputElement",

  /**
   * An element that appears after the input field.
   */
  AFTER_INPUT_ELEMENT = "afterInputElement",

  /**
   * An element that appears in the footer area.
   */
  FOOTER_ELEMENT = "footerElement",

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
   * An element to be housed in the workspace panel.
   */
  WORKSPACE_PANEL_ELEMENT = "workspacePanelElement",

  /**
   * An element to be housed in the history panel.
   */
  HISTORY_PANEL_ELEMENT = "historyPanelElement",
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

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// ─── Domain-file imports ────────────────────────────────────────────────────
import type { AppConfig } from "./AppConfig";
import type { MarkdownConfig } from "../config/MarkdownConfig";
import { LanguagePack } from "../config/PublicConfig";
import type { LocalMessageItem } from "../messaging/LocalMessageItem";
import ObjectMap from "../utilities/ObjectMap";
import {
  type CustomPanelConfigOptions,
  type ViewState,
  ViewType,
  DefaultCustomPanelConfigOptions,
} from "../instance/apiTypes";
import { ChatMessagesState } from "./ChatMessagesState";
import {
  type InputState,
  type StopStreamingButtonState,
  type PendingUpload,
  PendingUploadStatus,
} from "./InputState";
import { AnnounceMessage } from "./AnnounceMessage";
import { ChatWidthBreakpoint } from "./ChatWidthBreakpoint";
import { PersistedState } from "./PersistedState";
import { HumanAgentState, HumanAgentDisplayState } from "./HumanAgentState";
import { ThemeState } from "./ThemeState";
import { CatastrophicErrorPanelState } from "./panels/CatastrophicErrorPanelState";
import { IFramePanelState } from "./panels/IFramePanelState";
import { ViewSourcePanelState } from "./panels/ViewSourcePanelState";
import { CustomPanelState } from "./panels/CustomPanelState";
import { WorkspacePanelState } from "./panels/WorkspacePanelState";
import { HistoryPanelState } from "./panels/HistoryPanelState";
import { MessagePanelState } from "./panels/MessagePanelState";
import type { FileUpload } from "../config/ServiceDeskConfig";

// ─── Re-export domain symbols ────────────────────────────────────────────────
// All previously-imported files continue to resolve `import { X } from "./AppState"`
// without any changes to those 73 files.
export type {
  ChatMessagesState,
  InputState,
  StopStreamingButtonState,
  PendingUpload,
  AnnounceMessage,
  PersistedState,
  HumanAgentState,
  HumanAgentDisplayState,
  ThemeState,
  CatastrophicErrorPanelState,
  IFramePanelState,
  ViewSourcePanelState,
  CustomPanelState,
  WorkspacePanelState,
  HistoryPanelState,
  MessagePanelState,
  FileUpload,
};
export { ChatWidthBreakpoint, PendingUploadStatus };
// Re-export instance API types that this module has always tunnelled through
export type { ViewState, CustomPanelConfigOptions };
export { ViewType, DefaultCustomPanelConfigOptions };

// ─── AppStateMessages ────────────────────────────────────────────────────────

/**
 * The message-related portion of AppState. Used for message history operations.
 */
interface AppStateMessages {
  /**
   * This is the global map/registry of all the local message items by their IDs.
   */
  allMessageItemsByID: ObjectMap<LocalMessageItem>;

  /**
   * This is the global map/registry of all full messages by their message IDs.
   */
  allMessagesByID: ObjectMap<import("../messaging/Messages").Message>;

  /**
   * The state of messages when the user is interacting with the assistant.
   */
  assistantMessageState: ChatMessagesState;
}

// ─── AppStatePanels ──────────────────────────────────────────────────────────

/**
 * The panel-visibility sub-group of AppState.
 */
interface AppStatePanels {
  /**
   * Has thrown an error that Carbon AI Chat can not recover from.
   */
  catastrophicErrorType?: boolean;

  /**
   * The state information of a catastrophic error panel.
   */
  catastrophicErrorPanelState?: CatastrophicErrorPanelState;

  /**
   * The state of the iframe panel.
   */
  iFramePanelState: IFramePanelState;

  /**
   * The state of the conversational search citation panel.
   */
  viewSourcePanelState: ViewSourcePanelState;

  /**
   * The custom panel state.
   */
  customPanelState: CustomPanelState;

  /**
   * The workspace panel state.
   */
  workspacePanelState: WorkspacePanelState;

  /**
   * The history panel state.
   */
  historyPanelState: HistoryPanelState;

  /**
   * The state of the panel surfaced by response types, either with or without user input.
   */
  responsePanelState: MessagePanelState;
}

// ─── AppStateView ─────────────────────────────────────────────────────────────

/**
 * The view and layout sub-group of AppState.
 */
interface AppStateView {
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
   * Before Carbon AI Chat is loaded, the initial view state is set to everything closed (which reflects the reality of the
   * page as Carbon AI Chat is loading). This property is the view state we want Carbon AI Chat to try to get to after it is loaded.
   * If a previous session already exists, then this target will be set to the previous view state so we get back to
   * where we were. If there is no session, this will be set to a default that is based on the current Carbon AI Chat
   * config and page context (such as considering if openChatByDefault is set). After Carbon AI Chat is loaded, this value is
   * no longer used.
   */
  targetViewState: ViewState;

  /**
   * Indicates if we should display a transparent background covering the non-header area of the main window.
   */
  showNonHeaderBackgroundCover: boolean;
}

// ─── AppStateLifecycle ───────────────────────────────────────────────────────

/**
 * The lifecycle and session sub-group of AppState.
 */
interface AppStateLifecycle {
  /**
   * Whether we have hydrated Carbon AI Chat. This means we have loaded session history if it exists as well as the
   * welcome node (if appropriate).
   */
  isHydrated: boolean;

  /**
   * The external configuration for the chat widget that includes the public config provided by the host page as well
   * as the remote config provided by the tooling.
   */
  config: AppConfig;

  /**
   * The active language pack: the `enLanguagePack` defaults merged with any host-provided `strings` overrides. Kept in
   * its own top-level slice (rather than under `config.derived`) so that changing a string updates only language-pack
   * consumers and never churns the rest of the config tree. Updated via `setAppStateValue("languagePack", ...)`.
   */
  languagePack: LanguagePack;

  /**
   * Host-provided markdown config (custom renderers + markdown-it plugins). Kept in its own top-level slice and read
   * with `useSelector` by the deep `MarkdownWithDefaults` consumer, instead of a global context provider. Set from the
   * `markdown` prop in `ChatAppEntry` via `setAppStateValue("markdownConfig", ...)`; `undefined` when the host omits it.
   */
  markdownConfig?: MarkdownConfig;

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
   * Any items stored here is also persisted to sessionStorage. This is used for things you want to maintain
   * across page reloads like "is the launcher open".
   */
  persistedToBrowserStorage: PersistedState;

  /**
   * Volatile UI state related to the current human agent session. This is not persisted and is reset on reload.
   */
  humanAgentState: HumanAgentState;

  /**
   * The state of the input area when the user is interacting with an assistant (not a human agent).
   */
  assistantInputState: InputState;

  /**
   * Indicates if a restart is currently in progress.
   */
  isRestarting: boolean;

  /**
   * Indicates if the browser page is visible. This uses the Page Visibility API which needs to be taken with a
   * grain of salt. A visibility change only occurs if the page moves in or out of being 100% visible. This occurs
   * when you switch tabs within the same window or if you minimize/maximize a window. If you switch to a different
   * window, this window changes visibility only if the entire window is covered.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
   */
  isBrowserPageVisible: boolean;
}

// ─── AppState (top-level, flat runtime shape preserved) ──────────────────────

/**
 * This contains the definitions for the redux application state.
 */
interface AppState
  extends AppStateMessages, AppStatePanels, AppStateView, AppStateLifecycle {}

export {
  AppStateMessages,
  AppStatePanels,
  AppStateView,
  AppStateLifecycle,
  AppState,
};

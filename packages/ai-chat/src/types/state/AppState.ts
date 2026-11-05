/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// ─── Barrel re-exports ───────────────────────────────────────────────────────
// All 73 files that `import { X } from "./types/state/AppState"` resolve here
// without any changes to those files.

export type { AppStateMessages, ChatMessagesState } from './ChatMessagesState';
export type { InputState, PendingUpload } from './InputState';
export { PendingUploadStatus } from './InputState'; // enum (runtime value)
export type {
  HumanAgentState,
  HumanAgentDisplayState,
} from './HumanAgentState';
export type { ThemeState } from './ThemeState';
export type { PersistedState } from './PersistedState'; // public — @category Instance
export { ChatWidthBreakpoint } from './ChatWidthBreakpoint'; // enum (runtime value)
export type { CatastrophicErrorPanelState } from './panels/CatastrophicErrorPanelState'; // public — @category Instance

// Pass-throughs that real code imports via state/AppState — kept verbatim:
export type { ViewState } from '../instance/apiTypes';
export { ViewType } from '../instance/apiTypes'; // enum (runtime value)
export type { FileUpload } from '../config/ServiceDeskConfig';

// ─── Local imports (used only for the interfaces defined below) ──────────────
import type { AppConfig } from './AppConfig';
import { LanguagePack } from '../config/LanguagePack';
import type { InputState } from './InputState';
import type { HumanAgentState } from './HumanAgentState';
import type { PersistedState } from './PersistedState';
import type { AppStateMessages } from './ChatMessagesState';
import type { ConversationStatus } from '../instance/PublicChatState';
import type { ViewPartitionState } from './ViewPartitionState';

// ─── ConversationState ───────────────────────────────────────────────────────

/**
 * The conversation partition: the chat's one store without its view part.
 * Conversation code sees only this.
 */
interface ConversationState extends AppStateMessages {
  /** Current conversation operation phase. */
  conversationStatus: ConversationStatus;

  /**
   * Whether we have hydrated Carbon AI Chat. This means we have loaded session history if it exists as well as the
   * welcome node (if appropriate).
   */
  isHydrated: boolean;

  /**
   * Indicates if a restart is currently in progress.
   */
  isRestarting: boolean;

  /**
   * The state of the input area when the user is interacting with an assistant (not a human agent).
   */
  assistantInputState: InputState;

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
   * Volatile UI state related to the current human agent session. This is not persisted and is reset on reload.
   */
  humanAgentState: HumanAgentState;

  /**
   * The conversation's half of the saved session: the agent connection, and whether a message was sent. The view
   * partition saves the rest.
   */
  persistedToBrowserStorage: ConversationPersistedState;
}

/** The conversation's half of {@link PersistedState}. */
type ConversationPersistedState = Pick<
  PersistedState,
  'hasSentNonWelcomeMessage' | 'humanAgentState'
>;

// ─── AppState ────────────────────────────────────────────────────────────────

/**
 * The prebuilt chat's whole store: the conversation partition, plus the view partition under `view`. Only
 * `chat/` and `view/` see this type.
 */
type AppState = ConversationState & { view: ViewPartitionState };

export type { ConversationState, ConversationPersistedState };
export type { AppState };

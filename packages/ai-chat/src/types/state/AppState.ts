/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// ─── Barrel re-exports ───────────────────────────────────────────────────────
// For the prebuilt chat. Conversation code and public types import each
// module directly, because `AppState` below reaches view code.

export type { AppStateMessages } from './ChatMessagesState';
export type { InputState, PendingUpload } from './InputState';
export { PendingUploadStatus } from './InputState'; // enum (runtime value)
export type { HumanAgentDisplayState } from './HumanAgentState';
export type { PersistedState } from './PersistedState'; // public — @category Instance
export { ChatWidthBreakpoint } from './ChatWidthBreakpoint'; // enum (runtime value)
export type { CatastrophicErrorPanelState } from './panels/CatastrophicErrorPanelState'; // public — @category Instance

// Pass-throughs that real code imports via state/AppState — kept verbatim:
export type { ViewState } from '../instance/apiTypes';
export { ViewType } from '../instance/apiTypes'; // enum (runtime value)
export type { FileUpload } from '../config/ServiceDeskConfig';

// ─── Local imports (used only for the type defined below) ───────────────────
import type { AppConfig } from './AppConfig';
import type { ConversationState } from './ConversationState';
import type { ViewPartitionState } from './ViewPartitionState';

export type {
  ConversationPersistedState,
  ConversationState,
} from './ConversationState';

// ─── AppState ────────────────────────────────────────────────────────────────

/**
 * The prebuilt chat's whole store: the conversation partition, with the whole
 * `AppConfig` it stores in `config`, plus the view partition under `view`. Only
 * the prebuilt chat sees this type. Conversation code imports the modules this
 * file re-exports, never this file, because the whole config reaches view code.
 */
type AppState = Omit<ConversationState, 'config'> & {
  config: AppConfig;
  view: ViewPartitionState;
};

export type { AppState };

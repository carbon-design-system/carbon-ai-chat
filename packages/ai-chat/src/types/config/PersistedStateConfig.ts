/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { PersistedState } from "../state/AppState";

/**
 * The subset of session state that Carbon AI Chat can persist and restore, consumed by
 * {@link PersistedStateConfig}. It is the full internal {@link PersistedState} minus the
 * framework-internal bookkeeping (`version` and `wasLoadedFromBrowser`), so a value produced by
 * {@link PersistedStateConfig.onStateChange} can be handed straight back to
 * {@link PersistedStateConfig.initialState} to restore a session.
 *
 * @category Config
 *
 * @experimental
 */
export type PersistableState = Omit<
  PersistedState,
  "version" | "wasLoadedFromBrowser"
>;

/**
 * Hands session-state persistence to the host page, set on {@link PublicConfig.persistedState}. By
 * default Carbon AI Chat stores session state in the browser's `sessionStorage`; providing either
 * field replaces that built-in storage — the chat no longer reads or writes `sessionStorage` and
 * instead boots from {@link PersistedStateConfig.initialState} and reports every change to
 * {@link PersistedStateConfig.onStateChange}. When neither field is set, the default `sessionStorage`
 * behavior is unchanged.
 *
 * Round-trip the whole {@link PersistableState} value. Dropping fields such as `disclaimersAccepted`,
 * `humanAgentState`, or `hasSentNonWelcomeMessage` regresses the experience on reload: the disclaimer
 * re-prompts, an in-progress human-agent chat cannot reconnect, and the welcome message is re-sent.
 *
 * @category Config
 * @experimental
 */
export interface PersistedStateConfig {
  /**
   * The session state to boot from, used in place of reading `sessionStorage`. Resolve any
   * asynchronous load (for example from your own backend) before constructing the chat and pass the
   * resolved value here. When omitted, the chat starts a fresh session but still reports changes to
   * {@link PersistedStateConfig.onStateChange}.
   *
   * @experimental
   */
  initialState?: PersistableState;

  /**
   * Called whenever the persistable session state changes, so the host can store it wherever it likes
   * (its own backend, `localStorage`, and so on). Replaces the internal `sessionStorage` write. The
   * argument is the complete {@link PersistableState}; persist it verbatim so it can later seed
   * {@link PersistedStateConfig.initialState}.
   *
   * @experimental
   */
  onStateChange?: (state: PersistableState) => void;
}

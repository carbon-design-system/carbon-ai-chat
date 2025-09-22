/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ResponseUserProfile } from "../messaging/Messages";

/**
 * The subset of HumanAgentState that is persisted to browser storage.
 */
interface PersistedHumanAgentState {
  /** Indicates that the user is connected to a human agent. */
  isConnected: boolean;

  /** Indicates if the human agent conversation is currently suspended. */
  isSuspended: boolean;

  /** The profile of the last human agent to join the chat. */
  responseUserProfile?: ResponseUserProfile;

  /** Cache of known agent profiles by ID. */
  responseUserProfiles: Record<string, ResponseUserProfile>;

  /** Arbitrary state saved by the service desk. */
  serviceDeskState?: unknown;
}

export type { PersistedHumanAgentState };

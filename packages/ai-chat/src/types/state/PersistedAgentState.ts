/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { AgentProfile } from "../messaging/Messages";

/**
 * The state of a conversation with an agent that is persisted in browser storage.
 */
interface PersistedAgentState {
  /**
   * Indicates that the user is currently connected to an agent and a chat is in progress. This does not necessarily
   * mean that an agent has joined the conversation.
   */
  isConnected: boolean;

  /**
   * Indicates if the agent conversation is currently suspended. That means that control has been returned to the
   * assistant/bot conversation and that information regarding the current again conversation should be hidden. This
   * means the connecting state is hidden (if in the middle of requesting an agent) and input from the user is routed to
   * the assistant instead of the service desk.
   */
  isSuspended: boolean;

  /**
   * This is the profile of the last human agent to join a chat within a service desk. This value is preserved even
   * when the chat is disconnected.
   */
  agentProfile?: AgentProfile;

  /**
   * This is a cache of the known agent profiles by agent ID.
   */
  agentProfiles: Record<string, AgentProfile>;

  /**
   * Arbitrary state to save by the service desk. The information stored here various by service desk.
   */
  serviceDeskState?: unknown;
}

export { PersistedAgentState };

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

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
   *
   * @example End the active human-agent conversation
   * ```ts
   * await instance.serviceDesk.endConversation();
   * ```
   */
  endConversation: () => Promise<void>;

  /**
   * Sets the suspended state for an agent conversation. A conversation can be suspended or un-suspended only if the
   * user is currently connecting or connected to an agent. If a conversation is suspended, then messages from the user
   * will no longer be routed to the service desk and incoming messages from the service desk will not be displayed. In
   * addition, the current connection status with an agent will not be shown.
   *
   * @example Suspend, then later resume, routing to the service desk
   * ```ts
   * await instance.serviceDesk.updateIsSuspended(true);
   * // ... later ...
   * await instance.serviceDesk.updateIsSuspended(false);
   * ```
   */
  updateIsSuspended: (isSuspended: boolean) => Promise<void>;
}

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
 * @category SDK
 */
export interface ChatInstanceServiceDeskActions {
  /**
   * Starts a conversation with a human agent from your own code, such as a help button. It starts
   * the same conversation the prebuilt chat's "connect to agent" card starts when its button is
   * clicked.
   *
   * With no options, the chat starts one on its own behalf, so your assistant doesn't have to send a
   * `connect_to_agent` response first. Your service desk's {@link ServiceDesk.startChat} then gets a
   * message holding one `connect_to_agent` item with no transfer details, which the chat doesn't add
   * to the conversation. The prebuilt chat shows its connecting state without a card.
   *
   * The {@link BusEventType.HUMAN_AGENT_PRE_START_CHAT} event still fires first, and a handler can
   * still cancel the start. Then the promise resolves and nothing starts.
   *
   * If the chat hasn't loaded its history yet, it loads it first, as a send does. The promise
   * resolves when your service desk's `startChat` resolves, which doesn't mean an agent has joined.
   * Read `state.get().humanAgent` to follow the connection.
   *
   * Rejects when no service desk is configured, when `messageID` names no response with a
   * `connect_to_agent` item, when a conversation with an agent is already connecting or connected,
   * when the service desk's `startChat` throws, or after the chat was removed. A suspended
   * conversation is ended first, as the card does.
   *
   * @param options Optional. Leave it out to start a conversation without a response.
   * @param options.messageID The ID of a response in the conversation that holds a `connect_to_agent`
   * item. Your service desk gets that response, as when the user clicks its card.
   * @param options.payload Data of your own for your service desk. It arrives as
   * {@link StartChatOptions.preStartChatPayload}, unless a
   * {@link BusEventType.HUMAN_AGENT_PRE_START_CHAT} handler replaces it.
   *
   * @example Start a conversation from your own help button
   * ```ts
   * helpButton.addEventListener("click", async () => {
   *   try {
   *     await instance.serviceDesk.startConversation();
   *   } catch (error) {
   *     showError(error.message);
   *   }
   * });
   * ```
   *
   * @example Start from a response in the conversation, with data for your service desk
   * ```ts
   * await instance.serviceDesk.startConversation({
   *   messageID: "response-with-connect-item",
   *   payload: { topic: "billing" },
   * });
   * // Your service desk's startChat receives { preStartChatPayload: { topic: "billing" } }.
   * ```
   */
  startConversation: (options?: {
    messageID?: string;
    payload?: unknown;
  }) => Promise<void>;

  /**
   * Stops a screen share the user accepted, from your own control. The chat tells your service desk
   * through {@link ServiceDesk.screenShareStop} and adds the "sharing ended" status to the
   * conversation, as the prebuilt chat's "stop sharing" button does. It does nothing when no share is
   * running. Read `state.get().humanAgent.isScreenSharing` to know whether one is.
   *
   * @example Stop sharing from your own button
   * ```ts
   * instance.state.select(
   *   (state) => state.humanAgent.isScreenSharing,
   *   (isScreenSharing) => {
   *     stopSharingButton.hidden = !isScreenSharing;
   *   },
   * );
   * stopSharingButton.addEventListener("click", () => {
   *   instance.serviceDesk.stopScreenShare();
   * });
   * ```
   */
  stopScreenShare: () => Promise<void>;

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

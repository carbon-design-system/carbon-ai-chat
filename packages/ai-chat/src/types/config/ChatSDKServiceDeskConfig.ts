/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The service desk settings a conversation uses with no interface. {@link ServiceDeskPublicConfig}
 * extends it with `skipConnectHumanAgentCard`, which only the prebuilt chat's connect card uses.
 *
 * A `createChatSDK` function that starts a conversation with no interface arrives with the
 * `@carbon/ai-chat/sdk` entry point in 2.0.0.
 *
 * @category SDK
 */
export interface ChatSDKServiceDeskConfig {
  /**
   * The timeout value in seconds to use when determining agent availability. When a connect_to_agent response is
   * received, the system will ask the service desk if any agents are available. If no response is received within
   * the timeout window, the system will return "false" to indicate no agents are available.
   */
  availabilityTimeoutSeconds?: number;

  /**
   * The timeout value is seconds to use when waiting for an agent to join the chat after an agent has been
   * requested. If no agent joins after this time, the chat will be ended and an error message will be displayed to
   * the user. By default, there is no timeout.
   */
  agentJoinTimeoutSeconds?: number;

  /**
   * Indicates if Carbon AI Chat should automatically attempt to reconnect the user to a human agent when it is loaded. This
   * only works if the service desk integration being used supports reconnecting. This value defaults to true.
   */
  allowReconnect?: boolean;
}

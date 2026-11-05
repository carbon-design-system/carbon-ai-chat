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
 * `@carbon/ai-chat/sdk` entry point in a 2.x minor release.
 *
 * @category SDK
 */
export interface ChatSDKServiceDeskConfig {
  /**
   * How long to wait, in seconds, for the service desk to say whether any agents are available. If
   * it doesn't answer in time, the chat treats no agents as available.
   */
  availabilityTimeoutSeconds?: number;

  /**
   * How long to wait, in seconds, for an agent to join after one is requested, before the chat ends
   * the request. No limit by default.
   */
  agentJoinTimeoutSeconds?: number;

  /**
   * Whether the chat reconnects to a live human agent conversation when it starts. Works only with a
   * service desk that supports reconnecting. Defaults to true.
   */
  allowReconnect?: boolean;
}

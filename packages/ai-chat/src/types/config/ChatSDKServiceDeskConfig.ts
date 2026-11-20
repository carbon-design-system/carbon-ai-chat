/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ScreenShareState } from './ServiceDeskConfig';

/**
 * The service desk settings a conversation uses with no interface. {@link ServiceDeskPublicConfig}
 * extends it with `skipConnectHumanAgentCard`, which only the prebuilt chat's connect card uses,
 * and leaves out `onScreenShareRequest`, because the prebuilt chat asks with its own modal.
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

  /**
   * Answers a service desk's request to share the user's screen, with your own consent flow. Resolve
   * with {@link ScreenShareState.ACCEPTED}, {@link ScreenShareState.DECLINED}, or
   * {@link ScreenShareState.CANCELLED}, and the chat passes that answer to the service desk.
   *
   * Only a conversation with no interface calls it. The prebuilt chat's config has no such
   * setting: it always shows its consent modal. With no hook, a conversation with no interface
   * answers {@link ScreenShareState.DECLINED}.
   *
   * `signal` aborts when the request ends before you answer: the service desk cancels it, the
   * conversation with the agent ends, or the chat is removed. The service desk has already been told
   * the request was cancelled, so an answer after that is ignored.
   *
   * If it throws, rejects, or resolves with any other value, the chat answers
   * {@link ScreenShareState.DECLINED} and logs an error to the console. A second request while one
   * is waiting gets the same answer, without a second call.
   *
   * @example Ask with your own dialog
   * ```ts
   * import { ScreenShareState } from "@carbon/ai-chat";
   *
   * const config = {
   *   serviceDesk: {
   *     onScreenShareRequest: async ({ signal }) => {
   *       // openConsentDialog is your own UI. It resolves true when the user agrees.
   *       const dialog = openConsentDialog();
   *       signal.addEventListener("abort", () => dialog.close());
   *       const accepted = await dialog.answer;
   *       return accepted ? ScreenShareState.ACCEPTED : ScreenShareState.DECLINED;
   *     },
   *   },
   * };
   * ```
   */
  onScreenShareRequest?: (options: {
    signal: AbortSignal;
  }) => Promise<ScreenShareState>;
}

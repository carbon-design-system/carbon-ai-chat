/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKInstance } from '../instance/ChatSDKInstance';
import type { CustomSendMessageOptions } from './MessagingConfig';
import type { MessageRequest } from '../messaging/Messages';
import type { HistoryItem } from '../messaging/History';

/**
 * Messaging settings for a conversation with no interface. {@link PublicConfigMessaging} extends it
 * with the settings for the prebuilt chat's loading indicator and stop button.
 *
 * A `createChatSDK` function that starts a conversation with no interface arrives with the
 * `@carbon/ai-chat/sdk` entry point in a 2.x minor release.
 *
 * @typeParam I The instance each callback receives. Defaults to {@link ChatSDKInstance}; the prebuilt
 * chat passes {@link ChatInstance}.
 * @category SDK
 */
export interface ChatSDKConfigMessaging<
  I extends ChatSDKInstance = ChatSDKInstance,
> {
  /**
   * Starts a new conversation empty, instead of requesting a welcome message. A change after the
   * conversation has started takes effect at the next restart.
   */
  skipWelcome?: boolean;

  /**
   * How long a send may go unanswered, in seconds, before it fails and the abort signal passed to
   * {@link ChatSDKConfigMessaging.customSendMessage} fires. The default is 150 seconds. Set it to 0 to
   * turn the timeout off. A call to {@link ChatSDKInstanceMessaging.upsertMessage} for the turn ends
   * the wait.
   */
  messageTimeoutSecs?: number;

  /**
   * Sends a message to your assistant. The chat queues later messages until the promise from the
   * previous call settles. If the promise rejects, the turn fails.
   *
   * The abort signal in `options` fires when the send times out, is stopped, or the conversation
   * restarts.
   */
  customSendMessage?: (
    request: MessageRequest,
    requestOptions: CustomSendMessageOptions,
    instance: I
  ) => Promise<void> | void;

  /**
   * Loads the conversation's history. When set, the chat uses it instead of any other way of
   * fetching history. Changing it after the chat has called it has no effect.
   */
  customLoadHistory?: (instance: I) => Promise<HistoryItem[]>;
}

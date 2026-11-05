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
 * `@carbon/ai-chat/sdk` entry point in 2.0.0.
 *
 * @typeParam I The instance each callback receives. Defaults to {@link ChatSDKInstance}; the prebuilt
 * chat passes {@link ChatInstance}.
 * @category SDK
 */
export interface ChatSDKConfigMessaging<
  I extends ChatSDKInstance = ChatSDKInstance,
> {
  /**
   * Indicates if Carbon AI Chat should make a request for the welcome message when a new conversation begins. If this is
   * true, then Carbon AI Chat will start with an empty conversation.
   *
   * **Manual session management required**: Changes to this property after conversation has started have no effect.
   * To apply new welcome behavior, call `instance.messaging.restartConversation()`.
   */
  skipWelcome?: boolean;

  /**
   * Changes the message timeout, in seconds. The default is 150 seconds. Set to 0 to disable the timeout.
   * If no response arrives in this window, the chat shows an error and sends an abort signal to
   * {@link PublicConfigMessaging.customSendMessage}. Calling {@link ChatInstanceMessaging.addMessage},
   * {@link ChatInstanceMessaging.addMessageChunk}, or {@link ChatInstanceMessaging.upsertMessage} ends this timeout window.
   */
  messageTimeoutSecs?: number;

  /**
   * A callback for Carbon AI Chat to use to send messages to your assistant.
   *
   * Carbon AI Chat will queue up any additional user messages until the Promise from a previous call to customSendMessage
   * has resolved. If you do not make customSendMessage async, it will be up to you to manage what happens when a message is
   * sent when the previous is still processing. If the Promise rejects, an error indicator will be displayed next to the user's message.
   *
   * If the request takes longer than PublicConfigMessaging.messageTimeoutSecs than the AbortSignal will be sent.
   */
  customSendMessage?: (
    request: MessageRequest,
    requestOptions: CustomSendMessageOptions,
    instance: I
  ) => Promise<void> | void;

  /**
   * This is a callback function that is used by Carbon AI Chat to retrieve history data for populating the Carbon AI Chat. If
   * this function is defined, it will be used instead of any other mechanism for fetching history.
   *
   * If this function is mutated after it was initially called, the chat does not re-call it.
   */
  customLoadHistory?: (instance: I) => Promise<HistoryItem[]>;
}

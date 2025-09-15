/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HistoryItem } from "../messaging/History";
import type { MessageResponse, StreamChunk } from "../messaging/Messages";

/**
 * Messaging actions for a chat instance.
 *
 * @category Messaging
 */
export interface ChatInstanceMessaging {
  /**
   * Instructs the widget to process the given message as an incoming message received from the assistant. This will
   * fire a "pre:receive" event immediately and a "receive" event after the event has been processed by the widget.
   *
   * @param message A {@link MessageResponse} object.
   */
  addMessage: (message: MessageResponse) => Promise<void>;

  /**
   * Adds a streaming message chunk to the chat widget.
   */
  addMessageChunk: (chunk: StreamChunk) => Promise<void>;

  /**
   * Removes the messages with the given IDs from the chat view.
   */
  removeMessages: (messageIDs: string[]) => Promise<void>;

  /**
   * Clears the current conversation. This will trigger a restart of the conversation but will not start a new
   * conversation (hydration).
   */
  clearConversation: () => Promise<void>;

  /**
   * Inserts the given messages into the chat window as part of the chat history. This will fire the history:begin
   * and history:end events.
   */
  insertHistory: (messages: HistoryItem[]) => Promise<void>;

  /**
   * Restarts the conversation with the assistant. This does not make any changes to a conversation with a human agent.
   * This will clear all the current assistant messages from the main bot view and cancel any outstanding
   * messages. This will also clear the current assistant session which will force a new session to start on the
   * next message.
   */
  restartConversation: () => Promise<void>;
}

/**
 * Options for calling the addMessage method.
 *
 * @category Messaging
 */
export interface AddMessageOptions {
  /**
   * Indicates if the entrance fade animation for the message should be disabled.
   */
  disableFadeAnimation?: boolean;

  /**
   * Indicates if the message should be treated as a new welcome message (as opposed to an existing one loaded from
   * history).
   */
  isLatestWelcomeNode?: boolean;
}

/**
 * @category Messaging
 */
export interface CustomSendMessageOptions {
  /**
   * A signal to let customSendMessage to cancel a request if it has exceeded Carbon AI Chat's timeout.
   */
  signal: AbortSignal;

  /**
   * If the message was sent with "silent" set to true to not be displayed in the conversation history.
   */
  silent: boolean;
}

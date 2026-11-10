/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { MessageResponse, StreamChunk } from '../messaging/Messages';
import type { HistoryItem } from '../messaging/History';
import { BusEventSend } from '../events/eventBusTypes';
import type { ChatSDKInstanceMessaging } from './ChatSDKInstanceMessaging';

/**
 * Lifecycle state passed to {@link ChatInstanceMessaging.upsertMessage} to describe the
 * message's state after the upsert completes. Carbon AI Chat tracks this state internally;
 * it is never written onto a {@link MessageResponse}.
 *
 * `addMessage`, `addMessageChunk`, and `upsertMessage` may all target the same message
 * id without producing duplicate `pre:receive` / `receive` events — Carbon AI Chat tracks
 * the recorded state per id and fires those events only on the first transition to
 * {@link COMPLETE}.
 *
 * @category Messaging
 * @category SDK
 * @experimental
 */
export enum MessageState {
  /**
   * The message is still being constructed and further updates are expected. The
   * "stop streaming" affordance remains available while a message is in this state if
   * any item carries `streaming_metadata.cancellable: true`.
   */
  STREAMING = 'streaming',

  /**
   * The message has reached its final shape. Carbon AI Chat fires
   * {@link BusEventType.PRE_RECEIVE} and {@link BusEventType.RECEIVE} when a message
   * transitions into this state from any other state, including the case where no
   * message with this ID previously existed.
   */
  COMPLETE = 'complete',

  /**
   * The message terminated in an error condition. The chat displays the message as-is
   * and does not fire {@link BusEventType.PRE_RECEIVE} or {@link BusEventType.RECEIVE}
   * when a message transitions into this state. Treat `ERROR` as terminal — subsequent
   * upserts targeting the same id are still accepted but should be rare.
   */
  ERROR = 'error',
}

/**
 * The updater function passed to {@link ChatInstanceMessaging.upsertMessage}. Receives the
 * message currently stored under the target ID (or `undefined` when no message with that
 * ID is in the store) and returns the {@link MessageResponse} that should replace it. May
 * be synchronous or asynchronous.
 *
 * @param previous The message currently stored under the target id, or `undefined` on the
 *   first upsert of a new id.
 * @returns The {@link MessageResponse} to store, optionally as a Promise.
 * @category Messaging
 * @category SDK
 * @experimental
 */
export type UpsertMessageUpdater = (
  previous: MessageResponse | undefined
) => Promise<MessageResponse> | MessageResponse;

/**
 * Reasons why a message request was cancelled via the abort signal.
 *
 * @category Messaging
 */
export enum CancellationReason {
  /**
   * User clicked the "stop streaming" button during message streaming.
   */
  STOP_STREAMING = 'Stop streaming',

  /**
   * User restarted or cleared the conversation.
   */
  CONVERSATION_RESTARTED = 'Conversation restarted',

  /**
   * Message request exceeded the configured timeout duration.
   */
  TIMEOUT = 'Request timeout',

  /**
   * The chat was removed from the page. Its saved session stays, so the next chat on the page can pick the
   * conversation up again. Don't treat this reason as the end of the conversation on your server.
   */
  CHAT_REMOVED = 'Chat removed',
}

/**
 * Messaging actions for a chat instance. It extends {@link ChatSDKInstanceMessaging} with the two older
 * methods that write assistant messages: {@link ChatInstanceMessaging.addMessage} and
 * {@link ChatInstanceMessaging.addMessageChunk}.
 *
 * @category Messaging
 */
export interface ChatInstanceMessaging extends ChatSDKInstanceMessaging {
  /**
   * Instructs the widget to process the given message as an incoming message received from the assistant. This will
   * fire a "pre:receive" event immediately and a "receive" event after the event has been processed by the widget.
   *
   * @param message A {@link MessageResponse} object.
   */
  addMessage: (message: MessageResponse) => Promise<void>;

  /**
   * Adds a streaming message chunk to the chat widget.
   *
   * A chunk stream whose `customSendMessage` throws, or that is canceled before a
   * `final_response` chunk arrives, will have its `streamingState.isDone` settled to
   * `true` on the items streamed so far. The host is responsible for calling
   * `cancelCurrentMessageRequest` (or letting the chat cancel on restart) to settle
   * the stream; simply stopping calls to `addMessageChunk` without canceling leaves
   * `streamingState.isDone` as `false` indefinitely.
   */
  addMessageChunk: (chunk: StreamChunk) => Promise<void>;

  /**
   * Removes the messages with the given IDs from the chat view.
   */
  removeMessages: (messageIDs: string[]) => Promise<void>;

  /**
   * Clears the current conversation. This will trigger a restart of the conversation but will not start a new
   * conversation (hydration). It will also clear any loading indicators UNLESS you have set
   * {@link PublicConfigMessaging.messageLoadingIndicatorTimeoutSecs} to 0.
   */
  clearConversation: () => Promise<void>;

  /**
   * Inserts the given messages into the chat window as part of the chat history. This will fire the history:begin
   * and history:end events.
   */
  insertHistory: (messages: HistoryItem[]) => Promise<void>;

  /**
   * Restarts the conversation with the assistant. This does not make any changes to a conversation with a human agent.
   * This will clear all the current assistant messages from the main assistant view and cancel any outstanding
   * messages. It will also clear any loading indicators UNLESS you have set
   * {@link PublicConfigMessaging.messageLoadingIndicatorTimeoutSecs} to 0.
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
   * Indicates if the message should be treated as a new welcome message (as opposed to an existing one loaded from
   * history).
   */
  isLatestWelcomeNode?: boolean;
}

/**
 * @category Messaging
 * @category SDK
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

  /**
   * The {@link BusEventSend} event that triggered this send. Use its `source`
   * field to distinguish which UI surface the user typed from:
   *
   * - {@link MessageSendSource.HOME_SCREEN_INPUT} — the prompt line on the home
   *   screen (the chat has not yet left the home screen).
   * - {@link MessageSendSource.MESSAGE_INPUT} — the prompt line on the message
   *   list (the user is already in an active conversation).
   * - {@link MessageSendSource.HOME_SCREEN_STARTER} — a starter button on the
   *   home screen.
   * - {@link MessageSendSource.OPTION_BUTTON} / {@link MessageSendSource.OPTION_DROP_DOWN}
   *   — an option-response control.
   * - {@link MessageSendSource.POST_BACK_BUTTON} — a post-back button in a
   *   response.
   * - {@link MessageSendSource.DATE_PICKER} — a date-picker response.
   * - {@link MessageSendSource.INSTANCE_SEND} — a programmatic call to
   *   {@link ChatInstanceMessaging.send}, or to the deprecated {@link ChatInstance.send}.
   * - {@link MessageSendSource.WELCOME_REQUEST} — the internally generated
   *   welcome request fired during hydration.
   *
   * `busEventSend` is `undefined` when the send does not originate from the
   * event bus (for example, when called directly by internal plumbing).
   */
  busEventSend?: BusEventSend;
}

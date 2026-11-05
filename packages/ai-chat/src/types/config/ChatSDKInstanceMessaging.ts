/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { HistoryItem } from '../messaging/History';
import type { MessageState, UpsertMessageUpdater } from './MessagingConfig';

/**
 * Messaging actions for a conversation with no interface. {@link ChatInstanceMessaging} extends it,
 * so a prebuilt chat has all of these too.
 *
 * {@link ChatSDKInstanceMessaging.upsertMessage} writes every assistant message, streamed or not.
 * The older `addMessage` and `addMessageChunk` stay on {@link ChatInstanceMessaging}.
 *
 * A `createChatSDK` function that starts a conversation with no interface arrives with the
 * `@carbon/ai-chat/sdk` entry point in 2.0.0.
 *
 * @category SDK
 */
export interface ChatSDKInstanceMessaging {
  /**
   * Inserts or updates a single message identified by `messageID`. The `updater` receives
   * the {@link MessageResponse} currently stored under `messageID` (or `undefined` when no
   * message with that ID exists) and returns the message that should replace it.
   *
   * Calls targeting the same `messageID` are serialized — each call awaits the previous
   * call for that ID before running. Calls targeting different `messageID`s run
   * independently.
   *
   * The `state` argument describes the {@link MessageState} the chat records for this
   * message after the upsert completes; it is applied uniformly to every item in the
   * returned message. Carbon AI Chat fires {@link BusEventType.PRE_RECEIVE} and
   * {@link BusEventType.RECEIVE} exactly when this call transitions the message into
   * {@link MessageState.COMPLETE} from any other state, including the case where the
   * message did not previously exist. STREAMING-to-STREAMING and COMPLETE-to-COMPLETE
   * upserts do not fire these events.
   *
   * Message data in user-defined response, custom message footer, and receive callbacks
   * uses a snapshot. Plain objects and arrays are frozen. Cloneable special values,
   * such as dates and typed arrays, remain mutable copies with their usual APIs.
   * Copied typed arrays and DataViews use fixed bounds from their current offset and
   * length. Copied backing buffers keep their resize or grow APIs, but the views do
   * not expand when those buffers grow. Shrinking a copied buffer can put a view out
   * of bounds.
   * Opaque values, such as WeakMap, WeakSet, Promise, and Error objects, keep their
   * original references and shared internal state. Functions keep their APIs, but
   * closures, accessors, private state, and inherited prototype data remain shared. Calling
   * these APIs can affect shared state. Edits to copied message fields do not write
   * back. Use the updater or mutable {@link BusEventType.PRE_RECEIVE} data to change
   * the message.
   * Shared callback types stay unchanged; these runtime rules apply only to this method.
   * Stable add-message, chunk, and human-agent paths are unchanged.
   *
   * This call keeps its existing callback and pause waits. Rejection from an awaited
   * response or footer callback still rejects the upsert. Receive-handler errors are
   * logged without rejecting it. Detached render notifications are not directly awaited.
   * A later awaited callback of the same event type can still wait behind them in the
   * shared queue. An attempted write to frozen data follows these same error rules.
   *
   * If the returned message has no `id`, Carbon AI Chat assigns `messageID`. The
   * cancellation contract for outbound messages is unchanged — see
   * {@link CustomSendMessageOptions}.
   *
   * @param messageID The stable identifier the chat uses to track this message across
   *   subsequent upserts.
   * @param state The {@link MessageState} to record for this message once the updater
   *   resolves.
   * @param updater Function that produces the {@link MessageResponse} to store.
   * @throws `TypeError` when the updater returns `null`/`undefined`, returns a message
   *   whose `id` differs from `messageID`, or returns a non-assistant message (a request
   *   or a human-agent message).
   * @remarks A STREAMING sequence whose host simply stops calling `upsertMessage` without
   *   sending a terminal COMPLETE or ERROR write will leave `streamingState.isDone` as
   *   `false` indefinitely. The host is responsible for sending a terminal write, or for
   *   calling `cancelCurrentMessageRequest` (or restarting the conversation) to settle it.
   * @experimental Upsert semantics and the updater signature may evolve based on consumer feedback.
   */
  upsertMessage: (
    messageID: string,
    state: MessageState,
    updater: UpsertMessageUpdater
  ) => Promise<void>;

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

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HistoryItem } from "../messaging/History";
import type { MessageResponse, StreamChunk } from "../messaging/Messages";
import { BusEventSend } from "../events/eventBusTypes";

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
 * @experimental
 */
export enum MessageState {
  /**
   * The message is still being constructed and further updates are expected. The
   * "stop streaming" affordance remains available while a message is in this state if
   * any item carries `streaming_metadata.cancellable: true`.
   */
  STREAMING = "streaming",

  /**
   * The message has reached its final shape. Carbon AI Chat fires
   * {@link BusEventType.PRE_RECEIVE} and {@link BusEventType.RECEIVE} when a message
   * transitions into this state from any other state, including the case where no
   * message with this ID previously existed.
   */
  COMPLETE = "complete",

  /**
   * The message terminated in an error condition. The chat displays the message as-is
   * and does not fire {@link BusEventType.PRE_RECEIVE} or {@link BusEventType.RECEIVE}
   * when a message transitions into this state. Treat `ERROR` as terminal — subsequent
   * upserts targeting the same id are still accepted but should be rare.
   */
  ERROR = "error",
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
 * @experimental
 */
export type UpsertMessageUpdater = (
  previous: MessageResponse | undefined,
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
  STOP_STREAMING = "Stop streaming",

  /**
   * User restarted or cleared the conversation.
   */
  CONVERSATION_RESTARTED = "Conversation restarted",

  /**
   * Message request exceeded the configured timeout duration.
   */
  TIMEOUT = "Request timeout",
}

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
   * @experimental Upsert semantics and the updater signature may evolve based on consumer feedback.
   */
  upsertMessage: (
    messageID: string,
    state: MessageState,
    updater: UpsertMessageUpdater,
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
   *  BusEventSend provides extra context such as MessageSendSource.
   */
  busEventSend?: BusEventSend;
}

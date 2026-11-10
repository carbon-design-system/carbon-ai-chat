/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { SendOptions } from '../instance/ChatInstance';
import type { HistoryItem } from '../messaging/History';
import type { MessageRequest } from '../messaging/Messages';
import type { MessageState, UpsertMessageUpdater } from './MessagingConfig';

/**
 * Messaging actions for a conversation with no interface. {@link ChatInstanceMessaging} extends it,
 * so a prebuilt chat has all of these too.
 *
 * {@link ChatSDKInstanceMessaging.upsertMessage} writes every assistant message, streamed or not.
 * The older {@link ChatInstanceMessaging.addMessage} and {@link ChatInstanceMessaging.addMessageChunk}
 * stay on {@link ChatInstanceMessaging}.
 *
 * A `createChatSDK` function that starts a conversation with no interface arrives with the
 * `@carbon/ai-chat/sdk` entry point in a 2.x minor release.
 *
 * @category SDK
 */
export interface ChatSDKInstanceMessaging {
  /**
   * Sends a message to the assistant. Fires `pre:send` and then `send` on the event bus, then
   * calls {@link ChatSDKConfigMessaging.customSendMessage}. Messages sent while another turn runs
   * wait in a queue and go out in order.
   *
   * **When the promise resolves:**
   * - When `customSendMessage` resolves and the chat records the turn as sent. It doesn't wait
   *   for a reply: a response that's still streaming keeps streaming after the promise resolves.
   *   To react to the assistant's messages, listen for the `receive` event.
   * - When the turn is stopped or canceled before it finishes, or when the conversation restarts
   *   while the message waits in the queue or runs.
   *
   * **When the promise rejects:**
   * - When `customSendMessage` throws or rejects, the turn times out
   *   ({@link ChatSDKConfigMessaging.messageTimeoutSecs}), or you mark the turn failed with
   *   {@link ChatSDKInstanceMessaging.failTurn} before `customSendMessage` resolves. The
   *   conversation's `status` becomes `'error'`.
   * - In read-only mode, or while a file upload is still running. In these cases the message isn't
   *   sent and `pre:send` doesn't fire. In a prebuilt chat, `state.get().input.hasInFlightUploads`
   *   is `true` while an upload runs.
   *
   * It never throws: every failure comes back as a rejected promise.
   *
   * @param message The message to send: its text, or a full {@link MessageRequest}.
   * @param options Options for this message, such as sending it without showing it.
   *
   * @example Send a message and wait for the turn
   * ```ts
   * await instance.messaging.send("What is the weather today?");
   * // customSendMessage has resolved. Replies arrive through the receive event.
   * ```
   *
   * @example Send a message the conversation doesn't show
   * ```ts
   * await instance.messaging.send("Resync context", { silent: true });
   * ```
   *
   * @example Handle a failed send
   * ```ts
   * try {
   *   await instance.messaging.send({ input: { text: "Book a table for two" } });
   * } catch (error) {
   *   // The send failed, timed out, or the chat is read-only.
   *   console.error(error);
   * }
   * ```
   */
  send: (
    message: MessageRequest | string,
    options?: SendOptions
  ) => Promise<void>;

  /**
   * Stops the active turn, the way the chat's Stop button does. It fires the `stopStreaming`
   * event, then aborts the turn's `customSendMessage` signal with
   * {@link CancellationReason.STOP_STREAMING}.
   *
   * A turn is active from the time a message is sent until its response stops streaming, which
   * you usually see as `state.get().status` being `'submitted'` or `'streaming'`. A stop works on
   * any active turn, even one whose stream isn't marked cancellable. Messages to a human agent
   * aren't turns, so a stop leaves them alone.
   *
   * The stop settles the turn at once: `status` returns to `'ready'`, and the stopped turn's
   * {@link ChatSDKInstanceMessaging.send} promise resolves. Content already streamed stays in the
   * conversation. Chunks that arrive for the stopped turn afterward are dropped. An
   * `upsertMessage` call still writes, because it's your own write, but it doesn't make the turn
   * active again. Queued messages still go out.
   *
   * Resolves once the abort signal is delivered, without waiting for your `customSendMessage`
   * to return. With no active turn, it resolves at once, fires no event, and changes nothing.
   * Calls made while a stop is running share it, so the turn is stopped once. It never rejects:
   * if a `stopStreaming` handler throws, the error is logged and the turn still stops. If a handler
   * ends the turn itself, or the conversation restarts while handlers run, nothing more is
   * stopped.
   *
   * @example Stop the response from your own button
   * ```ts
   * stopButton.addEventListener("click", () => {
   *   instance.messaging.stop();
   * });
   * ```
   *
   * @example Show your Stop button only while a turn can be stopped
   * ```ts
   * instance.state.select(
   *   (state) => state.status === "submitted" || state.status === "streaming",
   *   (canStop) => {
   *     stopButton.hidden = !canStop;
   *   },
   * );
   * ```
   */
  stop: () => Promise<void>;

  /**
   * Marks a turn failed. Call it when your stream dies after `customSendMessage` resolved, so the
   * reply would otherwise just stop. `state.get().status` becomes `'error'`, and `state.get().error`
   * names the turn's request in `messageID`.
   *
   * With no `messageID`, it fails the active turn, else the last one. A turn is active from the time
   * its message is sent until its response stops streaming. Pass `messageID` to name the turn by
   * its request or by any of its responses. It fails assistant turns only.
   *
   * **On a turn that's still running:** it aborts the turn's `customSendMessage` signal with
   * {@link CancellationReason.TURN_FAILED}. If that turn's {@link ChatSDKInstanceMessaging.send}
   * promise hasn't settled, it rejects with the error message. Chunks that arrive for the turn
   * afterward are dropped. An `upsertMessage` call still writes, because it's your own write, but
   * `status` stays `'error'`. A resolve that comes later from your `customSendMessage` is ignored.
   * Queued messages still go out. It fires no `stopStreaming` event and adds no "Request canceled"
   * message.
   *
   * **What the prebuilt chat shows:** each response still streaming keeps its content and shows an
   * inline error. A turn with no response marks the sent message as failed, as a failed send does.
   * Screen readers hear the same announcement as for a send that fails.
   *
   * It doesn't call {@link ChatSDKConfig.onError}, because you made the call. Calling it again on
   * the failed turn replaces `state.get().error` without announcing again. The next send, a restart,
   * or {@link ChatSDKInstanceMessaging.clearError} clears the error.
   *
   * Resolves once the abort is delivered and the state is updated. Rejects when `messageID` names no
   * message, or a turn other than the active or last one, or when the conversation has no turn.
   *
   * @param options The turn to fail, and the error to show in `state.get().error`.
   *
   * @example Fail the turn when your stream breaks
   * ```ts
   * stream.on("error", (error) => {
   *   instance.messaging.failTurn({
   *     error: { message: "The response stream closed early.", otherData: error },
   *   });
   * });
   * ```
   */
  failTurn: (options?: FailTurnOptions) => Promise<void>;

  /**
   * Clears the error behind `status: 'error'`. `state.get().status` goes back to what the
   * conversation is doing, and `state.get().error` becomes `null`. The failed turn stays in the
   * conversation, with its failure marks.
   *
   * It clears an error the chat found, too, such as a failed send. It does nothing when there's no
   * error. It never closes the prebuilt chat's error panel for a catastrophic error.
   *
   * @example Let the user dismiss the error
   * ```ts
   * dismissButton.addEventListener("click", () => {
   *   instance.messaging.clearError();
   * });
   * ```
   */
  clearError: () => void;

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
   * Removes the messages with the given IDs from the conversation.
   */
  removeMessages: (messageIDs: string[]) => Promise<void>;

  /**
   * Clears the current conversation without starting a new one, so no welcome message or history is
   * loaded.
   */
  clearConversation: () => Promise<void>;

  /**
   * Inserts the given messages into the conversation as history. Fires the `history:begin` and
   * `history:end` events.
   */
  insertHistory: (messages: HistoryItem[]) => Promise<void>;

  /**
   * Restarts the conversation with the assistant. Clears the current assistant messages, cancels any
   * outstanding messages, and clears the assistant session, so the next message starts a new one. A
   * conversation with a human agent is unchanged.
   */
  restartConversation: () => Promise<void>;
}

/**
 * Options for {@link ChatSDKInstanceMessaging.failTurn}.
 *
 * @category Messaging
 * @category SDK
 */
export interface FailTurnOptions {
  /**
   * The turn to fail: its request's ID, or the ID of any of its responses. Leave it out to fail
   * the active turn, else the last one.
   */
  messageID?: string;

  /**
   * What `state.get().error` shows. Its `errorType` is always
   * {@link OnErrorType.MESSAGE_COMMUNICATION}, and its `messageID` is the turn's request ID.
   */
  error?: {
    /** Shown as `state.get().error.message`. Defaults to a general message. */
    message?: string;
    /** Shown as `state.get().error.otherData`, by reference, so it can be a live `Error`. */
    otherData?: unknown;
  };
}

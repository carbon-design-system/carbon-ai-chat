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
   * Inserts or updates a single message identified by `messageID`. The `updater` receives
   * the {@link MessageResponse} currently stored under `messageID` (or `undefined` when no
   * message with that ID exists) and returns the message that should replace it.
   *
   * This is the recommended way to add messages for new work, especially more complex UI. One
   * method covers inserting, streaming, correcting, and regenerating a message.
   * {@link ChatInstanceMessaging.addMessage} and {@link ChatInstanceMessaging.addMessageChunk}
   * remain fully supported as the legacy flow, and there are no plans to remove them. Nothing
   * stops you from mixing the two flows, but it isn't recommended or fully tested.
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
   * After the user stops a request, a STREAMING upsert of its response still updates the
   * message, but the stop button doesn't show again.
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
   * @throws `TypeError` when `messageID` is the ID of a request, or when the updater
   *   returns `null`/`undefined`, a message whose `id` differs from `messageID`, or a
   *   non-assistant message (a request or a human-agent message). These cases reject
   *   before any event fires, and store nothing. A {@link BusEventType.PRE_RECEIVE}
   *   handler that changes the message's `id` also rejects the call with a `TypeError`,
   *   and the message isn't stored.
   * @remarks A STREAMING sequence whose host simply stops calling `upsertMessage` without
   *   sending a terminal COMPLETE or ERROR write will leave `streamingState.isDone` as
   *   `false` indefinitely. The host is responsible for sending a terminal write, or for
   *   calling `cancelCurrentMessageRequest` (or restarting the conversation) to settle it.
   *
   * @example Insert a complete message
   * ```ts
   * await instance.messaging.upsertMessage('welcome', MessageState.COMPLETE, () => ({
   *   id: 'welcome',
   *   output: {
   *     generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Hi! How can I help?' }],
   *   },
   * }));
   * // The message shows, and the chat fires pre:receive and receive once.
   * ```
   *
   * @example Stream a reply, then complete it
   * ```ts
   * // Inside customSendMessage(request, options, instance).
   * // streamAnswer stands in for your own async iterable of text pieces.
   * const messageID = `${request.id}-reply`;
   * const toMessage = (text: string): MessageResponse => ({
   *   id: messageID,
   *   request_id: request.id,
   *   output: {
   *     generic: [
   *       { response_type: MessageResponseTypes.TEXT, text, streaming_metadata: { id: 'answer' } },
   *     ],
   *   },
   * });
   *
   * let text = '';
   * for await (const piece of streamAnswer(request)) {
   *   text += piece;
   *   await instance.messaging.upsertMessage(messageID, MessageState.STREAMING, () => toMessage(text));
   * }
   * await instance.messaging.upsertMessage(messageID, MessageState.COMPLETE, () => toMessage(text));
   * // receive fires once, on the final call.
   * ```
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
   * `history:end` events. These messages fire no `pre:receive` or `receive` events.
   */
  insertHistory: (messages: HistoryItem[]) => Promise<void>;

  /**
   * Restarts the conversation with the assistant. Clears the current assistant messages, cancels any
   * outstanding messages, and clears the assistant session, so the next message starts a new one. A
   * conversation with a human agent is unchanged.
   *
   * In a prebuilt chat, if the main window is open and {@link ChatSDKConfigMessaging.skipWelcome}
   * is not set, the chat sends a new welcome request. The promise resolves after
   * {@link ChatSDKConfigMessaging.customSendMessage} finishes with that request. It sends no welcome
   * request when {@link HomeScreenConfig.isOn} is set, or when the user has a conversation with a human
   * agent, now or earlier in the session.
   */
  restartConversation: () => Promise<void>;
}

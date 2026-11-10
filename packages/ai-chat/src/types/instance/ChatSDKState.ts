/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { PersistedHumanAgentState } from '../state/PersistedHumanAgentState';
import type { Message, StructuredData } from '../messaging/Messages';
import type { ChatSDKErrorData } from '../config/ChatSDKErrorData';

/**
 * The current phase of conversation work, exposed as `status` on {@link PublicChatState}.
 *
 * - `loading`: history and the welcome are loading.
 * - `submitted`: a send is waiting for its first associated response.
 * - `streaming`: a response is active, or its sender is still pending after a response arrives.
 *   This includes the gap after the response completes and before the sender settles.
 * - `ready`: no send or response remains active.
 * - `error`: the conversation is in a failure state.
 *
 * Failure takes precedence over loading, and loading takes precedence over turn activity.
 * The failure behind `error` is in {@link ChatSDKState.error}. An error status does not
 * guarantee a {@link PublicConfig.onError} call.
 *
 * @category Instance
 * @category SDK
 */
export type ConversationStatus =
  'ready' | 'loading' | 'submitted' | 'streaming' | 'error';

/**
 * A file on its way into the next message.
 *
 * @category SDK
 */
export interface ChatSDKPendingUpload {
  /** Made by the chat. {@link ChatSDKInstanceMessaging.addFile} resolves with it, and `removeFile` takes it. */
  readonly id: string;

  /** The file that was added. */
  readonly file: File;

  /** Whether the file is still uploading, finished, or failed. */
  readonly status: 'uploading' | 'complete' | 'error';

  /** What your `onFileUpload` returned, once it resolved. */
  readonly contributedData?: StructuredData;

  /** The message your `onFileUpload` threw, when `status` is `'error'`. */
  readonly errorMessage?: string;
}

/**
 * Current connection state of the human agent experience.
 *
 * @category Instance
 * @category SDK
 */
export type PublicChatHumanAgentState = Readonly<
  PersistedHumanAgentState & {
    /** Indicates if Carbon AI Chat is attempting to connect to an agent. */
    isConnecting: boolean;
  }
>;

/**
 * The state a conversation has with no interface: its messages, how the current turn is going,
 * and the human agent connection. {@link PublicChatState} extends it with the state the prebuilt
 * chat keeps for its views, input, and panels.
 *
 * Read it through {@link ChatSDKInstance.state}. A `createChatSDK` function that starts a
 * conversation with no interface arrives with the `@carbon/ai-chat/sdk` entry point in a 2.x minor release.
 *
 * @category SDK
 */
export interface ChatSDKState {
  /**
   * Conversation messages, oldest first, or `[]` when empty. Partial
   * streaming content is included as it arrives. The array and its message
   * values are immutable snapshots, and internal UI state is omitted.
   */
  readonly messages: readonly Readonly<Message>[];

  /** The current conversation phase. See {@link ConversationStatus} for each value and its precedence. */
  readonly status: ConversationStatus;

  /**
   * The failure behind a `status` of `error`, or `null` when there is none. It's set and cleared
   * together with `status`. A send that fails or times out, a failed history load, a streamed
   * response the chat can't process, or {@link ChatSDKInstanceMessaging.failTurn} sets it. The next
   * send, a restart, a history load, or {@link ChatSDKInstanceMessaging.clearError} clears it, and
   * so does a human agent's send that the service desk confirms late.
   *
   * It has the same fields as the object {@link PublicConfig.onError} gets for that failure,
   * with `messageID` naming the failed request when the error belongs to a turn. A failure the
   * chat doesn't report to `onError`, such as a human agent's send timing out or a turn you fail
   * with `failTurn`, still sets it.
   * The object is frozen, but `otherData` keeps its reference, so it can be a live `Error`.
   *
   * Optional in 1.x so that objects typed as this state still compile; the chat always sets it.
   */
  readonly error?: Readonly<ChatSDKErrorData> | null;

  /**
   * Files attached to the next message, in the order they were added. Each entry shows its upload
   * status. {@link ChatSDKInstanceMessaging.addFile} adds one, and
   * {@link ChatSDKInstanceMessaging.removeFile} takes one out. The next send carries them, then the
   * list empties. During a human agent conversation it lists the files for the service desk, which
   * transfers them when the message is sent; until then they show as `'complete'`.
   *
   * Optional in 1.x so that objects typed as this state still compile; the chat always sets it.
   */
  readonly pendingUploads?: readonly ChatSDKPendingUpload[];

  /**
   * `true` while any file in `pendingUploads` is still uploading.
   * {@link ChatSDKInstanceMessaging.send} rejects while it's `true`.
   *
   * Optional in 1.x so that objects typed as this state still compile; the chat always sets it.
   */
  readonly hasInFlightUploads?: boolean;

  /**
   * Current human agent state.
   */
  readonly humanAgent: PublicChatHumanAgentState;

  /**
   * The message id of the currently active response. The "active response" is the latest response that has been
   * received or is expected. For instance, if you send another message the current activeResponseId will be set to
   * null until you get a new response back. This is meant to be used to disable any user inputs in a user_defined
   * response that you don't want active if its not a message you should be receiving inputs from.
   */
  readonly activeResponseId: string | null;
}

/**
 * Reads and observes immutable state snapshots of a conversation. `S` is the state there is to read:
 * {@link ChatSDKInstance} reads {@link ChatSDKState}, and {@link ChatInstance} reads the wider
 * {@link PublicChatState}.
 *
 * A `createChatSDK` function that starts a conversation with no interface arrives with the
 * `@carbon/ai-chat/sdk` entry point in a 2.x minor release.
 *
 * @typeParam S The state snapshot this reads.
 * @category SDK
 */
export interface ChatSDKStateAccess<S extends ChatSDKState = ChatSDKState> {
  /**
   * Returns the current snapshot. The same object is returned until public state changes.
   *
   * @example Read the current messages
   * ```ts
   * const messages = instance.state.get().messages;
   * console.log(messages); // => the current public message list
   * ```
   */
  get(): S;

  /**
   * Calls a listener after public state changes. The returned function stops this subscription.
   *
   * @example Subscribe to state changes
   * ```ts
   * const unsubscribe = instance.state.subscribe(() => {
   *   console.log(instance.state.get().status);
   * });
   *
   * unsubscribe();
   * ```
   */
  subscribe(listener: () => void): () => void;

  /**
   * Calls a listener when the selected value changes. The comparison uses `Object.is` by default.
   * The listener is not called with the current value; read it with `state.get()`.
   *
   * @typeParam Selected The selected value.
   * @param selector Selects a value from the current public state.
   * @param listener Receives each changed selected value.
   * @param options Options for comparing selected values.
   * @param options.isEqual Returns `true` when two selected values are equal.
   * @returns A function that stops this selection.
   *
   * @example Observe the conversation status
   * ```ts
   * const unsubscribe = instance.state.select(
   *   (state) => state.status,
   *   (status) => console.log(status),
   * );
   *
   * unsubscribe();
   * ```
   */
  select<Selected>(
    selector: (state: S) => Selected,
    listener: (value: Selected) => void,
    options?: {
      /** Returns `true` when two selected values are equal. */
      isEqual?: (left: Selected, right: Selected) => boolean;
    }
  ): () => void;
}

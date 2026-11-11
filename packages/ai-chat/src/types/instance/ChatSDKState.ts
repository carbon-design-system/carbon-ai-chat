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
import type { AgentAvailability } from '../config/ServiceDeskConfig';

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

  /**
   * Why the file failed, when `status` is `'error'`: the message your `onFileUpload` threw, or, for
   * a file staged for a service desk, the message the desk reported.
   */
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

    /**
     * `true` from the moment the user accepts a service desk's request to share their screen until
     * the share ends: the service desk ends it, the user clicks the prebuilt chat's "stop sharing"
     * button, you call {@link ChatInstanceServiceDeskActions.stopScreenShare}, or the conversation
     * with the agent ends. It's never saved, so a reload starts it as `false`. A chat that was
     * removed keeps its last state, so it can still read `true`.
     *
     * Optional in 1.x so that objects typed as this state still compile; the chat always sets it.
     */
    isScreenSharing?: boolean;

    /**
     * `true` while the chat reconnects to an agent conversation saved from an earlier page load.
     * It ends once the service desk reconnects, or the reconnect fails.
     *
     * Optional in 1.x so that objects typed as this state still compile; the chat always sets it.
     */
    isReconnecting?: boolean;

    /**
     * `true` while the service desk reports that the agent is typing.
     *
     * Optional in 1.x so that objects typed as this state still compile; the chat always sets it.
     */
    isTyping?: boolean;

    /**
     * What the service desk last reported about the wait for an agent, such as a position in the
     * queue, or `null` when it hasn't reported any. The chat shows it while it connects.
     *
     * Optional in 1.x so that objects typed as this state still compile; the chat always sets it.
     */
    availability?: AgentAvailability | null;

    /**
     * `true` while files sent to the agent are still uploading to the service desk.
     *
     * Optional in 1.x so that objects typed as this state still compile; the chat always sets it.
     */
    isUploadingFile?: boolean;
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
   * transfers them when the message is sent; until then they show as `'complete'`. A restart keeps
   * them, as it keeps the prebuilt input's attachments.
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
   * `true` while {@link ChatSDKInstanceMessaging.restartConversation} clears the conversation, from
   * when the restart begins until it's done. It stays `false` when a
   * {@link BusEventType.PRE_RESTART_CONVERSATION} handler cancels the restart.
   *
   * Optional in 1.x so that objects typed as this state still compile; the chat always sets it.
   */
  readonly isRestarting?: boolean;

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

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  CancellationReason,
  MessageState,
  UpsertMessageUpdater,
} from '../../types/config/MessagingConfig';
import {
  GenericItem,
  Message,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  PauseItem,
  TextItem,
} from '../../types/messaging/Messages';
import {
  BusEventPreReceive,
  BusEventReceive,
  BusEventType,
} from '../../types/events/eventBusTypes';
import { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import { OnErrorType } from '../../types/config/ErrorConfig';
import isEqual from 'lodash-es/isEqual.js';
import cloneDeep from 'lodash-es/cloneDeep.js';
import actions from '../store/actions';
import type {
  MessageWriteOptions,
  ReceivedLocalItems,
} from '../store/messageWriteTypes';
import {
  createLocalMessageItemsForNestedMessageItems,
  findDrawIssues,
  outputItemToLocalItem,
} from '../schema/outputItemToLocalItem';
import {
  addDefaultsToMessage,
  isConnectToHumanAgent,
  isHiddenOutputItem,
  isPause,
  isItemStillStreaming,
  isRequest,
  streamItemID,
} from '../utils/messageUtils';
import { deepFreeze } from '../utils/lang/objectUtils';
import { consoleError } from '../utils/miscUtils';
import { hasDisplayableContentForItem } from '../utils/streamingUtils';
import { ServiceManager } from './ServiceManager';

/**
 * Whether an upserted item counts as content for the stream-start announcement. A text
 * item whose `text` isn't a string doesn't, and checking it would throw trimming it.
 */
function isAnnounceableContent(item: GenericItem): boolean {
  if (
    item.response_type === MessageResponseTypes.TEXT &&
    typeof (item as TextItem).text !== 'string'
  ) {
    return false;
  }
  return hasDisplayableContentForItem(item, item.response_type);
}

const VALID_STATES = new Set<MessageState>([
  MessageState.STREAMING,
  MessageState.COMPLETE,
  MessageState.ERROR,
]);

/**
 * One item of an upserted message, paired with the local item the reducer shows for it.
 */
interface FanOutEntry {
  index: number;
  item: GenericItem;
  isHidden: boolean;
  /** Undefined for a hidden item, which has no local item of its own. */
  shownLocalItem: LocalMessageItem | undefined;
}

/**
 * What a fan-out compares against to skip items that did not change.
 */
interface SkipsUnchanged {
  refsBefore: Map<string, LocalMessageItem>;
  previousItems: GenericItem[];
}

const noop = () => {
  /* intentionally empty */
};

/**
 * Engine behind {@link ChatInstanceMessaging#upsertMessage}. `MessageService` owns the
 * send / stream / receive arc; this coordinator's job is narrower:
 *
 * - Serialize concurrent `upsertMessage` calls for the same message ID so the reducer
 *   sees them in caller order. Different IDs run in parallel by construction.
 * - Track the most recent {@link MessageState} for each message ID. `addMessage` and
 *   `addMessageChunk` call {@link markComplete} / {@link markStreaming} so that mixing
 *   those APIs with `upsertMessage` does not double-fire `pre:receive` / `receive`.
 * - Track which message IDs are currently mid-stream, so the stop streaming button
 *   survives one concurrent stream finishing while another is still running.
 */
interface UpsertStamp {
  generation: number;
  restartCount: number;
  isCurrent: () => boolean;
}

class MessageUpsertCoordinator {
  private readonly serviceManager: ServiceManager;

  private readonly chainByID = new Map<string, Promise<void>>();

  private generation = 0;

  /**
   * Receive-dedup record, **not** a liveness record. `addMessage` and `addMessageChunk`
   * write it too, it deliberately retains {@link MessageState.COMPLETE} for the life of
   * the session, and nothing drains it when a stream is canceled. Use
   * {@link streamingIDs} to ask whether a message is still streaming.
   */
  private readonly stateByID = new Map<string, MessageState>();

  /**
   * IDs currently mid-stream via `upsertMessage`. Written only by {@link runOne}, which
   * adds on {@link MessageState.STREAMING} and removes on {@link MessageState.COMPLETE} /
   * {@link MessageState.ERROR}, so the two operations stay symmetric and the set cannot
   * leak the way {@link stateByID} does.
   */
  private readonly streamingIDs = new Set<string>();

  private readonly streamingControllers = new Map<string, AbortController>();

  /**
   * How many of each message's `pause` items have run, counted in `output.generic`
   * order, so a later upsert of the same message never runs one again. `Infinity` when
   * `addMessage` or history delivered the message, since they run its pauses themselves.
   */
  private readonly pausesRunByID = new Map<string, number>();

  private readonly pendingWrites = new Map<
    string,
    { valid: boolean; count: number }
  >();

  trackWrite(messageID: string) {
    const entry = this.pendingWrites.get(messageID) ?? {
      valid: true,
      count: 0,
    };
    entry.count++;
    this.pendingWrites.set(messageID, entry);
    const generation = this.generation;
    const restartCount = this.serviceManager.restartCount;
    let released = false;
    return {
      isCurrent: () =>
        entry.valid &&
        generation === this.generation &&
        restartCount === this.serviceManager.restartCount,
      release: () => {
        if (released) {
          return;
        }
        released = true;
        entry.count--;
        if (!entry.count && this.pendingWrites.get(messageID) === entry) {
          this.pendingWrites.delete(messageID);
        }
      },
    };
  }

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Records that the message with the given ID has reached
   * {@link MessageState.COMPLETE}. Safe to call repeatedly.
   */
  markComplete(messageID: string | undefined) {
    if (messageID) {
      this.serviceManager.messageService.clearStreamingCancellation(messageID);
      this.stateByID.set(messageID, MessageState.COMPLETE);
      this.streamingControllers.delete(messageID);
      // `addMessage` and history already ran, or are running, this message's pauses, so
      // a later upsert of it must not run them again. Always overwrite, even when upsert
      // has already advanced the cursor: a finite count would let a subsequent upsert
      // replay pauses from the wrong index.
      this.pausesRunByID.set(messageID, Infinity);
      // If a streaming upsert was in progress for this id, `addMessage` delivering the
      // same id closes the stream. Without this, the stop button would stay up with
      // nothing left to take it down.
      if (this.streamingIDs.delete(messageID)) {
        this.serviceManager.conversationLifecycleService.responseFinished(
          messageID
        );
        this.serviceManager.messageService.hideStopStreamingButtonIfIdle();
      }
    }
  }

  /**
   * Records that the message with the given ID is mid-stream
   * ({@link MessageState.STREAMING}). Safe to call repeatedly.
   */
  markStreaming(messageID: string | undefined) {
    if (messageID) {
      this.stateByID.set(messageID, MessageState.STREAMING);
    }
  }

  /**
   * Returns the most recent recorded {@link MessageState} for the given ID, or
   * `undefined` when no state has been recorded.
   */
  getState(messageID: string): MessageState | undefined {
    return this.stateByID.get(messageID);
  }

  /**
   * Returns true when any message is currently mid-stream via `upsertMessage`.
   */
  hasStreamingMessages(): boolean {
    return this.streamingIDs.size > 0;
  }

  /**
   * Settles every message still registered as mid-stream and drops the registrations.
   *
   * A canceled `upsertMessage` stream has no terminal upsert to settle it — the host is
   * told to stop and simply stops calling. Nothing else drains {@link streamingIDs}, so
   * without this the stop streaming button stays visible and the items keep rendering
   * mid-stream for the rest of the session.
   *
   * Cancellation settles every registered ID. Only ownerless streams can register
   * again on a later write; a stopped request can still update its content.
   */
  endAllStreaming(reason: string = CancellationReason.STOP_STREAMING): boolean {
    const controllers = new Set(this.streamingControllers.values());
    const settledAny = this.streamingIDs.size > 0;
    const lifecycle = this.serviceManager.conversationLifecycleService;
    for (const messageID of this.streamingIDs) {
      const requestID = lifecycle.responseRequestID(messageID);
      if (requestID) {
        lifecycle.requestStopped(requestID);
      }
      this.endStreamingMessage(messageID);
    }
    for (const controller of controllers) {
      controller.abort(reason);
    }
    return settledAny;
  }

  endStreamingForRequest(requestID: string, generation?: number) {
    const responseIDs =
      this.serviceManager.conversationLifecycleService.requestStopped(
        requestID,
        generation
      ) ?? [];
    let settledAny = false;
    for (const messageID of responseIDs) {
      this.endStreamingMessage(messageID);
      this.serviceManager.messageService.inboundStreaming.clearStreamingResponse(
        messageID
      );
      settledAny = true;
    }
    if (settledAny) {
      this.serviceManager.messageService.hideStopStreamingButtonIfNoUpsertStreaming();
    }
  }

  endStreamingMessage(messageID: string, generation?: number) {
    this.streamingIDs.delete(messageID);
    this.streamingControllers.delete(messageID);
    this.serviceManager.conversationLifecycleService.responseFinished(
      messageID,
      generation
    );
    this.serviceManager.messageService.clearStreamingCancellation(messageID);
    const refsBefore = this.snapshotLocalItemRefs(messageID);
    this.serviceManager.store.dispatch(actions.endMessageStreaming(messageID));
    this.reportUndrawableItems(messageID, refsBefore, false);
  }

  /**
   * Drops the in-flight promise chain, the recorded state, any streaming registration,
   * the pause record, and any reveal under way for a single message ID. Called from
   * `removeMessages`.
   */
  clear(messageID: string) {
    const pending = this.pendingWrites.get(messageID);
    if (pending) {
      pending.valid = false;
      this.pendingWrites.delete(messageID);
    }
    this.serviceManager.messageService.clearStreamingCancellation(messageID);
    const wasStreaming = this.streamingIDs.has(messageID);
    this.stateByID.delete(messageID);
    this.chainByID.delete(messageID);
    this.streamingIDs.delete(messageID);
    this.streamingControllers.delete(messageID);
    this.serviceManager.conversationLifecycleService.responseFinished(
      messageID
    );
    this.pausesRunByID.delete(messageID);
    if (wasStreaming) {
      this.serviceManager.messageService.hideStopStreamingButtonIfIdle();
    }
  }

  /**
   * Drops every entry from every collection. Called from `restartConversation` and
   * from {@link ChatInstance.destroySession} so a reset chat does not carry stale state
   * into a fresh session.
   */
  clearAll() {
    const controllers = new Set(this.streamingControllers.values());
    for (const controller of controllers) {
      controller.abort(CancellationReason.CONVERSATION_RESTARTED);
    }
    this.serviceManager.messageService.clearAllStreamingCancellation();
    this.generation++;
    this.chainByID.clear();
    this.stateByID.clear();
    for (const messageID of this.streamingIDs) {
      this.serviceManager.conversationLifecycleService.responseFinished(
        messageID
      );
    }
    this.streamingIDs.clear();
    this.streamingControllers.clear();
    this.pausesRunByID.clear();
    this.pendingWrites.clear();
  }

  /**
   * Entry point for `instance.messaging.upsertMessage`. See {@link UpsertMessageUpdater}
   * for the updater contract. The chat's own callers pass `options` to say which
   * public method the write comes from; the public `upsertMessage` never does.
   */
  async upsert(
    messageID: string,
    nextState: MessageState,
    updater: UpsertMessageUpdater,
    options: MessageWriteOptions = {}
  ): Promise<void> {
    if (typeof messageID !== 'string' || messageID.length === 0) {
      throw new TypeError(
        'upsertMessage: messageID must be a non-empty string.'
      );
    }
    if (!VALID_STATES.has(nextState)) {
      throw new TypeError(
        `upsertMessage: state must be a MessageState value, received ${String(
          nextState
        )}.`
      );
    }
    if (typeof updater !== 'function') {
      throw new TypeError('upsertMessage: updater must be a function.');
    }

    const write = this.trackWrite(messageID);
    const stamp = this.takeStamp(
      () => write.isCurrent() && (options.isCurrent?.() ?? true)
    );
    try {
      if (this.isStale(stamp)) {
        return;
      }
      // Received writes retain their independent reveal and event timing.
      if (
        options.origin === 'addMessage' ||
        (options.origin === 'chunk' && nextState !== MessageState.STREAMING)
      ) {
        return await this.runReceivedWrite(messageID, updater, options, stamp);
      }
      if (options.origin === 'chunk') {
        return await this.enqueue(messageID, () =>
          this.runChunkWrite(messageID, updater, options, stamp)
        );
      }
      const requestID = this.serviceManager.messageService.currentRequestID;
      return await this.enqueue(messageID, () =>
        this.runOne(messageID, nextState, updater, options, stamp, requestID)
      );
    } finally {
      write.release();
    }
  }

  /**
   * Appends `worker` to the per-id promise chain for `messageID` and returns the
   * resulting promise. A predecessor failure for this id does not poison the new entry.
   * The chain entry is cleaned up once `worker` settles.
   */
  private enqueue(
    messageID: string,
    worker: () => Promise<void>
  ): Promise<void> {
    const generation = this.generation;
    const prev = this.chainByID.get(messageID) ?? Promise.resolve();
    const next = prev.catch(noop).then(() => {
      if (generation === this.generation) {
        return worker();
      }
      return undefined;
    });
    this.chainByID.set(messageID, next);
    // Detach a finalization handler that cleans up the chain entry. The trailing
    // `.then(noop, noop)` absorbs the rejection so it isn't reported as unhandled —
    // the original caller still sees the rejection via the returned `next`.
    next
      .finally(() => {
        if (this.chainByID.get(messageID) === next) {
          this.chainByID.delete(messageID);
        }
      })
      .then(noop, noop);
    return next;
  }

  private async runOne(
    messageID: string,
    nextState: MessageState,
    updater: UpsertMessageUpdater,
    options: MessageWriteOptions,
    stamp: UpsertStamp,
    requestID?: string
  ): Promise<void> {
    // A restart while the updater or `pre:receive` is pending must not write into the
    // new conversation, the same check `addMessage` makes.
    if (this.isStale(stamp)) {
      return;
    }
    const { restartCount: initialRestartCount } = stamp;

    // Fill in `history.timestamp`, `thread_id`, and `ui_state_internal` defaults the
    // way `addMessage` does. Without these, message components render-crash because
    // they read `message.history.timestamp` directly.
    const result = addDefaultsToMessage(
      await this.runUpdater(messageID, updater)
    );
    const isStale = () => this.isStale(stamp, result.request_id);
    if (isStale()) {
      return;
    }
    this.serviceManager.messageService.messageLoadingManager.end();
    if (isStale()) {
      return;
    }

    const { willFireReceive, settlesMessage } = transitionOf(
      this.stateByID.get(messageID),
      nextState
    );

    if (willFireReceive) {
      await this.firePreReceive(messageID, result, stamp);
      if (isStale()) {
        return;
      }
    }

    if (nextState === MessageState.COMPLETE && !options.isLatestWelcomeNode) {
      // Picks the returning-user home screen, as `addMessage` does — but not
      // for a welcome message, which should leave the home screen selector alone.
      this.serviceManager.store.dispatch(
        actions.updateHasSentNonWelcomeMessage(true)
      );
    }

    if (isStale()) {
      return;
    }
    const ownerRequestID = result.request_id ?? requestID;
    const isStopped =
      this.serviceManager.conversationLifecycleService.isRequestStopped(
        ownerRequestID
      );
    const refsBefore = this.snapshotLocalItemRefs(messageID);
    const previousMessage = this.serviceManager.store.getState()
      .allMessagesByID[messageID] as MessageResponse | undefined;
    const holdFromIndex = this.findPauseToRun(messageID, result);
    const previousState = this.serviceManager.store.getState();
    const originalLocalIDs =
      holdFromIndex === Infinity
        ? []
        : previousState.assistantMessageState.localMessageIDs.filter(
            (id) =>
              previousState.allMessageItemsByID[id]?.fullMessageID === messageID
          );
    this.serviceManager.store.dispatch(
      actions.upsertMessage(
        result,
        nextState === MessageState.STREAMING && !isStopped,
        holdFromIndex,
        options
      )
    );
    if (isStale()) {
      return;
    }
    const committedResult = this.serviceManager.store.getState()
      .allMessagesByID[messageID] as MessageResponse;
    this.reportUndrawableItems(
      messageID,
      refsBefore,
      !(isStopped && nextState === MessageState.STREAMING)
    );

    this.serviceManager.receiveService.retainAgentItemPositions(
      messageID,
      new Set(
        (committedResult.output?.generic ?? []).flatMap((item, index) =>
          isConnectToHumanAgent(item)
            ? [this.agentItemIdentity(committedResult, index)]
            : []
        )
      )
    );

    // Before the slot fan-out below: `serviceManager.fire` does not swallow listener
    // exceptions, so a throwing user-defined-response handler would skip everything
    // after `fanOutChangedSlots` — leaving the button up with nothing registered to
    // take it down.
    this.settleStreamingLiveness(
      messageID,
      nextState,
      committedResult,
      holdFromIndex,
      ownerRequestID
    );

    await this.fanOutChangedSlots(
      messageID,
      committedResult,
      isStopped && nextState === MessageState.STREAMING
        ? MessageState.COMPLETE
        : nextState,
      refsBefore,
      previousMessage,
      settlesMessage,
      0,
      holdFromIndex,
      stamp
    );
    if (isStale()) {
      return;
    }

    const revealed = await this.revealAfterPauses(
      messageID,
      committedResult,
      nextState,
      holdFromIndex,
      originalLocalIDs,
      initialRestartCount,
      stamp
    );
    if (!revealed || isStale()) {
      return;
    }

    if (nextState === MessageState.COMPLETE) {
      await this.handleNewConnectToAgentItems(
        messageID,
        committedResult,
        stamp
      );
      if (isStale()) {
        return;
      }
    }

    this.stateByID.set(messageID, nextState);

    if (willFireReceive) {
      await this.firePostReceiveAndFinalize(messageID, committedResult, stamp);
    } else if (nextState !== MessageState.STREAMING) {
      this.serviceManager.messageService.finalizeStreamingMessage(messageID);
    }
  }

  private takeStamp(isCurrent: () => boolean): UpsertStamp {
    return {
      generation: this.generation,
      restartCount: this.serviceManager.restartCount,
      isCurrent,
    };
  }

  private isStale(stamp: UpsertStamp, requestID?: string): boolean {
    return (
      !stamp.isCurrent() ||
      stamp.generation !== this.generation ||
      stamp.restartCount !== this.serviceManager.restartCount ||
      this.serviceManager.messageService.isRequestFromPreviousConversation(
        requestID
      )
    );
  }

  /**
   * Stores a streaming write from `addMessageChunk`. Until `final_response` the chunk path
   * keeps its own events, announcements, stop button, and send-queue hold, and records
   * its own receive state, so none of the upsert lifecycle runs here. The message is
   * stored as the updater returns it, without defaults, as the chunk path always has.
   */
  private async runChunkWrite(
    messageID: string,
    updater: UpsertMessageUpdater,
    options: MessageWriteOptions,
    stamp: UpsertStamp
  ): Promise<void> {
    if (this.isStale(stamp)) {
      return;
    }
    // This updater is the chat's immutable chunk merge, not a host callback.
    const result = await updater(this.getStoredResponse(messageID));
    if (!this.isStale(stamp, result.request_id)) {
      const isStopped =
        this.serviceManager.conversationLifecycleService.isRequestStopped(
          options.chunk?.requestID
        );
      this.serviceManager.store.dispatch(
        actions.upsertMessage(result, true, undefined, {
          ...options,
          chunk: { ...options.chunk, isStopped },
        })
      );
    }
  }

  /**
   * Stores a message from `addMessage`, or a chunk stream's `final_response`, the way
   * `addMessage` always has. `receive()` has already fired `pre:receive` and checked for a
   * restart.
   *
   * The message is stored first, with none of its items showing beyond the ones a stream
   * already shows. `receive` fires next, without waiting for the items, which then show
   * one at a time. A failure while storing the message is logged, and `receive` still
   * fires. The write never joins the per-id chain, so it runs beside any other write for
   * this id, and the write ends once `receive` has fired. A `receive` handler's error
   * rejects the write.
   */
  private async runReceivedWrite(
    messageID: string,
    updater: UpsertMessageUpdater,
    options: MessageWriteOptions,
    stamp: UpsertStamp
  ): Promise<void> {
    const initialRestartCount = options.restartCount ?? stamp.restartCount;
    const message = await updater(
      this.serviceManager.store.getState().allMessagesByID[
        messageID
      ] as MessageResponse
    );
    const isCurrent = () =>
      !this.isStale(stamp, message.request_id) &&
      initialRestartCount === this.serviceManager.restartCount;
    if (!isCurrent()) {
      return;
    }

    // Reveals outlive receive(), so they retain the same removal guard separately.
    const reveal = this.trackWrite(messageID);
    this.storeReceivedMessage(message, options, isCurrent, initialRestartCount)
      .catch((error) => {
        consoleError('Error processing the message response', error);
      })
      .finally(reveal.release);

    if (!isCurrent()) {
      return;
    }
    if (!options.isLatestWelcomeNode) {
      this.serviceManager.store.dispatch(
        actions.updateHasSentNonWelcomeMessage(true)
      );
    }
    if (!isCurrent()) {
      return;
    }
    deepFreeze(message);
    await this.serviceManager.fire(
      {
        type: BusEventType.RECEIVE,
        data: message,
      },
      isCurrent
    );
    if (isCurrent()) {
      this.markComplete(messageID);
    }
  }

  /**
   * Stores a message from `addMessage` or `final_response`, then shows its items. Only the
   * part before the first item's wait runs before `receive` fires.
   */
  private async storeReceivedMessage(
    message: MessageResponse,
    options: MessageWriteOptions,
    isCurrent: () => boolean,
    initialRestartCount: number
  ): Promise<void> {
    const { store, messageService } = this.serviceManager;

    message.request_id ??= options.requestMessage?.id;
    addDefaultsToMessage(message);
    const write = (received: ReceivedLocalItems) =>
      store.dispatch(
        actions.upsertMessage(message, false, undefined, {
          origin: options.origin,
          received,
        })
      );
    write({ nestedLocalItems: [] });

    // `showStopButtonImmediately` put the button up for the request; the response takes
    // it down unless something is still streaming.
    if (
      store.getState().config.public.messaging?.showStopButtonImmediately &&
      !messageService.inboundStreaming.streamingMessageID
    ) {
      messageService.hideStopStreamingButtonIfNoUpsertStreaming();
    }

    await this.showReceivedItems(
      message,
      options.isLatestWelcomeNode,
      write,
      isCurrent,
      initialRestartCount
    );
  }

  /**
   * Shows the items of a message from `addMessage` or `final_response` one at a time, in
   * `output.generic` order. A pause waits, with the typing indicator up when it asks for
   * one. A `connect_to_agent` item checks agent availability first, including a hidden
   * one. Every other item fires its `userDefinedResponse` and footer events, then shows,
   * unless it is hidden. Once `isCurrent` turns false, nothing more shows.
   */
  private async showReceivedItems(
    message: MessageResponse,
    isLatestWelcomeNode: boolean,
    write: (received: ReceivedLocalItems) => void,
    isCurrent: () => boolean,
    initialRestartCount: number
  ): Promise<void> {
    const { store, actions: chatActions } = this.serviceManager;
    const generic = message.output.generic;
    let addAfterID: string;

    for (let index = 0; index < generic.length && isCurrent(); index++) {
      const item = generic[index];
      if (!item) {
        continue;
      }
      const localItem = outputItemToLocalItem(
        item,
        message,
        isLatestWelcomeNode
      );
      const nestedLocalItems: LocalMessageItem[] = [];
      createLocalMessageItemsForNestedMessageItems(
        localItem,
        message,
        false,
        nestedLocalItems,
        true
      );
      const nestedLocalItemsByID = Object.fromEntries(
        nestedLocalItems.map((nested) => [nested.ui_state.id, nested])
      );
      if (isConnectToHumanAgent(item)) {
        // Mark the item handled before the async availability check, so a later
        // native upsertMessage COMPLETE write doesn't re-run the check for the same item.
        store.dispatch(
          actions.setMessageUIProperty(
            localItem.ui_state.id,
            'connectToAgentHandled',
            true
          )
        );
        await this.serviceManager.receiveService.handleConnectToHumanAgent(
          localItem,
          message,
          isCurrent,
          {
            identity: this.agentItemIdentity(message, index),
            deduplicateByLocalID: true,
          }
        );
      }
      if (isPause(item)) {
        await this.serviceManager.chunkProcessingService.waitForPause(
          item as PauseItem,
          initialRestartCount
        );
        continue;
      }
      if (!isCurrent()) {
        return;
      }
      await chatActions.handleUserDefinedResponseItems(
        localItem,
        message,
        MessageState.COMPLETE,
        nestedLocalItemsByID,
        isCurrent
      );
      if (!isCurrent()) {
        return;
      }
      await chatActions.handleCustomFooterSlot(localItem, message, isCurrent);
      if (!isHiddenOutputItem(message, item) && isCurrent()) {
        write({
          localItem,
          nestedLocalItems,
          addAfterID,
        });
        addAfterID = localItem.ui_state.id;
      }
    }
  }

  /**
   * Returns the index in `output.generic` of the first `pause` item of the message that
   * has not run yet, or `Infinity` when there is none. Items from there on are held back.
   */
  private findPauseToRun(messageID: string, result: MessageResponse): number {
    const pausesRun = this.pausesRunByID.get(messageID) ?? 0;
    let pausesSeen = 0;
    for (const [index, item] of (result.output?.generic ?? []).entries()) {
      if (item && isPause(item)) {
        if (pausesSeen === pausesRun) {
          return index;
        }
        pausesSeen++;
      }
    }
    return Infinity;
  }

  /**
   * Reveals the items held back behind `pause` items, the way `addMessage` does: waits
   * out each pause, with the typing indicator up when it asks for one, then shows and
   * fans out the items up to the next pause. Returns false when a restart or removal
   * during a pause, or a restart during a fan-out, means the write should go no further.
   */
  private async revealAfterPauses(
    messageID: string,
    result: MessageResponse,
    nextState: MessageState,
    holdFromIndex: number,
    originalLocalIDs: string[],
    initialRestartCount: number,
    stamp: UpsertStamp
  ): Promise<boolean> {
    const { store } = this.serviceManager;
    const generic = result.output?.generic ?? [];
    let pauseIndex = holdFromIndex;

    while (pauseIndex < generic.length) {
      await this.serviceManager.chunkProcessingService.waitForPause(
        generic[pauseIndex] as PauseItem,
        initialRestartCount
      );
      if (
        this.isStale(stamp, result.request_id) ||
        !store.getState().allMessagesByID[messageID]
      ) {
        return false;
      }
      this.pausesRunByID.set(
        messageID,
        (this.pausesRunByID.get(messageID) ?? 0) + 1
      );

      // A stop pressed during the pause settled the stream, so the reveal must not put
      // the items back mid-stream.
      const isStreaming =
        nextState === MessageState.STREAMING &&
        this.streamingIDs.has(messageID);
      const revealState =
        nextState === MessageState.STREAMING && !isStreaming
          ? MessageState.COMPLETE
          : nextState;
      const revealFromIndex = pauseIndex + 1;
      const previousHoldFromIndex = pauseIndex;
      pauseIndex = this.findPauseToRun(messageID, result);
      const refsBefore = this.snapshotLocalItemRefs(messageID);
      store.dispatch(
        actions.upsertMessage(result, isStreaming, pauseIndex, {
          pauseReveal: { originalLocalIDs, previousHoldFromIndex },
        })
      );
      if (this.isStale(stamp, result.request_id)) {
        return false;
      }
      this.reportUndrawableItems(messageID, refsBefore);
      if (isStreaming) {
        this.announceStreamStarts(result, pauseIndex);
      }
      await this.fanOutChangedSlots(
        messageID,
        result,
        revealState,
        refsBefore,
        // firesEveryItem=true means previousMessage is unused; pass undefined
        // so a future caller can't accidentally copy this self-reference and
        // get silent event suppression.
        undefined,
        true,
        revealFromIndex,
        pauseIndex,
        stamp
      );
      if (this.isStale(stamp, result.request_id)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Runs the `connect_to_agent` handling `addMessage` gives, once per item: the first
   * time the item completes, including hidden items. The item is marked
   * before the availability check starts, so a later upsert never repeats it. The check
   * uses the write's lifetime guard so removal or restart drops its result.
   */
  private async handleNewConnectToAgentItems(
    messageID: string,
    result: MessageResponse,
    stamp: UpsertStamp
  ): Promise<void> {
    const { store } = this.serviceManager;
    for (const entry of this.fanOutEntries(messageID, result, Infinity)) {
      if (this.isStale(stamp, result.request_id)) {
        return;
      }
      if (!isConnectToHumanAgent(entry.item)) {
        continue;
      }
      if (entry.shownLocalItem?.ui_state.connectToAgentHandled) {
        continue;
      }
      const item = this.localItemToFanOut(messageID, result, entry, undefined);
      if (!item) {
        continue;
      }
      store.dispatch(
        actions.setMessageUIProperty(
          item.ui_state.id,
          'connectToAgentHandled',
          true
        )
      );
      await this.serviceManager.receiveService.handleConnectToHumanAgent(
        item,
        result,
        () => !this.isStale(stamp, result.request_id),
        { identity: this.agentItemIdentity(result, entry.index) }
      );
    }
  }

  private agentItemIdentity(message: MessageResponse, index: number): string {
    const item = message.output.generic[index];
    const position = message.output.generic
      .slice(0, index)
      .filter((previous) => previous && !isPause(previous)).length;
    const streamID = streamItemID(message.id, item);
    return streamID ? `stream:${streamID}` : `position:${position}`;
  }

  /**
   * Records whether `messageID` is still streaming, then brings the stop button and the
   * stream-start announcements in line with that.
   */
  private settleStreamingLiveness(
    messageID: string,
    nextState: MessageState,
    result: MessageResponse,
    holdFromIndex: number,
    requestID?: string
  ) {
    const lifecycle = this.serviceManager.conversationLifecycleService;
    if (
      nextState === MessageState.STREAMING &&
      lifecycle.isRequestStopped(requestID)
    ) {
      this.endStreamingMessage(messageID);
      this.serviceManager.messageService.hideStopStreamingButtonIfIdle();
      return;
    }
    if (nextState === MessageState.STREAMING) {
      this.stateByID.set(messageID, nextState);
      if (!this.streamingIDs.has(messageID)) {
        const controller =
          this.serviceManager.messageService.getCurrentMessageController();
        if (controller) {
          this.streamingControllers.set(messageID, controller);
        }
      }
      this.streamingIDs.add(messageID);
      lifecycle.responseStreaming(messageID, undefined, requestID);
      this.syncStopStreamingButton(nextState, result, false);
      this.announceStreamStarts(result, holdFromIndex);
      return;
    }
    const wasStreaming = this.streamingIDs.delete(messageID);
    this.streamingControllers.delete(messageID);
    lifecycle.responseFinished(messageID);
    this.syncStopStreamingButton(nextState, result, wasStreaming);
  }

  private syncStopStreamingButton(
    nextState: MessageState,
    result: MessageResponse,
    wasStreaming: boolean
  ) {
    const { messageService } = this.serviceManager;

    if (nextState === MessageState.STREAMING) {
      const flags = (result.output?.generic ?? []).map(
        (item) => item?.streaming_metadata?.cancellable
      );
      if (flags.includes(false)) {
        messageService.updateStreamingCancellation(result.id, false);
      } else if (flags.includes(true)) {
        messageService.updateStreamingCancellation(result.id, true);
      }
      return;
    }

    messageService.clearStreamingCancellation(result.id);

    // COMPLETE and ERROR are both terminal for this message — but the affordance only
    // goes away once nothing else is streaming. `runOne` already dropped this message
    // from `streamingIDs` above, so the check below reads "is anything *else* live".
    // A message that never streamed leaves the button alone: it may be up for another
    // request (`showStopButtonImmediately`), and upserts never touched it before.
    if (wasStreaming) {
      this.serviceManager.messageService.hideStopStreamingButtonIfIdle();
    }
  }

  /**
   * Announces reasoning start and streaming start for a streaming message, once each,
   * the way `addMessageChunk` does. Only items that show count as content: not the ones
   * the reducer hides, not a pause, and not the ones held back from `holdFromIndex` on.
   */
  private announceStreamStarts(result: MessageResponse, holdFromIndex: number) {
    const { message_options: messageOptions } = result;
    this.serviceManager.actions.announceStreamStarts(result.id, {
      hasReasoning: Boolean(messageOptions?.reasoning),
      hasDisplayableContent: (result.output?.generic ?? []).some(
        (item, index) =>
          item &&
          index < holdFromIndex &&
          !isPause(item) &&
          !isHiddenOutputItem(result, item) &&
          isAnnounceableContent(item)
      ),
      responseUserProfile: messageOptions?.response_user_profile,
    });
  }

  private getStoredResponse(messageID: string): MessageResponse | undefined {
    const existing = this.serviceManager.store.getState().allMessagesByID[
      messageID
    ] as Message | undefined;

    if (existing && isRequest(existing as MessageRequest)) {
      throw new Error(
        `upsertMessage: messageID "${messageID}" refers to a non-assistant message and cannot be upserted.`
      );
    }

    return existing as MessageResponse | undefined;
  }

  /**
   * Gives the host a private copy and validates the returned response and ID.
   */
  private async runUpdater(
    messageID: string,
    updater: UpsertMessageUpdater
  ): Promise<MessageResponse> {
    const existing = this.getStoredResponse(messageID);

    const previousMessage = existing
      ? cloneDeep(existing as MessageResponse)
      : undefined;
    let result = await updater(previousMessage);

    if (result === null || result === undefined) {
      throw new TypeError(
        'upsertMessage: updater must return a MessageResponse, received null/undefined.'
      );
    }
    if (typeof result !== 'object') {
      throw new TypeError(
        'upsertMessage: updater must return a MessageResponse object.'
      );
    }

    result = {
      ...result,
      history: { ...result.history },
      ui_state_internal: {
        ...previousMessage?.ui_state_internal,
        ...result.ui_state_internal,
      },
    };

    if (result.id === undefined || result.id === null) {
      result.id = messageID;
    } else if (result.id !== messageID) {
      throw new Error(
        `upsertMessage: updater returned message id "${result.id}" but call was for "${messageID}".`
      );
    }

    return result;
  }

  /**
   * Phase 2: fire `pre:receive` and re-validate the id in case a listener mutated it.
   */
  private async firePreReceive(
    messageID: string,
    result: MessageResponse,
    stamp: UpsertStamp
  ): Promise<void> {
    const preReceiveEvent: BusEventPreReceive = {
      type: BusEventType.PRE_RECEIVE,
      data: result,
    };
    await this.serviceManager.fire(
      preReceiveEvent,
      () => !this.isStale(stamp, result.request_id)
    );
    if (result.id !== messageID) {
      if (!result.id) {
        result.id = messageID;
      } else {
        throw new Error(
          `upsertMessage: pre:receive handler changed message id from "${messageID}" to "${result.id}".`
        );
      }
    }
  }

  /**
   * Phase 3: snapshot `LocalMessageItem` references for `messageID` so phase 4 can
   * detect which items the reducer reused verbatim. The reducer preserves the
   * reference-equality of unchanged items (see `reducerUtils.applyAssistantMessageState`),
   * which is what makes this diff cheap and correct.
   */
  private snapshotLocalItemRefs(
    messageID: string
  ): Map<string, LocalMessageItem> {
    const refs = new Map<string, LocalMessageItem>();
    const stateBefore = this.serviceManager.store.getState();
    for (const [localID, localItem] of Object.entries(
      stateBefore.allMessageItemsByID
    )) {
      if (localItem && localItem.fullMessageID === messageID) {
        refs.set(localID, localItem);
      }
    }
    return refs;
  }

  /**
   * Reports each shown item of `messageID` that the chat can't draw and now shows an
   * error for: one the last write or settle replaced, that is no longer streaming. A
   * reused local item was reported when it was written, so each version reports once.
   *
   * Pass `false` for `reportErrors` when the settle is user-initiated (stop/cancel):
   * a malformed in-flight item that was never completed is not actionable host data.
   */
  private reportUndrawableItems(
    messageID: string,
    refsBefore: Map<string, LocalMessageItem>,
    reportErrors = true
  ) {
    const state = this.serviceManager.store.getState();
    for (const localID of state.assistantMessageState.localMessageIDs) {
      const localItem = state.allMessageItemsByID[localID];
      const { cannotDraw } = localItem?.ui_state ?? {};
      if (
        localItem?.fullMessageID !== messageID ||
        !cannotDraw ||
        refsBefore.get(localID) === localItem ||
        isItemStillStreaming(localItem)
      ) {
        continue;
      }
      if (!reportErrors) {
        continue;
      }
      const responseType = localItem.item.response_type;
      this.serviceManager.actions.errorOccurred({
        errorType: OnErrorType.RENDER,
        message: this.serviceManager.intl.formatMessage(
          { id: 'errors_upsertItemCannotDraw' },
          {
            responseType,
            messageID,
            missing: cannotDraw.missing.join(', '),
          }
        ),
        otherData: {
          messageID,
          responseType,
          missing: cannotDraw.missing,
          item: localItem.item,
        },
      });
    }
  }

  /**
   * Phase 4: for each item of the upserted message, re-emit the `USER_DEFINED_RESPONSE`
   * slot and custom-footer slot. It walks `output.generic` rather than the rendered list
   * so that items the reducer leaves out ({@link isHiddenOutputItem}) still fire, as they
   * do for `addMessage`. A shown item is skipped when the reducer kept its
   * `LocalMessageItem` reference, and a hidden one when it is deep-equal to the item at
   * the same position before, so downstream slot accumulators don't churn for nothing.
   *
   * `firesEveryItem` turns the skip off. It is set on the write that settles the
   * message, the one that fires `receive` or the first `ERROR`, so every item hears its
   * final state, as `addMessage` gives every item its `COMPLETE` event. An item that
   * shows would often fire anyway, since settling rebuilds a streamed item, but a hidden
   * one has no streaming state to change.
   *
   * Only items from `fromIndex` up to `toIndex` in `output.generic` fire, so items held
   * back behind a pause fire when they are revealed. A `pause` item never fires.
   */
  private async fanOutChangedSlots(
    messageID: string,
    result: MessageResponse,
    nextState: MessageState,
    refsBefore: Map<string, LocalMessageItem>,
    previousMessage: MessageResponse | undefined,
    firesEveryItem: boolean,
    fromIndex: number,
    toIndex: number,
    stamp: UpsertStamp
  ): Promise<void> {
    const { actions: chatActions } = this.serviceManager;
    const isStale = () => this.isStale(stamp, result.request_id);
    const skipsUnchanged: SkipsUnchanged | undefined = firesEveryItem
      ? undefined
      : { refsBefore, previousItems: previousMessage?.output?.generic ?? [] };

    for (const entry of this.fanOutEntries(messageID, result, toIndex)) {
      if (isStale()) {
        return;
      }
      const localItem =
        entry.index >= fromIndex
          ? this.localItemToFanOut(messageID, result, entry, skipsUnchanged)
          : undefined;
      if (localItem) {
        const nestedItems = entry.isHidden
          ? this.createHiddenNestedItems(localItem, result)
          : undefined;
        await chatActions.handleUserDefinedResponseItems(
          localItem,
          result,
          nextState,
          nestedItems,
          () => !isStale()
        );
        if (isStale()) {
          return;
        }
        await chatActions.handleCustomFooterSlot(
          localItem,
          result,
          () => !isStale()
        );
      }
    }
  }

  /**
   * Pairs each item of the message before `toIndex`, pauses left out, with the local
   * item the reducer shows for it. Shown items are matched by their position among the
   * shown items, so a hidden item doesn't shift the ones after it.
   */
  private fanOutEntries(
    messageID: string,
    result: MessageResponse,
    toIndex: number
  ): FanOutEntry[] {
    const state = this.serviceManager.store.getState();
    const shownLocalItems = state.assistantMessageState.localMessageIDs
      .map((id) => state.allMessageItemsByID[id])
      .filter((localItem) => localItem?.fullMessageID === messageID);
    let shownIndex = 0;

    return (result.output?.generic ?? [])
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => index < toIndex && item && !isPause(item))
      .map(({ item, index }) => {
        const isHidden = isHiddenOutputItem(result, item);
        const shownLocalItem = isHidden
          ? undefined
          : shownLocalItems[shownIndex++];
        return { index, item, isHidden, shownLocalItem };
      });
  }

  /**
   * Returns the local item to fire one item's events with, or undefined to skip it. With
   * `skipsUnchanged` set, a shown item is skipped when the reducer kept its local item's
   * reference, and a hidden one when it is deep-equal to the item at its position before.
   */
  private localItemToFanOut(
    messageID: string,
    result: MessageResponse,
    { index, item, isHidden, shownLocalItem }: FanOutEntry,
    skipsUnchanged: SkipsUnchanged | undefined
  ): LocalMessageItem | undefined {
    if (!isHidden) {
      const isReused =
        shownLocalItem &&
        skipsUnchanged?.refsBefore.get(shownLocalItem.ui_state.id) ===
          shownLocalItem;
      return isReused ? undefined : shownLocalItem;
    }
    if (skipsUnchanged && isEqual(skipsUnchanged.previousItems[index], item)) {
      return undefined;
    }
    const localItem = outputItemToLocalItem(item, result);
    // A hidden item has no stored local item to lend it an id. A stable one keeps its
    // user-defined slot the same from one write to the next.
    localItem.ui_state.id =
      streamItemID(messageID, item) ?? `${messageID}-hidden-${index}`;
    return localItem;
  }

  private createHiddenNestedItems(
    localItem: LocalMessageItem,
    result: MessageResponse
  ): Record<string, LocalMessageItem> {
    if (findDrawIssues(localItem.item, result).length) {
      return {};
    }
    const nestedItems: LocalMessageItem[] = [];
    createLocalMessageItemsForNestedMessageItems(
      localItem,
      result,
      false,
      nestedItems,
      true
    );
    const stableIDs = new Map(
      nestedItems.map((nested, index) => [
        nested.ui_state.id,
        streamItemID(result.id, nested.item) ??
          `${localItem.ui_state.id}-nested-${index}`,
      ])
    );
    const replaceIDs = (ids: string[]) => ids?.map((id) => stableIDs.get(id));
    for (const item of [localItem, ...nestedItems]) {
      const uiState = item.ui_state;
      uiState.itemsLocalMessageItemIDs = replaceIDs(
        uiState.itemsLocalMessageItemIDs
      );
      uiState.bodyLocalMessageItemIDs = replaceIDs(
        uiState.bodyLocalMessageItemIDs
      );
      uiState.footerLocalMessageItemIDs = replaceIDs(
        uiState.footerLocalMessageItemIDs
      );
      uiState.gridLocalMessageItemIDs = uiState.gridLocalMessageItemIDs?.map(
        (row) => row.map(replaceIDs)
      );
    }
    for (const nested of nestedItems) {
      nested.ui_state.id = stableIDs.get(nested.ui_state.id);
    }
    return Object.fromEntries(
      nestedItems.map((nested) => [nested.ui_state.id, nested])
    );
  }

  /**
   * Phase 5: fire `receive` and finalize the streaming state that `MessageService`
   * owns. We call into `MessageService` here because a message reaching COMPLETE via
   * `upsertMessage` must clear the same streaming UI state that an `addMessage` /
   * `addMessageChunk` flow would have cleared on completion.
   */
  private async firePostReceiveAndFinalize(
    messageID: string,
    result: MessageResponse,
    stamp: UpsertStamp
  ): Promise<void> {
    const receiveEvent: BusEventReceive = {
      type: BusEventType.RECEIVE,
      data: result,
    };
    try {
      await this.serviceManager.fire(
        receiveEvent,
        () => !this.isStale(stamp, result.request_id)
      );
    } catch (error) {
      consoleError('upsertMessage: receive handler threw, continuing.', error);
    }
    if (!this.isStale(stamp, result.request_id)) {
      this.serviceManager.messageService.finalizeStreamingMessage(messageID);
    }
  }
}

/**
 * What moving from `previousState` to `nextState` means for a message: whether it fires
 * `receive` (its first COMPLETE), and whether it settles every item's slots (that, or its
 * first ERROR).
 */
function transitionOf(
  previousState: MessageState | undefined,
  nextState: MessageState
) {
  const willFireReceive =
    nextState === MessageState.COMPLETE &&
    previousState !== MessageState.COMPLETE;
  const settlesMessage =
    willFireReceive ||
    (nextState === MessageState.ERROR && previousState !== MessageState.ERROR);
  return { willFireReceive, settlesMessage };
}

export { MessageUpsertCoordinator };

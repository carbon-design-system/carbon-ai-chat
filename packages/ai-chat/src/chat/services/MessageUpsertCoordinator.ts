/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
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
import actions from '../store/actions';
import type {
  MessageWriteOptions,
  ReceivedLocalItems,
} from '../store/messageWriteTypes';
import {
  createLocalMessageItemsForNestedMessageItems,
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

  /**
   * How many of each message's `pause` items have run, counted in `output.generic`
   * order, so a later upsert of the same message never runs one again. `Infinity` when
   * `addMessage` or history delivered the message, since they run its pauses themselves.
   */
  private readonly pausesRunByID = new Map<string, number>();

  /**
   * A token for each message id that the item loop of a message from `addMessage` or
   * `final_response` checks before showing each item. Removing the message, or a restart,
   * drops the token, which ends the loop. A later write for the id takes the same token,
   * so its items and the earlier write's keep showing side by side, as `addMessage`'s
   * always have.
   */
  private readonly revealByID = new Map<string, object>();

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
      // `addMessage` and history already ran, or are running, this message's pauses, so
      // a later upsert of it must not run them again. Always overwrite, even when upsert
      // has already advanced the cursor: a finite count would let a subsequent upsert
      // replay pauses from the wrong index.
      this.pausesRunByID.set(messageID, Infinity);
      // If a streaming upsert was in progress for this id, `addMessage` delivering the
      // same id closes the stream. Without this, the stop button would stay up with
      // nothing left to take it down.
      if (this.streamingIDs.delete(messageID)) {
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
   * Upsert IDs have no association with the canceled request, so cancellation settles
   * every registered ID. A host that keeps streaming registers again on its next write.
   */
  endAllStreaming(): boolean {
    const settledAny = this.streamingIDs.size > 0;
    for (const messageID of this.streamingIDs) {
      this.serviceManager.messageService.clearStreamingCancellation(messageID);
      const refsBefore = this.snapshotLocalItemRefs(messageID);
      this.serviceManager.store.dispatch(
        actions.endMessageStreaming(messageID)
      );
      this.reportUndrawableItems(messageID, refsBefore, false);
    }
    this.streamingIDs.clear();
    return settledAny;
  }

  /**
   * Drops the in-flight promise chain, the recorded state, any streaming registration,
   * the pause record, and any reveal under way for a single message ID. Called from
   * `removeMessages`.
   */
  clear(messageID: string) {
    this.serviceManager.messageService.clearStreamingCancellation(messageID);
    const wasStreaming = this.streamingIDs.has(messageID);
    this.stateByID.delete(messageID);
    this.chainByID.delete(messageID);
    this.streamingIDs.delete(messageID);
    this.pausesRunByID.delete(messageID);
    this.revealByID.delete(messageID);
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
    this.serviceManager.messageService.clearAllStreamingCancellation();
    this.generation++;
    this.chainByID.clear();
    this.stateByID.clear();
    this.streamingIDs.clear();
    this.pausesRunByID.clear();
    this.revealByID.clear();
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

    // `addMessage` and `final_response` have never waited on an earlier write for their
    // id, and no later write waits on them.
    if (
      options.origin === 'addMessage' ||
      (options.origin === 'chunk' && nextState !== MessageState.STREAMING)
    ) {
      return this.runReceivedWrite(messageID, updater, options);
    }

    // Chunk-STREAMING writes go through the per-id chain for serialization but bypass
    // the full upsert lifecycle in runOne — they have their own events, announcements,
    // and stop-button handling.
    if (options.origin === 'chunk') {
      return this.enqueue(messageID, () =>
        this.runChunkWrite(messageID, updater, options)
      );
    }

    return this.enqueue(messageID, () =>
      this.runOne(messageID, nextState, updater, options)
    );
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
    options: MessageWriteOptions
  ): Promise<void> {
    // A restart while the updater or `pre:receive` is pending must not write into the
    // new conversation, the same check `addMessage` makes.
    const generation = this.generation;
    const { restartCount: initialRestartCount } = this.serviceManager;
    const isStale = () =>
      generation !== this.generation ||
      initialRestartCount !== this.serviceManager.restartCount;

    // Fill in `history.timestamp`, `thread_id`, and `ui_state_internal` defaults the
    // way `addMessage` does. Without these, message components render-crash because
    // they read `message.history.timestamp` directly.
    const result = addDefaultsToMessage(
      await this.runUpdater(messageID, updater)
    );
    if (isStale()) {
      return;
    }

    const { willFireReceive, settlesMessage } = transitionOf(
      this.stateByID.get(messageID),
      nextState
    );

    if (willFireReceive) {
      await this.firePreReceive(messageID, result);
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

    const refsBefore = this.snapshotLocalItemRefs(messageID);
    const previousMessage = this.serviceManager.store.getState()
      .allMessagesByID[messageID] as MessageResponse | undefined;
    const holdFromIndex = this.findPauseToRun(messageID, result);
    this.serviceManager.store.dispatch(
      actions.upsertMessage(
        result,
        nextState === MessageState.STREAMING,
        holdFromIndex,
        options
      )
    );
    this.reportUndrawableItems(messageID, refsBefore);

    // Before the slot fan-out below: `serviceManager.fire` does not swallow listener
    // exceptions, so a throwing user-defined-response handler would skip everything
    // after `fanOutChangedSlots` — leaving the button up with nothing registered to
    // take it down.
    this.settleStreamingLiveness(messageID, nextState, result, holdFromIndex);

    await this.fanOutChangedSlots(
      messageID,
      result,
      nextState,
      refsBefore,
      previousMessage,
      settlesMessage,
      0,
      holdFromIndex
    );
    if (isStale()) {
      return;
    }

    // Record the committed transition before the pause reveal, so that a pause
    // interrupted by a restart or removeMessages still leaves stateByID consistent
    // with the store write that already happened. Without this, a subsequent write
    // would compute willFireReceive against the stale pre-write state and re-fire
    // pre:receive / receive.
    this.stateByID.set(messageID, nextState);

    const revealed = await this.revealAfterPauses(
      messageID,
      result,
      nextState,
      holdFromIndex,
      initialRestartCount
    );
    if (!revealed || isStale()) {
      return;
    }

    if (nextState === MessageState.COMPLETE) {
      await this.handleNewConnectToAgentItems(
        messageID,
        result,
        initialRestartCount
      );
      if (isStale()) {
        return;
      }
    }

    if (willFireReceive) {
      await this.firePostReceiveAndFinalize(messageID, result);
    } else if (nextState !== MessageState.STREAMING) {
      this.serviceManager.messageService.finalizeStreamingMessage(messageID);
    }
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
    options: MessageWriteOptions
  ): Promise<void> {
    const generation = this.generation;
    const { restartCount } = this.serviceManager;
    const result = await this.runUpdater(messageID, updater);
    if (
      generation === this.generation &&
      restartCount === this.serviceManager.restartCount
    ) {
      this.serviceManager.store.dispatch(
        actions.upsertMessage(result, true, undefined, options)
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
    options: MessageWriteOptions
  ): Promise<void> {
    const generation = this.generation;
    const initialRestartCount =
      options.restartCount ?? this.serviceManager.restartCount;
    const message = await updater(
      this.serviceManager.store.getState().allMessagesByID[
        messageID
      ] as MessageResponse
    );
    if (
      generation !== this.generation ||
      initialRestartCount !== this.serviceManager.restartCount
    ) {
      return;
    }

    const reveal = this.revealByID.get(messageID) ?? {};
    this.revealByID.set(messageID, reveal);
    const isCurrent = () =>
      generation === this.generation &&
      this.revealByID.get(messageID) === reveal &&
      initialRestartCount === this.serviceManager.restartCount;
    this.storeReceivedMessage(
      message,
      options,
      isCurrent,
      initialRestartCount
    ).catch((error) => {
      consoleError('Error processing the message response', error);
    });

    if (!options.isLatestWelcomeNode) {
      // Picks the returning-user home screen, as `runOne` does for native upserts, but
      // only when the message actually stores — not for messages that become inline errors.
      this.serviceManager.store.dispatch(
        actions.updateHasSentNonWelcomeMessage(true)
      );
    }

    // The stored message is the host's own object, so nobody may change it from here on.
    deepFreeze(message);
    await this.serviceManager.fire({
      type: BusEventType.RECEIVE,
      data: message,
    });
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

    // `addMessage` has always passed no request, which clears a host-set `request_id`.
    message.request_id = options.requestMessage?.id;
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
    const { config } = store.getState();
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
        await this.serviceManager.humanAgentService?.handleConnectToHumanAgent(
          localItem,
          message,
          config,
          initialRestartCount
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
        nestedLocalItemsByID
      );
      if (!isCurrent()) {
        return;
      }
      await chatActions.handleCustomFooterSlot(localItem, message);
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
    initialRestartCount: number
  ): Promise<boolean> {
    const generation = this.generation;
    const { store } = this.serviceManager;
    const generic = result.output?.generic ?? [];
    let pauseIndex = holdFromIndex;

    while (pauseIndex < generic.length) {
      await this.serviceManager.chunkProcessingService.waitForPause(
        generic[pauseIndex] as PauseItem,
        initialRestartCount
      );
      if (
        generation !== this.generation ||
        initialRestartCount !== this.serviceManager.restartCount ||
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
      pauseIndex = this.findPauseToRun(messageID, result);
      const refsBefore = this.snapshotLocalItemRefs(messageID);
      store.dispatch(actions.upsertMessage(result, isStreaming, pauseIndex));
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
        pauseIndex
      );
      if (
        generation !== this.generation ||
        initialRestartCount !== this.serviceManager.restartCount
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Runs the `connect_to_agent` handling `addMessage` gives, once per item: the first
   * time the item shows in a {@link MessageState.COMPLETE} write. The item is marked
   * before the availability check starts, so a later upsert never repeats it. The check
   * is tied to `initialRestartCount`, the restart count when the write began, so a
   * restart during the write drops its result.
   */
  private async handleNewConnectToAgentItems(
    messageID: string,
    result: MessageResponse,
    initialRestartCount: number
  ): Promise<void> {
    const generation = this.generation;
    const { store } = this.serviceManager;
    const state = store.getState();
    const newItems = state.assistantMessageState.localMessageIDs
      .map((id) => state.allMessageItemsByID[id])
      .filter(
        (item) =>
          item?.fullMessageID === messageID &&
          isConnectToHumanAgent(item.item) &&
          !item.ui_state.connectToAgentHandled
      );

    for (const item of newItems) {
      if (
        generation !== this.generation ||
        initialRestartCount !== this.serviceManager.restartCount
      ) {
        return;
      }
      store.dispatch(
        actions.setMessageUIProperty(
          item.ui_state.id,
          'connectToAgentHandled',
          true
        )
      );
      await this.serviceManager.humanAgentService?.handleConnectToHumanAgent(
        item,
        result,
        state.config,
        initialRestartCount
      );
    }
  }

  /**
   * Records whether `messageID` is still streaming, then brings the stop button and the
   * stream-start announcements in line with that.
   */
  private settleStreamingLiveness(
    messageID: string,
    nextState: MessageState,
    result: MessageResponse,
    holdFromIndex: number
  ) {
    if (nextState === MessageState.STREAMING) {
      this.stateByID.set(messageID, nextState);
      this.streamingIDs.add(messageID);
      this.syncStopStreamingButton(nextState, result, false);
      this.announceStreamStarts(result, holdFromIndex);
      return;
    }
    const wasStreaming = this.streamingIDs.delete(messageID);
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

  /**
   * Phase 1: read the existing message (rejecting requests), invoke the updater, and
   * check that the returned response carries the right id.
   */
  private async runUpdater(
    messageID: string,
    updater: UpsertMessageUpdater
  ): Promise<MessageResponse> {
    const existing = this.serviceManager.store.getState().allMessagesByID[
      messageID
    ] as Message | undefined;

    if (existing && isRequest(existing as MessageRequest)) {
      throw new Error(
        `upsertMessage: messageID "${messageID}" refers to a non-assistant message and cannot be upserted.`
      );
    }

    const previousMessage = existing as MessageResponse | undefined;
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
    result: MessageResponse
  ): Promise<void> {
    const preReceiveEvent: BusEventPreReceive = {
      type: BusEventType.PRE_RECEIVE,
      data: result,
    };
    await this.serviceManager.fire(preReceiveEvent);
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
    toIndex: number
  ): Promise<void> {
    const generation = this.generation;
    const { actions: chatActions, restartCount } = this.serviceManager;
    const isStale = () =>
      generation !== this.generation ||
      restartCount !== this.serviceManager.restartCount;
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
        await chatActions.handleUserDefinedResponseItems(
          localItem,
          result,
          nextState
        );
        if (isStale()) {
          return;
        }
        await chatActions.handleCustomFooterSlot(localItem, result);
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

  /**
   * Phase 5: fire `receive` and finalize the streaming state that `MessageService`
   * owns. We call into `MessageService` here because a message reaching COMPLETE via
   * `upsertMessage` must clear the same streaming UI state that an `addMessage` /
   * `addMessageChunk` flow would have cleared on completion.
   */
  private async firePostReceiveAndFinalize(
    messageID: string,
    result: MessageResponse
  ): Promise<void> {
    const generation = this.generation;
    const { restartCount } = this.serviceManager;
    const receiveEvent: BusEventReceive = {
      type: BusEventType.RECEIVE,
      data: result,
    };
    try {
      await this.serviceManager.fire(receiveEvent);
    } catch (error) {
      consoleError('upsertMessage: receive handler threw, continuing.', error);
    }
    if (
      generation === this.generation &&
      restartCount === this.serviceManager.restartCount
    ) {
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

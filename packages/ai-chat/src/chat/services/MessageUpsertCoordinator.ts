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
} from "../../types/config/MessagingConfig";
import {
  Message,
  MessageRequest,
  MessageResponse,
} from "../../types/messaging/Messages";
import {
  BusEventPreReceive,
  BusEventReceive,
  BusEventType,
} from "../../types/events/eventBusTypes";
import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import actions from "../store/actions";
import { addDefaultsToMessage, isRequest } from "../utils/messageUtils";
import { consoleError } from "../utils/miscUtils";
import { ServiceManager } from "./ServiceManager";

const VALID_STATES = new Set<MessageState>([
  MessageState.STREAMING,
  MessageState.COMPLETE,
  MessageState.ERROR,
]);

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
 */
class MessageUpsertCoordinator {
  private readonly serviceManager: ServiceManager;

  private readonly chainByID = new Map<string, Promise<void>>();

  private readonly stateByID = new Map<string, MessageState>();

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Records that the message with the given ID has reached
   * {@link MessageState.COMPLETE}. Safe to call repeatedly.
   */
  markComplete(messageID: string | undefined) {
    if (messageID) {
      this.stateByID.set(messageID, MessageState.COMPLETE);
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
   * Drops both the in-flight promise chain and recorded state for a single message ID.
   * Called from `removeMessages` and after `finalizeStreamingMessage` to keep the maps
   * draining for idle IDs.
   */
  clear(messageID: string) {
    this.stateByID.delete(messageID);
    this.chainByID.delete(messageID);
  }

  /**
   * Drops every entry from both maps. Called from `restartConversation` and from
   * {@link ChatInstance#destroy} so a torn-down chat does not carry stale state into a
   * fresh session.
   */
  clearAll() {
    this.chainByID.clear();
    this.stateByID.clear();
  }

  /**
   * Entry point for `instance.messaging.upsertMessage`. See {@link UpsertMessageUpdater}
   * for the updater contract.
   */
  async upsert(
    messageID: string,
    nextState: MessageState,
    updater: UpsertMessageUpdater,
  ): Promise<void> {
    if (typeof messageID !== "string" || messageID.length === 0) {
      throw new TypeError(
        "upsertMessage: messageID must be a non-empty string.",
      );
    }
    if (!VALID_STATES.has(nextState)) {
      throw new TypeError(
        `upsertMessage: state must be a MessageState value, received ${String(
          nextState,
        )}.`,
      );
    }
    if (typeof updater !== "function") {
      throw new TypeError("upsertMessage: updater must be a function.");
    }

    const prev = this.chainByID.get(messageID) ?? Promise.resolve();
    // A predecessor failure for this id must not poison this caller's promise.
    const next = prev
      .catch(noop)
      .then(() => this.runOne(messageID, nextState, updater));
    this.chainByID.set(messageID, next);

    // Drain the chain entry once `next` settles. The trailing `.then(noop, noop)`
    // detaches and absorbs the rejection so it isn't reported as unhandled — the
    // original caller still sees the rejection via `return next` below.
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
  ): Promise<void> {
    const result = await this.runUpdater(messageID, updater);

    const previousState = this.stateByID.get(messageID);
    const willFireReceive =
      nextState === MessageState.COMPLETE &&
      previousState !== MessageState.COMPLETE;

    if (willFireReceive) {
      await this.firePreReceive(messageID, result);
    }

    const refsBefore = this.snapshotLocalItemRefs(messageID);
    this.serviceManager.store.dispatch(actions.upsertMessage(result));
    await this.fanOutChangedSlots(messageID, result, nextState, refsBefore);

    this.stateByID.set(messageID, nextState);

    if (willFireReceive) {
      await this.firePostReceiveAndFinalize(messageID, result);
    }
  }

  /**
   * Phase 1: read the existing message (rejecting requests), invoke the updater, and
   * normalize the returned response so the rest of the pipeline can rely on a
   * well-formed {@link MessageResponse} carrying the right id and history defaults.
   */
  private async runUpdater(
    messageID: string,
    updater: UpsertMessageUpdater,
  ): Promise<MessageResponse> {
    const existing = this.serviceManager.store.getState().allMessagesByID[
      messageID
    ] as Message | undefined;

    if (existing && isRequest(existing as MessageRequest)) {
      throw new Error(
        `upsertMessage: messageID "${messageID}" refers to a non-assistant message and cannot be upserted.`,
      );
    }

    const previousMessage = existing as MessageResponse | undefined;
    const result = await updater(previousMessage);

    if (result === null || result === undefined) {
      throw new TypeError(
        "upsertMessage: updater must return a MessageResponse, received null/undefined.",
      );
    }
    if (typeof result !== "object") {
      throw new TypeError(
        "upsertMessage: updater must return a MessageResponse object.",
      );
    }

    if (result.id === undefined || result.id === null) {
      result.id = messageID;
    } else if (result.id !== messageID) {
      throw new Error(
        `upsertMessage: updater returned message id "${result.id}" but call was for "${messageID}".`,
      );
    }

    // Fill in `history.timestamp`, `thread_id`, and `ui_state_internal` defaults the
    // way `addMessage` does. Without these, message components render-crash because
    // they read `message.history.timestamp` directly.
    addDefaultsToMessage(result);

    return result;
  }

  /**
   * Phase 2: fire `pre:receive` and re-validate the id in case a listener mutated it.
   */
  private async firePreReceive(
    messageID: string,
    result: MessageResponse,
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
          `upsertMessage: pre:receive handler changed message id from "${messageID}" to "${result.id}".`,
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
    messageID: string,
  ): Map<string, LocalMessageItem> {
    const refs = new Map<string, LocalMessageItem>();
    const stateBefore = this.serviceManager.store.getState();
    for (const [localID, localItem] of Object.entries(
      stateBefore.allMessageItemsByID,
    )) {
      if (localItem && localItem.fullMessageID === messageID) {
        refs.set(localID, localItem);
      }
    }
    return refs;
  }

  /**
   * Phase 4: for each top-level local item belonging to `messageID`, re-emit the
   * `USER_DEFINED_RESPONSE` slot and custom-footer slot — but skip items whose
   * `LocalMessageItem` reference is identical to the pre-dispatch snapshot, because
   * that means the reducer kept them verbatim and downstream slot accumulators would
   * churn for nothing.
   */
  private async fanOutChangedSlots(
    messageID: string,
    result: MessageResponse,
    nextState: MessageState,
    refsBefore: Map<string, LocalMessageItem>,
  ): Promise<void> {
    const { actions: chatActions, store } = this.serviceManager;
    const stateAfter = store.getState();

    const topLevelLocalItemIDs =
      stateAfter.assistantMessageState.localMessageIDs
        .map((id) => stateAfter.allMessageItemsByID[id])
        .filter((item) => item && item.fullMessageID === messageID)
        .map((item) => item.ui_state.id);

    for (const localID of topLevelLocalItemIDs) {
      const localItem = stateAfter.allMessageItemsByID[localID];
      if (!localItem) {
        continue;
      }
      const previousRef = refsBefore.get(localID);
      if (previousRef !== undefined && previousRef === localItem) {
        // Reducer reused this item verbatim — nothing changed for slots to react to.
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await chatActions.handleUserDefinedResponseItems(
        localItem,
        result,
        nextState,
      );
      // eslint-disable-next-line no-await-in-loop
      await chatActions.handleCustomFooterSlot(localItem, result);
    }
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
  ): Promise<void> {
    const receiveEvent: BusEventReceive = {
      type: BusEventType.RECEIVE,
      data: result,
    };
    try {
      await this.serviceManager.fire(receiveEvent);
    } catch (error) {
      consoleError("upsertMessage: receive handler threw, continuing.", error);
    }
    this.serviceManager.messageService.finalizeStreamingMessage(messageID);
  }
}

export { MessageUpsertCoordinator };

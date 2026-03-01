/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import { Message, MessageRequest } from "../../types/messaging/Messages";
import { AutoScrollOptions } from "../../types/utilities/HasDoAutoScroll";
import { MessageClass } from "../components-legacy/MessageComponent";
import { AUTO_SCROLL_EXTRA } from "./constants";
import { isRequest, isResponse } from "./messageUtils";

/**
 * Auto-scroll controller for MessagesComponent.
 *
 * Design intent:
 * - Keep DOM-independent policy decisions (what to do next) separate from component lifecycle code.
 * - Keep geometry calculations and spacer math centralized so the pinning behavior has one source of truth.
 * - Return explicit action objects that the caller can execute, rather than mutating component state here.
 */

/**
 * The visible portion (in pixels) to show at the bottom of a tall message when auto-scrolling.
 * Ensures the response isn't completely hidden when the request message is very tall.
 */
const VISIBLE_BOTTOM_PORTION_PX = 100;

/**
 * The threshold ratio for determining if a message is "very tall".
 * A message is considered very tall if its height exceeds this ratio of the scroller height.
 */
const TALL_MESSAGE_THRESHOLD_RATIO = 0.25; // 1/4

/**
 * Determines if a message qualifies as a scroll target.
 *
 * Rules:
 * - A MessageRequest always qualifies.
 * - A MessageResponse qualifies only if its corresponding request had `history.silent = true`,
 *   meaning no visible user bubble was shown and the response is the right element to pin.
 *
 * @param message - The full message data
 * @param allMessagesByID - Map of all messages by their IDs, used to look up the request for a response
 */
function shouldScrollToMessage(
  message: Message,
  allMessagesByID: Record<string, Message>,
): boolean {
  if (isResponse(message)) {
    const messageRequest = allMessagesByID[
      message?.request_id
    ] as MessageRequest;

    // If the request for this response was silent, scroll to the response instead of where
    // the silent user message would be.
    return Boolean(messageRequest?.history?.silent);
  }

  return isRequest(message);
}

/**
 * Iterates backwards through `localMessageItems` to find the last item that qualifies as a
 * scroll target. Returns the matching MessageClass component and its index, or null if none found.
 *
 * @param localMessageItems - The ordered list of local message items
 * @param allMessagesByID - Map of all messages by their IDs
 * @param messageRefs - Map of local message item UI IDs to their MessageClass component instances
 */
function findLastScrollableMessage(
  localMessageItems: LocalMessageItem[],
  allMessagesByID: Record<string, Message>,
  messageRefs: Map<string, MessageClass>,
): { messageComponent: MessageClass; index: number } | null {
  let messageIndex = localMessageItems.length - 1;

  // Keep legacy behavior: we do not consider index 0 as a pin target.
  // This avoids pinning to the very first entry on initial render.
  while (messageIndex >= 1) {
    const localItem = localMessageItems[messageIndex];
    const message = allMessagesByID[localItem?.fullMessageID];

    if (shouldScrollToMessage(message, allMessagesByID)) {
      const messageComponent = messageRefs.get(localItem.ui_state.id);
      return { messageComponent, index: messageIndex };
    }
    messageIndex--;
  }

  return null;
}

/**
 * Calculates the base scroll position needed to place the target message at the top of the
 * visible scroll area. Adds `AUTO_SCROLL_EXTRA` padding to cut the message's top padding.
 *
 * @param targetRect - Bounding rect of the target message element
 * @param scrollerRect - Bounding rect of the scroll container
 * @param currentScrollTop - Current scrollTop of the scroll container
 */
function calculateBaseScrollTop(
  targetRect: DOMRect,
  scrollerRect: DOMRect,
  currentScrollTop: number,
): number {
  const targetOffsetWithinScroller =
    targetRect.top - scrollerRect.top + currentScrollTop;
  return Math.max(
    0,
    Math.floor(targetOffsetWithinScroller + AUTO_SCROLL_EXTRA),
  );
}

/**
 * Adjusts the scroll position for very tall messages to ensure the response below remains
 * visible. If the target message exceeds 25% of the scroller height, we scroll past most of
 * it, leaving only `VISIBLE_BOTTOM_PORTION_PX` visible at the bottom.
 *
 * @param baseScrollTop - The initial calculated scroll position
 * @param targetHeight - Height of the target message element
 * @param scrollerHeight - Height of the scroll container
 */
function adjustScrollTopForTallMessage(
  baseScrollTop: number,
  targetHeight: number,
  scrollerHeight: number,
): number {
  const isVeryTall =
    targetHeight > scrollerHeight * TALL_MESSAGE_THRESHOLD_RATIO;

  if (!isVeryTall) {
    return baseScrollTop;
  }

  const tallAdjustment = Math.max(0, targetHeight - VISIBLE_BOTTOM_PORTION_PX);

  return baseScrollTop + tallAdjustment;
}

/**
 * Calculates how tall the spacer div at the bottom of the message list needs to be so that
 * the scroll container can actually reach `finalScrollTop`. Without extra space at the bottom,
 * the browser will cap `scrollTop` at `scrollHeight - clientHeight`.
 *
 * The spacer should be reset to 0 before calling this function so that measurements are clean.
 *
 * @param spacerElem - The spacer div at the bottom of the message list
 * @param scrollElement - The scrollable container element
 * @param scrollerRect - Bounding rect of the scroll container (measured before setting spacer to 0)
 * @param finalScrollTop - The scroll position we want to be able to reach
 */
function calculateSpacerDeficit(
  spacerElem: HTMLElement,
  scrollElement: HTMLElement,
  scrollerRect: DOMRect,
  finalScrollTop: number,
): number {
  const spacerRect = spacerElem.getBoundingClientRect();
  const spacerOffset =
    spacerRect.top - scrollerRect.top + scrollElement.scrollTop;
  const visibleBottom = finalScrollTop + scrollElement.clientHeight;

  return Math.max(0, Math.ceil(visibleBottom - spacerOffset));
}

/**
 * Declarative decision output consumed by MessagesComponent.doAutoScroll().
 * Keeping this explicit makes branching behavior testable and easy to inspect.
 */
type AutoScrollAction =
  | {
      scrollTop: number;
      type: "scroll_to_top";
    }
  | {
      preferAnimate: boolean;
      scrollTop: number;
      type: "scroll_to_bottom";
    }
  | {
      type: "reset_to_top";
    }
  | {
      messageComponent: MessageClass;
      type: "pin_message";
    }
  | {
      type: "recalculate_spacer";
    }
  | {
      type: "noop";
    };

interface ResolveAutoScrollActionParams {
  allMessagesByID: Record<string, Message>;
  localMessageItems: LocalMessageItem[];
  messageRefs: Map<string, MessageClass>;
  options: AutoScrollOptions;
  pinnedMessageComponent: MessageClass | null;
  scrollElement: HTMLElement;
}

interface PinAndScrollResult {
  // Mirrors the spacer DOM write that was just performed.
  currentSpacerHeight: number;
  // Baseline used by streaming delta tracking.
  lastScrollHeight: number;
  // The message now considered "pinned".
  pinnedMessageComponent: MessageClass;
  scrollTop: number;
}

interface StreamingChunkResult {
  // May decrease to zero as content replaces the spacer.
  currentSpacerHeight: number;
  // Advances each chunk to keep delta math frame-to-frame.
  lastScrollHeight: number;
}

interface MessageArrayChangeFlags {
  countChanged: boolean;
  itemsChanged: boolean;
}

interface StreamingTransition {
  enteredStreaming: boolean;
  exitedStreaming: boolean;
  isCurrentlyStreaming: boolean;
  wasStreaming: boolean;
}

type StreamEndAction = "re_pin_and_scroll" | "recalculate_and_preserve_scroll";

interface StreamingSpacerSyncDecision {
  shouldSync: boolean;
  targetDomSpacerHeight: number;
}

interface PublicSpacerReconciliationAction {
  type: "noop" | "recalculate_spacer_preserve_scroll";
}

function hasActiveStreaming(localMessageItems: LocalMessageItem[]): boolean {
  return localMessageItems.some(
    (item) =>
      item.ui_state.streamingState && !item.ui_state.streamingState.isDone,
  );
}

function getMessageArrayChangeFlags({
  oldItems,
  newItems,
}: {
  oldItems: LocalMessageItem[];
  newItems: LocalMessageItem[];
}): MessageArrayChangeFlags {
  return {
    countChanged: newItems.length !== oldItems.length,
    itemsChanged: newItems !== oldItems,
  };
}

function getStreamingTransition({
  oldItems,
  newItems,
}: {
  oldItems: LocalMessageItem[];
  newItems: LocalMessageItem[];
}): StreamingTransition {
  const wasStreaming = hasActiveStreaming(oldItems);
  const isCurrentlyStreaming = hasActiveStreaming(newItems);
  return {
    enteredStreaming: !wasStreaming && isCurrentlyStreaming,
    exitedStreaming: wasStreaming && !isCurrentlyStreaming,
    isCurrentlyStreaming,
    wasStreaming,
  };
}

function getAnchoringRestoreTarget({
  currentScrollTop,
  snapshot,
}: {
  currentScrollTop: number;
  snapshot: number | null;
}): number | null {
  if (snapshot === null || currentScrollTop >= snapshot) {
    return null;
  }
  return snapshot;
}

function resolveStreamEndAction({
  nearPinThresholdPx,
  pinnedScrollTop,
  scrollTop,
}: {
  nearPinThresholdPx: number;
  pinnedScrollTop: number;
  scrollTop: number;
}): StreamEndAction {
  if (scrollTop <= pinnedScrollTop + nearPinThresholdPx) {
    return "re_pin_and_scroll";
  }
  return "recalculate_and_preserve_scroll";
}

function hasMessagesOutOfView({
  clientHeight,
  domSpacerHeight,
  scrollHeight,
  scrollTop,
  thresholdPx,
}: {
  clientHeight: number;
  domSpacerHeight: number;
  scrollHeight: number;
  scrollTop: number;
  thresholdPx: number;
}): boolean {
  const effectiveScrollHeight = scrollHeight - domSpacerHeight;
  const remainingPixelsToScroll =
    effectiveScrollHeight - scrollTop - clientHeight;
  return remainingPixelsToScroll > thresholdPx;
}

function resolveStreamingSpacerSyncDecision({
  currentSpacerHeight,
  domSpacerHeight,
  isCurrentlyStreaming,
  isNearPin,
  minDeltaPx,
}: {
  currentSpacerHeight: number;
  domSpacerHeight: number;
  isCurrentlyStreaming: boolean;
  isNearPin: boolean;
  minDeltaPx: number;
}): StreamingSpacerSyncDecision {
  if (!isCurrentlyStreaming || !isNearPin) {
    return { shouldSync: false, targetDomSpacerHeight: domSpacerHeight };
  }

  const shrinkDelta = domSpacerHeight - currentSpacerHeight;
  if (shrinkDelta < minDeltaPx) {
    return { shouldSync: false, targetDomSpacerHeight: domSpacerHeight };
  }

  // Mid-stream sync is intentionally shrink-only.
  if (currentSpacerHeight >= domSpacerHeight) {
    return { shouldSync: false, targetDomSpacerHeight: domSpacerHeight };
  }

  return {
    shouldSync: true,
    targetDomSpacerHeight: currentSpacerHeight,
  };
}

function applyStreamingSpacerDomSync({
  savedScrollTop,
  scrollElement,
  spacerElem,
  targetDomSpacerHeight,
}: {
  savedScrollTop: number;
  scrollElement: HTMLElement;
  spacerElem: HTMLElement | null;
  targetDomSpacerHeight: number;
}): { correctedScrollTop: number; newLastScrollHeight: number } | null {
  if (!spacerElem) {
    return null;
  }

  spacerElem.style.minBlockSize = `${Math.max(0, targetDomSpacerHeight)}px`;
  if (scrollElement.scrollTop < savedScrollTop) {
    scrollElement.scrollTop = savedScrollTop;
  }

  return {
    correctedScrollTop: scrollElement.scrollTop,
    newLastScrollHeight: scrollElement.scrollHeight,
  };
}

function resolvePublicSpacerReconciliationAction({
  pinnedMessageComponent,
}: {
  pinnedMessageComponent: MessageClass | null;
}): PublicSpacerReconciliationAction {
  if (!pinnedMessageComponent) {
    return { type: "noop" };
  }
  return { type: "recalculate_spacer_preserve_scroll" };
}

/**
 * Chooses the next auto-scroll action with strict precedence:
 * 1) explicit API override (`scrollToTop`, `scrollToBottom`)
 * 2) empty-list reset
 * 3) pin a newly qualifying message
 * 4) recalculate spacer for the existing pin
 * 5) no-op
 *
 * This method only decides; it does not mutate scroll/spacer state.
 */
function resolveAutoScrollAction({
  allMessagesByID,
  localMessageItems,
  messageRefs,
  options,
  pinnedMessageComponent,
  scrollElement,
}: ResolveAutoScrollActionParams): AutoScrollAction {
  const { scrollToBottom, scrollToTop } = options;

  if (scrollToTop !== undefined) {
    return { type: "scroll_to_top", scrollTop: scrollToTop };
  }

  if (scrollToBottom !== undefined) {
    return {
      type: "scroll_to_bottom",
      scrollTop:
        scrollElement.scrollHeight -
        scrollElement.offsetHeight -
        scrollToBottom,
      preferAnimate: options.preferAnimate ?? false,
    };
  }

  if (!localMessageItems.length) {
    // Without messages, clear stale browser-restored positions.
    return { type: "reset_to_top" };
  }

  const result = findLastScrollableMessage(
    localMessageItems,
    allMessagesByID,
    messageRefs,
  );

  if (
    result?.messageComponent &&
    result.messageComponent !== pinnedMessageComponent
  ) {
    return { type: "pin_message", messageComponent: result.messageComponent };
  }

  if (pinnedMessageComponent) {
    // Keep the current pin stable when layout changes but target has not changed.
    return { type: "recalculate_spacer" };
  }

  // Nothing to pin and no pinned target to maintain.
  return { type: "noop" };
}

function pinMessageAndScroll({
  messageComponent,
  scrollElement,
  spacerElem,
}: {
  messageComponent: MessageClass;
  scrollElement: HTMLElement;
  spacerElem: HTMLElement | null;
}): PinAndScrollResult | null {
  const targetElem = messageComponent?.ref?.current;
  if (!spacerElem || !targetElem) {
    return null;
  }

  const targetRect = targetElem.getBoundingClientRect();
  const scrollerRect = scrollElement.getBoundingClientRect();

  const baseScrollTop = calculateBaseScrollTop(
    targetRect,
    scrollerRect,
    scrollElement.scrollTop,
  );
  const scrollTop = adjustScrollTopForTallMessage(
    baseScrollTop,
    targetRect.height,
    scrollerRect.height,
  );

  const deficit = calculateSpacerDeficit(
    spacerElem,
    scrollElement,
    scrollerRect,
    scrollTop,
  );

  // Spacer must be written before setting scrollTop so the target position is reachable.
  spacerElem.style.minBlockSize = `${deficit}px`;
  scrollElement.scrollTop = scrollTop;

  return {
    currentSpacerHeight: deficit,
    lastScrollHeight: scrollElement.scrollHeight,
    pinnedMessageComponent: messageComponent,
    scrollTop,
  };
}

function recalculatePinnedMessageSpacer({
  pinnedMessageComponent,
  scrollElement,
  spacerElem,
}: {
  pinnedMessageComponent: MessageClass | null;
  scrollElement: HTMLElement;
  spacerElem: HTMLElement | null;
}): number | null {
  const targetElem = pinnedMessageComponent?.ref?.current;
  if (!spacerElem || !targetElem) {
    return null;
  }

  const targetRect = targetElem.getBoundingClientRect();
  const scrollerRect = scrollElement.getBoundingClientRect();

  const baseScrollTop = calculateBaseScrollTop(
    targetRect,
    scrollerRect,
    scrollElement.scrollTop,
  );
  const scrollTop = adjustScrollTopForTallMessage(
    baseScrollTop,
    targetRect.height,
    scrollerRect.height,
  );

  const deficit = calculateSpacerDeficit(
    spacerElem,
    scrollElement,
    scrollerRect,
    scrollTop,
  );

  // Recalculate spacer without touching scrollTop to avoid visual jumps.
  spacerElem.style.minBlockSize = `${deficit}px`;
  return deficit;
}

/**
 * Tracks streaming content growth by comparing scrollHeight deltas against the remaining
 * spacer. Updates the in-memory spacer accounting but does NOT write to the DOM spacer —
 * that is left entirely to the end-of-stream recalculation (executePinAndScroll or
 * executeRecalculateSpacer). Writing the spacer mid-stream would shrink scrollHeight
 * abruptly and cause the browser to cap scrollTop, visually jumping the user back to
 * the pin position even if they had scrolled down to follow the response.
 */
function consumeStreamingChunk({
  currentSpacerHeight,
  lastScrollHeight,
  scrollElement,
}: {
  currentSpacerHeight: number;
  lastScrollHeight: number;
  scrollElement: HTMLElement | null;
}): StreamingChunkResult {
  if (!scrollElement || currentSpacerHeight === 0) {
    return { currentSpacerHeight, lastScrollHeight };
  }

  const currentScrollHeight = scrollElement.scrollHeight;
  const delta = currentScrollHeight - lastScrollHeight;
  // If content grows, spacer shrinks. If content contracts, spacer may grow again to preserve pin semantics.
  const nextSpacerHeight = Math.max(0, currentSpacerHeight - delta);

  return {
    currentSpacerHeight: nextSpacerHeight,
    lastScrollHeight: currentScrollHeight,
  };
}

export {
  applyStreamingSpacerDomSync,
  consumeStreamingChunk,
  getAnchoringRestoreTarget,
  getMessageArrayChangeFlags,
  getStreamingTransition,
  hasActiveStreaming,
  hasMessagesOutOfView,
  pinMessageAndScroll,
  recalculatePinnedMessageSpacer,
  resolveAutoScrollAction,
  resolvePublicSpacerReconciliationAction,
  resolveStreamEndAction,
  resolveStreamingSpacerSyncDecision,
  type AutoScrollAction,
  type StreamEndAction,
};

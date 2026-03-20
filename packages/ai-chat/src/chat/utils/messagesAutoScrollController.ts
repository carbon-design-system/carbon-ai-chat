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
import { isRequest, isResponse } from "./messageUtils";

/**
 * Auto-scroll controller for MessagesComponent.
 *
 * Design intent:
 * - Keep DOM-independent policy decisions (what to do next) separate from component lifecycle code.
 * - Keep geometry calculations and spacer math centralized so the pinning behavior has one source of truth.
 * - Return explicit action objects that the caller can execute, rather than mutating component state here.
 *
 * ## Two-Layer Spacer Adjustment Approach
 *
 * When a user sends a message, the outbound message is pinned to the top of the scroll viewport
 * using a dynamically-sized spacer div at the bottom of the scrollable container. As streaming
 * response content arrives and grows, the spacer shrinks to maintain the pinned position.
 *
 * **Problem:** When streaming response content collapses (e.g., reasoning steps closing with a
 * CSS animation), the spacer needs to grow to compensate. A ResizeObserver on the active response
 * element handles general size changes, but it doesn't fire frequently enough during CSS transitions
 * to keep the spacer in sync, causing a visual blip where the content shrinks faster than the
 * spacer compensates.
 *
 * **Solution:** Use a two-layer approach:
 *
 * 1. **ResizeObserver (baseline):** Stays on the active response element for general size changes.
 *    Uses a delta-based approach — track the previous height, compute the difference on each callback,
 *    and adjust the spacer by the inverse of the delta. Never recompute the spacer from absolute
 *    measurements to avoid cumulative errors.
 *
 * 2. **requestAnimationFrame loop (animation):** When the ResizeObserver detects a negative
 *    delta (content shrinking, meaning a collapse animation just started), kick off a rAF polling
 *    loop that reads `getBoundingClientRect().height` on the response element every frame and
 *    applies the same delta-based spacer correction. Cancel the loop after the height stabilizes
 *    for 5 consecutive frames (animation complete).
 *
 * The spacer starts large (full container height minus pinned message height) when the user sends
 * a message, and naturally shrinks as response content streams in. The rAF loop is a targeted fix
 * only active during CSS collapse animations — the ResizeObserver handles everything else.
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * When we auto-scroll to a message, we want to scroll a bit more than necessary because messages have a lot of
 * padding on the top that we want to cut off when scrolling. This is the extra amount we scroll by. There's 28px of
 * padding above the message and we want to cut that down to just 8 so we scroll an extra 20px (28 - 8).
 */
const AUTO_SCROLL_EXTRA = 28 - 8;

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

// ============================================================================
// Types and Interfaces
// ============================================================================

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

interface SpacerRecalculationResult {
  deficit: number;
  scrollTop: number;
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

interface PublicSpacerReconciliationAction {
  type: "noop" | "recalculate_spacer_preserve_scroll";
}

// ============================================================================
// Helper Functions
// ============================================================================

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

interface SpacerRecalculationResult {
  deficit: number;
  scrollTop: number;
}

function recalculatePinnedMessageSpacer({
  pinnedMessageComponent,
  scrollElement,
  spacerElem,
}: {
  pinnedMessageComponent: MessageClass | null;
  scrollElement: HTMLElement;
  spacerElem: HTMLElement | null;
}): SpacerRecalculationResult | null {
  const targetElem = pinnedMessageComponent?.ref?.current;
  if (!spacerElem || !targetElem) {
    return null;
  }

  // SIMPLIFIED APPROACH: During resize events (e.g., reasoning steps closing), we don't
  // need to recalculate where the message SHOULD be - we just need to preserve the
  // CURRENT scroll position. The complex calculations (adjustScrollTopForTallMessage, etc.)
  // are only needed during initial pinning. Here, we just ensure the spacer is large
  // enough to keep the current scrollTop reachable.

  // Batch DOM reads
  const currentScrollTop = scrollElement.scrollTop;
  const clientHeight = scrollElement.clientHeight;
  const spacerRect = spacerElem.getBoundingClientRect();
  const scrollerRect = scrollElement.getBoundingClientRect();

  // Calculate minimum spacer needed to maintain current scroll position.
  // The spacer must ensure that (scrollTop + clientHeight) is reachable.
  const spacerOffset = spacerRect.top - scrollerRect.top + currentScrollTop;
  const visibleBottom = currentScrollTop + clientHeight;
  const deficit = Math.max(0, Math.ceil(visibleBottom - spacerOffset));

  // Write spacer (no need to set scrollTop - we're preserving it)
  spacerElem.style.minBlockSize = `${deficit}px`;

  return { deficit, scrollTop: currentScrollTop };
}

/**
 * ============================================================================
 * Message Resize Observer Utilities
 * ============================================================================
 *
 * Utilities for observing message element size changes to detect async content
 * loading (images, audio, video, user-defined content). Automatically stops
 * observing messages after they settle (no size changes for a configurable timeout).
 */

/**
 * Configuration for creating a message resize observer.
 */
export interface MessageResizeObserverConfig {
  /**
   * Callback to invoke when a significant size change is detected.
   * Receives the delta (change in height) for spacer adjustment.
   * Negative delta means content shrank, positive means it grew.
   */
  onSignificantResize: (delta: number) => void;

  /**
   * Function to check if there's a pinned message.
   * Only recalculates if a message is pinned.
   */
  hasPinnedMessage: () => boolean;

  /**
   * How long to wait (in ms) after the last resize before considering a message "settled".
   * Default: 3000 (3 seconds)
   */
  settleTimeout?: number;

  /**
   * Minimum size change (in px) to consider significant.
   * Default: 10
   */
  significantChangeThreshold?: number;
}

/**
 * State for a message resize observer instance.
 */
export interface MessageResizeObserverState {
  /**
   * The ResizeObserver instance.
   */
  observer: ResizeObserver;

  /**
   * Tracks the last known size of each observed message element.
   */
  messageSizes: Map<Element, number>;

  /**
   * Tracks settle timers for each observed message element.
   */
  settleTimers: Map<Element, ReturnType<typeof setTimeout>>;

  /**
   * Animation polling state for tracking CSS animations.
   */
  animationPollingState: AnimationPollingState | null;
}

/**
 * State for requestAnimationFrame polling during CSS animations.
 * This provides frame-by-frame height tracking when ResizeObserver
 * doesn't fire frequently enough during CSS transitions.
 */
interface AnimationPollingState {
  /**
   * The requestAnimationFrame ID for cancellation.
   */
  rafId: number | null;

  /**
   * The element being polled for height changes.
   */
  element: HTMLElement | null;

  /**
   * Previous height used for delta calculation.
   */
  previousHeight: number;

  /**
   * Count of consecutive frames with no height change.
   * Used to detect when animation has completed.
   */
  stableFrames: number;

  /**
   * Callback to invoke with height delta on each frame.
   */
  onHeightChange: (delta: number) => void;
}

/**
 * Processes resize observer entries to detect significant size changes and manage settle timers.
 * Uses delta-based tracking to compute height changes for spacer adjustment.
 *
 * @param entries - Array of ResizeObserverEntry objects from the observer callback
 * @param messageSizes - Map tracking the last known size of each observed element
 * @param settleTimers - Map tracking settle timers for each observed element
 * @param observer - The ResizeObserver instance for unobserving settled elements
 * @param animationPollingState - State for rAF polling during CSS animations
 * @param config - Configuration object containing thresholds and callbacks
 * @param config.significantChangeThreshold - Minimum size change (in px) to consider significant
 * @param config.settleTimeout - Time to wait (in ms) before considering a message settled
 * @param config.onSignificantResize - Callback to invoke with height delta when significant change detected
 */
function processResizeEntries(
  entries: ResizeObserverEntry[],
  messageSizes: Map<Element, number>,
  settleTimers: Map<Element, ReturnType<typeof setTimeout>>,
  observer: ResizeObserver,
  animationPollingState: AnimationPollingState | null,
  config: {
    significantChangeThreshold: number;
    settleTimeout: number;
    onSignificantResize: (delta: number) => void;
  },
): void {
  let totalDelta = 0;
  let hasSignificantChange = false;

  entries.forEach((entry) => {
    const { blockSize } = entry.borderBoxSize[0];
    const prevSize = messageSizes.get(entry.target);

    // prevSize is null on the very first observation — treat as baseline, not a change.
    if (prevSize != null) {
      const delta = blockSize - prevSize;

      if (Math.abs(delta) > config.significantChangeThreshold) {
        hasSignificantChange = true;
        totalDelta += delta;

        // If content is shrinking (negative delta) and no rAF loop is active,
        // start polling to catch CSS animation frames that ResizeObserver misses
        if (
          delta < 0 &&
          animationPollingState &&
          !animationPollingState.rafId
        ) {
          startAnimationPolling(
            entry.target as HTMLElement,
            animationPollingState,
            config.onSignificantResize,
          );
        }
      }
    }

    messageSizes.set(entry.target, blockSize);

    // Reset settle timer — stop observing after settleTimeout of no changes.
    const existingTimer = settleTimers.get(entry.target);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const timer = setTimeout(() => {
      observer.unobserve(entry.target);
      settleTimers.delete(entry.target);
      messageSizes.delete(entry.target);
    }, config.settleTimeout);
    settleTimers.set(entry.target, timer);
  });

  if (hasSignificantChange) {
    config.onSignificantResize(totalDelta);
  }
}

/**
 * Starts requestAnimationFrame polling for an element during CSS animations.
 * This provides frame-by-frame height tracking when ResizeObserver doesn't fire
 * frequently enough during CSS transitions/animations.
 *
 * @param element - The element to poll for height changes
 * @param state - Animation polling state
 * @param onHeightChange - Callback to invoke with height delta on each frame
 */
function startAnimationPolling(
  element: HTMLElement,
  state: AnimationPollingState,
  onHeightChange: (delta: number) => void,
): void {
  // Cancel any existing polling
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
  }

  // Initialize state
  state.element = element;
  state.previousHeight = Math.round(element.getBoundingClientRect().height);
  state.stableFrames = 0;
  state.onHeightChange = onHeightChange;

  // Start polling loop
  const poll = () => {
    if (!state.element) {
      return;
    }

    const currentHeight = Math.round(
      state.element.getBoundingClientRect().height,
    );
    const delta = currentHeight - state.previousHeight;

    if (delta !== 0) {
      // Height changed - apply spacer adjustment and reset stability counter
      state.onHeightChange(delta);
      state.previousHeight = currentHeight;
      state.stableFrames = 0;
    } else {
      // Height stable - increment counter
      state.stableFrames++;
    }

    // Continue polling if animation hasn't stabilized (< 5 stable frames)
    if (state.stableFrames < 5) {
      state.rafId = requestAnimationFrame(poll);
    } else {
      // Animation complete - cleanup
      state.rafId = null;
      state.element = null;
    }
  };

  state.rafId = requestAnimationFrame(poll);
}

/**
 * Stops any active animation polling and cleans up state.
 *
 * @param state - Animation polling state to cleanup
 */
export function stopAnimationPolling(
  state: AnimationPollingState | null,
): void {
  if (!state) {
    return;
  }

  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  state.element = null;
  state.stableFrames = 0;
}

/**
 * Creates and configures a ResizeObserver for message elements.
 * The observer detects when async content (images, audio, video) loads and changes
 * message height, triggering spacer recalculation. Automatically stops observing
 * messages after they settle to reduce overhead.
 *
 * Uses a two-layer approach for handling size changes:
 * 1. ResizeObserver (baseline) - Handles general size changes with delta-based tracking
 * 2. requestAnimationFrame loop (animation補助) - Activated during CSS animations for
 *    frame-by-frame compensation when ResizeObserver doesn't fire frequently enough
 *
 * @param config - Configuration for the observer
 * @returns State object containing the observer and tracking maps
 */
export function createMessageResizeObserver(
  config: MessageResizeObserverConfig,
): MessageResizeObserverState {
  const {
    onSignificantResize,
    hasPinnedMessage,
    settleTimeout = 3000,
    significantChangeThreshold = 10,
  } = config;

  const messageSizes = new Map<Element, number>();
  const settleTimers = new Map<Element, ReturnType<typeof setTimeout>>();

  // Initialize animation polling state for CSS animation tracking
  const animationPollingState: AnimationPollingState = {
    rafId: null,
    element: null,
    previousHeight: 0,
    stableFrames: 0,
    onHeightChange: () => {
      // Will be set by startAnimationPolling
    },
  };

  const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
    // Only recalculate if user hasn't scrolled away from pinned message
    if (!hasPinnedMessage()) {
      return;
    }

    // Process resize entries immediately (synchronously) to prevent race conditions
    // with CSS animations. The delta-based approach tracks height changes and triggers
    // rAF polling when content shrinks (collapse animations), providing frame-by-frame
    // compensation that ResizeObserver alone cannot achieve during CSS transitions.
    processResizeEntries(
      entries,
      messageSizes,
      settleTimers,
      observer,
      animationPollingState,
      {
        significantChangeThreshold,
        settleTimeout,
        onSignificantResize,
      },
    );
  });

  return {
    observer,
    messageSizes,
    settleTimers,
    animationPollingState,
  };
}

/**
 * Updates which message elements are being observed.
 * Call this when messages are added, removed, or the message array changes.
 *
 * @param state - The observer state
 * @param messageElements - Array of message elements to observe
 */
export function updateObservedMessages(
  state: MessageResizeObserverState,
  messageElements: HTMLElement[],
): void {
  const { observer, messageSizes } = state;

  // Observe all message elements that aren't already being observed
  messageElements.forEach((element) => {
    if (element && !messageSizes.has(element)) {
      observer.observe(element);
    }
  });
}

/**
 * Cleans up the ResizeObserver and all associated state.
 * Call this on component unmount.
 *
 * @param state - The observer state to clean up
 */
export function cleanupMessageResizeObserver(
  state: MessageResizeObserverState,
): void {
  const { observer, messageSizes, settleTimers, animationPollingState } = state;

  // Stop any active animation polling
  stopAnimationPolling(animationPollingState);

  // Disconnect observer
  observer.disconnect();

  // Clear all settle timers
  settleTimers.forEach((timer) => clearTimeout(timer));
  settleTimers.clear();

  // Clear size tracking
  messageSizes.clear();
}
/**
 * Checks if any new non-streaming response messages were added to the message list.
 *
 * This is used to determine if we need to schedule a deferred spacer recalculation,
 * as non-streaming responses may not have their full content rendered when the initial
 * pin calculation occurs, resulting in an oversized spacer.
 *
 * @param newItems - The current array of local message items
 * @param allMessagesByID - Map of all messages by their full message ID
 * @returns true if at least one non-streaming response was found, false otherwise
 */
function hasNewNonStreamingResponse(
  newItems: LocalMessageItem[],
  allMessagesByID: Record<string, Message>,
): boolean {
  return newItems.some((item) => {
    // Skip streaming items - they handle their own spacer updates
    if (item.ui_state.streamingState) {
      return false;
    }

    // Check if this is a response message
    const message = allMessagesByID[item.fullMessageID];
    const isResp = message && isResponse(message);
    return isResp;
  });
}

/**
 * Calculates the scroll position to restore after Safari's scroll anchoring behavior.
 *
 * Safari can automatically adjust scrollTop during DOM updates (scroll anchoring).
 * This function determines if we need to restore the user's intended scroll position
 * by comparing the current scrollTop with the pre-update snapshot.
 *
 * @param currentScrollTop - The current scroll position after the update
 * @param snapshot - The scroll position captured before the update (from getSnapshotBeforeUpdate)
 * @returns The scroll position to restore, or null if no restoration is needed
 */
function applySafariScrollAnchoringRestore(
  currentScrollTop: number,
  snapshot: number | null,
): number | null {
  const restoreTarget = getAnchoringRestoreTarget({
    currentScrollTop,
    snapshot,
  });

  return restoreTarget;
}

export {
  applySafariScrollAnchoringRestore,
  getAnchoringRestoreTarget,
  getMessageArrayChangeFlags,
  getStreamingTransition,
  hasMessagesOutOfView,
  hasNewNonStreamingResponse,
  pinMessageAndScroll,
  recalculatePinnedMessageSpacer,
  resolveAutoScrollAction,
  resolvePublicSpacerReconciliationAction,
  resolveStreamEndAction,
  type AutoScrollAction,
  type StreamEndAction,
};

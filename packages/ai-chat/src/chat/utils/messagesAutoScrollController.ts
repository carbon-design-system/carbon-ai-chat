/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import throttle from "lodash-es/throttle.js";
import prefix from "@carbon/ai-chat-components/es/globals/settings.js";

/**
 * Framework-agnostic scroll/spacer engine extracted from `MessagesComponent`.
 *
 * This class owns the entire auto-scroll model:
 * - pin state (`pinnedMessageId`, `pinnedScrollTop`, `domSpacerHeight`)
 * - grow-only spacer maintenance during streaming (via a per-message ResizeObserver)
 * - authoritative reconcile at layout-settle points (reasoning/code snippet render end)
 * - stream-transition handling and Safari scroll-anchoring restore
 * - the public auto-scroll / scroll-to-message / scroll-into-view API
 *
 * It depends only on the DOM and a {@link ScrollHost} adapter. There are no React
 * or `@carbon/ai-chat` imports so it can be moved into a Lit component with only an
 * import-path change.
 *
 * ## Spacer model
 *
 * When a user sends a message it is pinned to the top of the scroll viewport by sizing a spacer
 * div at the bottom of the scrollable container so the pinned message can reach the top.
 *
 * The spacer is **grow-only** during streaming: it is never shrunk as content streams in. The
 * response grows into the blank space below the pinned message, which keeps the message flush to
 * the top with no per-frame spacer churn. The spacer only grows, and only enough to keep
 * `pinnedScrollTop` reachable when content shrinks — so the browser cannot cap scrollTop and drop
 * the pin.
 *
 * The spacer is trimmed back to its true minimum at **settle points**: stream end, and the composed
 * layout-settled events (`reasoning-animation-end`, `code-snippet-render-end`) that first-party
 * content dispatches when an expand/collapse animation or async render finishes. That reconcile
 * measures the final layout directly, so there is no polling and no guessing at animation durations.
 */

// ============================================================================
// Host adapter types
// ============================================================================

/**
 * A framework-neutral view of a single message row, as seen by the scroll engine.
 * The host computes the semantic flags; the controller only ever needs the element.
 */
export interface PortableMessage {
  /** Stable per-row id (the local message item's `ui_state.id`). */
  id: string;
  /** The rendered root element for this row, or null if not yet mounted. */
  element: HTMLElement | null;
  /**
   * Whether this row qualifies as a pin target. The host computes this as
   * `isRequest(msg)` OR (`isResponse(msg)` AND its request's `history.silent`).
   */
  isPinnable: boolean;
  /** Whether this row is currently streaming (`streamingState && !streamingState.isDone`). */
  isStreaming: boolean;
  /** Whether this row's full message is a response. */
  isResponse: boolean;
}

/**
 * Options for controlling how the scrolling occurs. Mirrors the public
 * `AutoScrollOptions` shape but is defined locally to keep the controller
 * free of `@carbon/ai-chat` imports.
 */
export interface ScrollOptions {
  scrollToTop?: number;
  scrollToBottom?: number;
  preferAnimate?: boolean;
}

/**
 * The adapter the host (React `MessagesComponent` today, Lit `messages-shell`
 * later) implements so the controller can read/write the DOM without knowing
 * about the host framework.
 */
export interface ScrollHost {
  /** The scrollable container (`.cds-aichat--messages__wrapper`). */
  getScrollContainer(): HTMLElement | null;
  /** The bottom spacer element that is measured/grown to keep the pin reachable. */
  getSpacer(): HTMLElement | null;
  /** Apply the spacer's block size (host keeps CSP/root knowledge). */
  setSpacerHeight(px: number): void;
  /** All message rows in document order; host computes the flags. */
  getMessages(): PortableMessage[];
  /** Notify the host that scroll geometry changed (repaint scroll-to-bottom button). */
  onScrollGeometryChanged(): void;
}

// ============================================================================
// Constants
// ============================================================================

const DEBUG_AUTO_SCROLL = false;
const STREAM_END_NEAR_PIN_THRESHOLD_PX = 60;
const SCROLL_DOWN_THRESHOLD_PX = 60;

/**
 * How far above the pin the user must scroll before we treat it as a deliberate
 * "scroll away" that disengages auto-scroll. Matches the streaming restore threshold.
 */
const USER_SCROLL_AWAY_THRESHOLD_PX = 50;

/**
 * Window resize handler throttle - recalculates layout when browser window is resized.
 * User-initiated window resizing doesn't need sub-frame precision.
 */
const WINDOW_RESIZE_THROTTLE_MS = 200;

/**
 * General auto-scroll operations throttle - triggered by message updates.
 * Balance between responsiveness and avoiding excessive scroll calculations.
 */
const AUTO_SCROLL_THROTTLE_MS = 150;

/**
 * When we auto-scroll to a message, we want to scroll a bit more than necessary because messages have a lot of
 * padding on the top that we want to cut off when scrolling. This is the extra amount we scroll by.
 * Note: A negative value will leave more of the previous message visible above the target message.
 * For example, -60 will show approximately 60px of the previous conversation above the new message.
 */
const AUTO_SCROLL_EXTRA = -60;

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
// Small DOM helpers (copied from ai-chat `domUtils` to keep the import boundary
// clean — these are trivial and framework-agnostic).
// ============================================================================

/**
 * Sets the scroll position on the given scrollable element to the given top and left values.
 */
function doScrollElement(
  element: Element,
  scrollTop: number,
  scrollLeft: number,
  animate = false,
): void {
  if (element) {
    if (animate && element.scroll) {
      element.scroll({
        top: scrollTop,
        left: scrollLeft,
        behavior: "smooth",
      });
    } else {
      element.scrollTop = scrollTop;
      element.scrollLeft = scrollLeft;
    }
  }
}

/**
 * Returns the "scrollBottom" value for the given element. This is similar to "scrollTop" except that it represents
 * the distance the element has been scrolled from the bottom.
 */
function getScrollBottom(element: HTMLElement | null): number {
  if (element) {
    return element.scrollHeight - element.offsetHeight - element.scrollTop;
  }
  return 0;
}

// ============================================================================
// Types and Interfaces (engine-internal)
// ============================================================================

/**
 * Declarative decision output consumed by the controller's action executor.
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
      message: PortableMessage;
      type: "pin_message";
    }
  | {
      type: "recalculate_spacer";
    }
  | {
      type: "noop";
    };

interface ResolveAutoScrollActionParams {
  messages: PortableMessage[];
  options: ScrollOptions;
  pinnedMessageId: string | null;
  scrollElement: HTMLElement;
}

interface PinAndScrollResult {
  // Mirrors the spacer DOM write that was just performed.
  currentSpacerHeight: number;
  // Baseline used by streaming delta tracking.
  lastScrollHeight: number;
  // The message now considered "pinned".
  pinnedMessageId: string;
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

/**
 * State for the message resize observer instance.
 */
interface MessageResizeObserverState {
  /** The ResizeObserver instance. */
  observer: ResizeObserver;
  /** Tracks the last known size of each observed message element. */
  messageSizes: Map<Element, number>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Iterates backwards through `messages` to find the last row that qualifies as a
 * scroll target (`isPinnable`). Returns the matching message, or null if none found.
 *
 * Index 0 is never considered a pin target, which avoids pinning to the very first
 * entry on initial render.
 */
function findLastPinnable(messages: PortableMessage[]): PortableMessage | null {
  let messageIndex = messages.length - 1;

  // Index 0 is not a pin target — this avoids pinning to the very first entry on
  // initial render.
  while (messageIndex >= 1) {
    const message = messages[messageIndex];

    if (message?.isPinnable) {
      return message;
    }
    messageIndex--;
  }

  return null;
}

/**
 * Calculates the base scroll position needed to place the target message at the top of the
 * visible scroll area. Adds `AUTO_SCROLL_EXTRA` padding to cut the message's top padding.
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
 * Grow-only spacer model.
 *
 * While a message is pinned we never SHRINK the spacer as content streams in — we only ever
 * GROW it, and only enough to keep `pinnedScrollTop` reachable when content shrinks (e.g. a
 * reasoning trace collapsing before its settle event lands) so the browser cannot cap
 * scrollTop and drop the pin.
 *
 * Given the current geometry, the minimum spacer needed to keep `pinnedScrollTop` reachable is
 * `pinnedScrollTop + clientHeight - contentHeightWithoutSpacer` (clamped at 0), where
 * `contentHeightWithoutSpacer = scrollHeight - currentSpacerHeight`. The returned value is the
 * max of that minimum and the current spacer height, so the spacer NEVER shrinks here — the
 * authoritative trim back to the true minimum happens at settle points via
 * reconcileSpacerAfterLayoutSettled.
 */
function computeGrowOnlySpacerHeight(params: {
  scrollHeight: number;
  clientHeight: number;
  currentSpacerHeight: number;
  pinnedScrollTop: number;
}): number {
  const { scrollHeight, clientHeight, currentSpacerHeight, pinnedScrollTop } =
    params;
  const contentHeightWithoutSpacer = scrollHeight - currentSpacerHeight;
  const minSpacerForPin = Math.max(
    0,
    pinnedScrollTop + clientHeight - contentHeightWithoutSpacer,
  );
  return Math.max(currentSpacerHeight, minSpacerForPin);
}

function hasActiveStreaming(messages: PortableMessage[]): boolean {
  return messages.some((message) => message.isStreaming);
}

function getMessageArrayChangeFlags({
  oldItems,
  newItems,
}: {
  oldItems: PortableMessage[];
  newItems: PortableMessage[];
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
  oldItems: PortableMessage[];
  newItems: PortableMessage[];
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
  maxScrollTop,
}: {
  nearPinThresholdPx: number;
  pinnedScrollTop: number;
  scrollTop: number;
  maxScrollTop?: number;
}): StreamEndAction {
  // Content shrank and the browser capped scrollTop below the pin — this is
  // browser-initiated, not a user scroll, so we must still re-pin. Mirrors the
  // `wasBrowserCapped` exception in the streaming ResizeObserver guard.
  const wasBrowserCapped =
    maxScrollTop !== undefined &&
    scrollTop >= maxScrollTop - 2 &&
    scrollTop < pinnedScrollTop;

  // Symmetric distance check: a manual scroll in EITHER direction past the
  // threshold means the user moved away from the pin, so we preserve their
  // position instead of yanking them back. A one-directional check here would
  // miss upward scrolls and re-pin over the top of them.
  const scrolledAway =
    Math.abs(scrollTop - pinnedScrollTop) > nearPinThresholdPx;

  if (!scrolledAway || wasBrowserCapped) {
    return "re_pin_and_scroll";
  }
  return "recalculate_and_preserve_scroll";
}

/**
 * Decides whether a scroll position represents a DELIBERATE user scroll away from the pin, as
 * opposed to a browser-initiated cap (content shrank, so the browser lowered scrollTop to the
 * max reachable value). Both lower scrollTop below the pin, but a cap parks the user exactly at
 * `maxScrollTop` with no room below, whereas a deliberate scroll-up leaves room to scroll
 * further down. Evaluated from a settled `scroll` event, this latches user intent so that a
 * later mid-animation `maxScrollTop` dip (a reasoning step collapsing) cannot be misread as the
 * user moving.
 *
 * @returns `true` to disengage auto-scroll (user parked above the pin with room below),
 * `false` to (re)engage (user is at/below the pin, i.e. following), or `null` when the position
 * is ambiguous (e.g. pinned to the bottom by a cap) and the caller should leave the flag as-is.
 */
function resolveUserScrollAway({
  scrollTop,
  pinnedScrollTop,
  maxScrollTop,
  thresholdPx,
}: {
  scrollTop: number;
  pinnedScrollTop: number;
  maxScrollTop: number;
  thresholdPx: number;
}): boolean | null {
  const abovePin = scrollTop < pinnedScrollTop - thresholdPx;
  const roomBelow = scrollTop < maxScrollTop - thresholdPx;
  if (abovePin && roomBelow) {
    return true;
  }
  if (scrollTop >= pinnedScrollTop - thresholdPx) {
    return false;
  }
  return null;
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
  pinnedMessageId,
}: {
  pinnedMessageId: string | null;
}): PublicSpacerReconciliationAction {
  if (!pinnedMessageId) {
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
 * This function only decides; it does not mutate scroll/spacer state.
 */
function resolveAutoScrollAction({
  messages,
  options,
  pinnedMessageId,
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

  if (!messages.length) {
    // Without messages, clear stale browser-restored positions.
    return { type: "reset_to_top" };
  }

  const candidate = findLastPinnable(messages);

  // `candidate.element` may be null when the row hasn't mounted yet — a missing
  // element means there is nothing to pin.
  if (candidate?.element && candidate.id !== pinnedMessageId) {
    return { type: "pin_message", message: candidate };
  }

  if (pinnedMessageId) {
    // Keep the current pin stable when layout changes but target has not changed.
    return { type: "recalculate_spacer" };
  }

  // Nothing to pin and no pinned target to maintain.
  return { type: "noop" };
}

function pinMessageAndScroll({
  message,
  scrollElement,
  spacerElem,
  setSpacerHeight,
}: {
  message: PortableMessage;
  scrollElement: HTMLElement;
  spacerElem: HTMLElement | null;
  setSpacerHeight: (px: number) => void;
}): PinAndScrollResult | null {
  const targetElem = message?.element;
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
  setSpacerHeight(deficit);
  scrollElement.scrollTop = scrollTop;

  return {
    currentSpacerHeight: deficit,
    lastScrollHeight: scrollElement.scrollHeight,
    pinnedMessageId: message.id,
    scrollTop,
  };
}

function recalculatePinnedMessageSpacer({
  pinnedElement,
  scrollElement,
  spacerElem,
  setSpacerHeight,
}: {
  pinnedElement: HTMLElement | null;
  scrollElement: HTMLElement;
  spacerElem: HTMLElement | null;
  setSpacerHeight: (px: number) => void;
}): SpacerRecalculationResult | null {
  const targetElem = pinnedElement;
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
  setSpacerHeight(deficit);

  return { deficit, scrollTop: currentScrollTop };
}

/**
 * ============================================================================
 * Message Resize Observer Utilities
 * ============================================================================
 *
 * Utilities for observing message element size changes to detect async content
 * loading (images, audio, video, user-defined content, streaming text) and reconcile
 * the scroll spacer against the new height.
 */

/**
 * Processes resize observer entries to detect significant size changes.
 * Uses delta-based tracking to compute height changes for spacer adjustment.
 *
 * Collapse/expand animations (reasoning) and async render completions (code snippets) are
 * handled authoritatively by the composed layout-settled events, so this reactive path only
 * needs to compensate for incremental size changes such as streaming text growth.
 */
function processResizeEntries(
  entries: ResizeObserverEntry[],
  messageSizes: Map<Element, number>,
  config: {
    significantChangeThreshold: number;
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
      }
    }

    messageSizes.set(entry.target, blockSize);
  });

  if (hasSignificantChange) {
    // Wrap callback in requestAnimationFrame to avoid ResizeObserver loop errors
    // The callback modifies DOM (spacer height), which can trigger more resize observations
    requestAnimationFrame(() => {
      config.onSignificantResize(totalDelta);
    });
  }
}

/**
 * Creates and configures a ResizeObserver for message elements.
 * The observer detects when async content (images, audio, video, streaming text) loads and
 * changes message height, triggering spacer recalculation.
 *
 * This is the reactive baseline for incremental size changes. Collapse/expand animations
 * (reasoning) and async render completions (code snippets) are reconciled authoritatively via
 * composed layout-settled events, so no frame-by-frame polling is needed here.
 */
function createMessageResizeObserver(config: {
  onSignificantResize: (delta: number) => void;
  hasPinnedMessage: () => boolean;
  significantChangeThreshold?: number;
}): MessageResizeObserverState {
  const {
    onSignificantResize,
    hasPinnedMessage,
    significantChangeThreshold = 10,
  } = config;

  const messageSizes = new Map<Element, number>();

  const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
    // Only recalculate if user hasn't scrolled away from pinned message
    if (!hasPinnedMessage()) {
      return;
    }

    processResizeEntries(entries, messageSizes, {
      significantChangeThreshold,
      onSignificantResize,
    });
  });

  return {
    observer,
    messageSizes,
  };
}

/**
 * Updates which message elements are being observed.
 * Call this when messages are added, removed, or the message array changes.
 */
function updateObservedMessages(
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
 */
function cleanupMessageResizeObserver(state: MessageResizeObserverState): void {
  const { observer, messageSizes } = state;

  // Disconnect observer
  observer.disconnect();

  // Clear size tracking
  messageSizes.clear();
}

/**
 * Checks if any new non-streaming response messages are in the message list.
 *
 * This is used to determine if we need to schedule a deferred spacer recalculation,
 * as non-streaming responses may not have their full content rendered when the initial
 * pin calculation occurs, resulting in an oversized spacer.
 */
function hasNewNonStreamingResponse(messages: PortableMessage[]): boolean {
  return messages.some((message) => {
    // Skip streaming items - they handle their own spacer updates
    if (message.isStreaming) {
      return false;
    }

    // Check if this is a response message
    return message.isResponse;
  });
}

/**
 * Calculates the scroll position to restore after Safari's scroll anchoring behavior.
 *
 * Safari can automatically adjust scrollTop during DOM updates (scroll anchoring).
 * This function determines if we need to restore the user's intended scroll position
 * by comparing the current scrollTop with the pre-update snapshot.
 */
function applySafariScrollAnchoringRestore(
  currentScrollTop: number,
  snapshot: number | null,
): number | null {
  return getAnchoringRestoreTarget({
    currentScrollTop,
    snapshot,
  });
}

function debugAutoScroll(message: string): void {
  if (DEBUG_AUTO_SCROLL) {
    // eslint-disable-next-line no-console
    console.log(message);
  }
}

// ============================================================================
// The controller
// ============================================================================

export class MessagesScrollController {
  private host: ScrollHost;

  /**
   * The observer used to monitor for changes in the scroll panel size.
   */
  private scrollPanelObserver: ResizeObserver | null = null;

  /**
   * State for the message resize observer that detects async content loading.
   */
  private messageResizeObserverState: MessageResizeObserverState | null = null;

  /**
   * The id of the message most recently pinned to the top of the visible scroll area.
   * Updated when pinning/re-pinning chooses a different target.
   */
  private pinnedMessageId: string | null = null;

  /**
   * The scrollTop value set at the moment of the last pin. Compared against the current
   * scrollTop at stream end to detect whether the user scrolled away from the pin during
   * streaming.
   */
  private pinnedScrollTop = 0;

  /**
   * The spacer height that is actually written to the DOM. Used by isScrolledAwayFromBottom
   * to prevent the scroll-to-bottom button from appearing for blank spacer space.
   */
  private domSpacerHeight = 0;

  /**
   * Whether the user has deliberately scrolled away (up) from the pin. While true, every
   * auto-scroll restore/re-pin path is suppressed so we never yank the user back down; it is
   * set/cleared by the `scroll` listener (`handleUserScroll`) and reset when a new message is
   * pinned. This is what makes manual scroll-up stop auto-scroll during streaming/reasoning.
   */
  private userScrolledAwayFromPin = false;

  /**
   * Pending requestAnimationFrame id used to coalesce multiple content-layout-settled
   * events into a single spacer reconciliation per frame.
   */
  private layoutSettledRafId: number | null = null;

  /**
   * The last message array observed by onHostUpdated, so we can compute change flags and
   * streaming transitions against the previous host state.
   */
  private previousMessages: PortableMessage[] = [];

  constructor(host: ScrollHost) {
    this.host = host;
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  connect(): void {
    const scrollContainer = this.host.getScrollContainer();

    // Use requestAnimationFrame to avoid ResizeObserver loop errors
    this.scrollPanelObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this.onContainerResize();
      });
    });
    if (scrollContainer) {
      this.scrollPanelObserver.observe(scrollContainer);
    }

    // Create message resize observer for async content loading and streaming size changes.
    // This is the reactive baseline: it keeps the pinned message reachable (grow-only spacer)
    // as content changes. Authoritative shrink/reconcile happens at settle points via the
    // composed layout-settled events (reasoning-animation-end / code-snippet-render-end).
    this.messageResizeObserverState = createMessageResizeObserver({
      onSignificantResize: () => {
        // Grow-only spacer model: while a message is pinned we never SHRINK the spacer as
        // content streams in. The response simply grows into the blank space below the pinned
        // message, which keeps the message flush to the top without any per-frame spacer
        // churn (the source of streaming jitter). We only ever GROW the spacer here, and only
        // enough to keep `pinnedScrollTop` reachable when content shrinks (e.g. a reasoning
        // trace collapsing before its settle event lands) so the browser cannot cap scrollTop
        // and drop the pin. The spacer is trimmed back to its true minimum at settle points —
        // stream end, `reasoning-animation-end`, `code-snippet-render-end` — via
        // reconcileSpacerAfterLayoutSettled.
        const scrollElement = this.host.getScrollContainer();
        const spacerElem = this.host.getSpacer();

        if (scrollElement && spacerElem && this.pinnedMessageId) {
          // Detect if scrollTop was capped by the browser due to scrollHeight reduction.
          // When content shrinks and scrollHeight drops below pinnedScrollTop + clientHeight,
          // the browser caps scrollTop to scrollHeight - clientHeight. This looks like the
          // user scrolled away but is actually browser-initiated.
          const maxScrollTop =
            scrollElement.scrollHeight - scrollElement.clientHeight;
          const wasBrowserCapped =
            scrollElement.scrollTop >= maxScrollTop - 2 &&
            scrollElement.scrollTop < this.pinnedScrollTop;

          // Grow the spacer only if the current content can no longer reach pinnedScrollTop.
          const growOnlySpacerHeight = computeGrowOnlySpacerHeight({
            scrollHeight: scrollElement.scrollHeight,
            clientHeight: scrollElement.clientHeight,
            currentSpacerHeight: this.domSpacerHeight,
            pinnedScrollTop: this.pinnedScrollTop,
          });
          if (growOnlySpacerHeight > this.domSpacerHeight) {
            this.domSpacerHeight = growOnlySpacerHeight;
            this.host.setSpacerHeight(this.domSpacerHeight);
          }

          // Restore scrollTop if user is near the pin, or if browser capped scrollTop — but
          // never once the user has deliberately scrolled away, otherwise a transient shrink
          // (a reasoning step collapsing) would look like a browser cap and yank them back down.
          const scrollDelta = Math.abs(
            scrollElement.scrollTop - this.pinnedScrollTop,
          );
          const hasScrolledAway = scrollDelta > 50;
          if (
            !this.userScrolledAwayFromPin &&
            (!hasScrolledAway || wasBrowserCapped)
          ) {
            scrollElement.scrollTop = this.pinnedScrollTop;
          }
        }
      },
      hasPinnedMessage: () => {
        return this.pinnedMessageId !== null;
      },
      significantChangeThreshold: 2, // Low threshold to catch reasoning step animations
    });

    // Start observing current messages
    this.updateObservedMessages();

    // First-party content whose height settles asynchronously announces it with a composed
    // event: reasoning steps/content on expand/collapse (`reasoning-animation-end`) and code
    // snippets after CodeMirror init / font load (`code-snippet-render-end`). Both bubble up
    // to this scroll container, letting us recalculate scroll geometry against the final
    // layout instead of polling animation frames.
    // Fires before a reasoning container collapses, so we can reserve space up front rather
    // than reacting a frame too late.
    scrollContainer?.addEventListener(
      "reasoning-animation-start",
      this.handleContentLayoutWillShrink,
    );
    scrollContainer?.addEventListener(
      "reasoning-animation-end",
      this.handleContentLayoutSettled,
    );
    scrollContainer?.addEventListener(
      "code-snippet-render-end",
      this.handleContentLayoutSettled,
    );

    // Track deliberate user scroll-away so auto-scroll can disengage. Passive: we only read
    // scroll geometry, never call preventDefault.
    scrollContainer?.addEventListener("scroll", this.handleUserScroll, {
      passive: true,
    });

    // Seed the previous-messages baseline so the first onHostUpdated compares
    // against the state present at connect time.
    this.previousMessages = this.host.getMessages();
  }

  disconnect(): void {
    // Remove the listeners and observers set up in connect().
    if (this.scrollPanelObserver) {
      this.scrollPanelObserver.disconnect();
      this.scrollPanelObserver = null;
    }
    if (this.messageResizeObserverState) {
      cleanupMessageResizeObserver(this.messageResizeObserverState);
      this.messageResizeObserverState = null;
    }
    const scrollContainer = this.host.getScrollContainer();
    scrollContainer?.removeEventListener(
      "reasoning-animation-start",
      this.handleContentLayoutWillShrink,
    );
    scrollContainer?.removeEventListener(
      "reasoning-animation-end",
      this.handleContentLayoutSettled,
    );
    scrollContainer?.removeEventListener(
      "code-snippet-render-end",
      this.handleContentLayoutSettled,
    );
    scrollContainer?.removeEventListener("scroll", this.handleUserScroll);
    if (this.layoutSettledRafId !== null) {
      cancelAnimationFrame(this.layoutSettledRafId);
      this.layoutSettledRafId = null;
    }
    this.doAutoScrollThrottled.cancel();
  }

  /**
   * Runs the scroll-maintenance branch for a host update (message add/remove or streaming chunk).
   *
   * @param preCommitScrollTop - The scrollTop captured before the host commit
   * (React `getSnapshotBeforeUpdate`), used for Safari scroll-anchoring restore.
   */
  onHostUpdated(preCommitScrollTop: number | null): void {
    const newItems = this.host.getMessages();
    const oldItems = this.previousMessages;
    // Advance the baseline immediately so nested async work reads the latest state.
    this.previousMessages = newItems;

    // countChanged means a new message, itemsChanged means an actual message item changed (streaming, likely)
    const { countChanged, itemsChanged } = getMessageArrayChangeFlags({
      oldItems,
      newItems,
    });

    // No structural or reference change means no scroll maintenance needed.
    if (!countChanged && !itemsChanged) {
      return;
    }

    this.host.onScrollGeometryChanged();

    // Update observed messages when the message array changes
    if (itemsChanged) {
      this.updateObservedMessages();
    }

    if (countChanged) {
      this.handleCountChanged();
      return;
    }

    // Array reference changed but count is the same. In this codebase, that means
    // in-place evolution (typically streaming chunks or item-level state updates).
    // Only perform spacer maintenance if we have a pinned message.
    if (!this.pinnedMessageId) {
      return;
    }

    const { isCurrentlyStreaming, wasStreaming } = getStreamingTransition({
      oldItems,
      newItems,
    });

    if (isCurrentlyStreaming) {
      this.handleStreamingUpdate(preCommitScrollTop);
    } else if (wasStreaming) {
      this.handleStreamEndUpdate(preCommitScrollTop);
    }
  }

  /**
   * Runs internal auto-scroll to ensure proper scrolling behavior when the container resizes.
   * (Was the scroll work inside `MessagesComponent.onResize`.)
   */
  onContainerResize = throttle(
    () => {
      // Resize can invalidate both "scroll down" visibility and pin geometry.
      this.host.onScrollGeometryChanged();
      this.doAutoScrollInternal();
    },
    WINDOW_RESIZE_THROTTLE_MS,
    { leading: true, trailing: true },
  );

  // --------------------------------------------------------------------------
  // Observed-message maintenance
  // --------------------------------------------------------------------------

  /**
   * Updates which message elements are being observed by the messageResizeObserver.
   * Called when messages are added, removed, or the message array changes.
   *
   * Observes ALL messages including streaming ones. ResizeObserver handles
   * both streaming content growth and animated size changes (like reasoning steps
   * collapsing) smoothly without manual timing intervention.
   */
  private updateObservedMessages(): void {
    if (!this.messageResizeObserverState) {
      return;
    }

    // Get all current message elements (including streaming messages)
    const messageElements: HTMLElement[] = [];
    this.host.getMessages().forEach((message) => {
      const element = message.element;
      if (element) {
        messageElements.push(element);
      }
    });

    // Update observations using utility function
    updateObservedMessages(this.messageResizeObserverState, messageElements);
  }

  // --------------------------------------------------------------------------
  // Pin / spacer execution
  // --------------------------------------------------------------------------

  private getPinnedElement(): HTMLElement | null {
    if (!this.pinnedMessageId) {
      return null;
    }
    return (
      this.host
        .getMessages()
        .find((message) => message.id === this.pinnedMessageId)?.element ?? null
    );
  }

  /**
   * Pin a message to the top of the visible scroll area and scroll to it instantly.
   * Runs synchronously inside a requestAnimationFrame — must only be called from within one.
   */
  private executePinAndScroll(
    message: PortableMessage,
    scrollElement: HTMLElement,
  ): void {
    const result = pinMessageAndScroll({
      message,
      scrollElement,
      spacerElem: this.host.getSpacer(),
      setSpacerHeight: (px) => this.host.setSpacerHeight(px),
    });
    if (!result) {
      return;
    }

    // Keep controller-level tracking aligned with the DOM writes performed above.
    this.domSpacerHeight = result.currentSpacerHeight;
    this.pinnedMessageId = result.pinnedMessageId;
    this.pinnedScrollTop = result.scrollTop;

    // Establishing a pin re-engages auto-scroll: a newly pinned message resets any prior
    // scroll-away. (The re-pin restore paths are gated on this flag, so they only reach here
    // when it is already false — this reset matters for pinning a genuinely new message.)
    this.userScrolledAwayFromPin = false;

    debugAutoScroll(
      `[autoScroll] Pinned message, scrollTop=${result.scrollTop}, spacer=${result.currentSpacerHeight}px`,
    );
  }

  /**
   * Waits for nested markdown component to finish rendering before measuring
   * the message for pinning and scrolling.
   */
  private async waitForMessageComponentLayout(
    message: PortableMessage,
  ): Promise<void> {
    const targetElem = message?.element;
    if (!targetElem) {
      return;
    }

    const markdownElement = targetElem.querySelector(`${prefix}-markdown`) as
      (Element & { updateComplete?: Promise<unknown> }) | null;

    if (!markdownElement) {
      return;
    }

    await markdownElement.updateComplete?.catch((): undefined => undefined);

    await new Promise<void>((resolve): void => {
      requestAnimationFrame(() => resolve());
    });
  }

  /**
   * Recalculate the spacer height for the currently pinned message without touching scrollTop.
   * Used when content below the pin changes (resize, non-streaming response, streaming done).
   * Runs synchronously inside a requestAnimationFrame — must only be called from within one.
   */
  private executeRecalculateSpacer(scrollElement: HTMLElement): void {
    const result = recalculatePinnedMessageSpacer({
      pinnedElement: this.getPinnedElement(),
      scrollElement,
      spacerElem: this.host.getSpacer(),
      setSpacerHeight: (px) => this.host.setSpacerHeight(px),
    });
    if (result === null) {
      return;
    }
    this.domSpacerHeight = result.deficit;
  }

  /**
   * Handles a content-layout-settled event (`reasoning-animation-end` from reasoning
   * collapse/expand, or `code-snippet-render-end` after a code block's async render). Several
   * can settle in the same tick, so we coalesce to a single reconciliation on the next frame.
   */
  /**
   * `scroll` listener that latches whether the user has deliberately scrolled away (up) from the
   * pin. Runs from a settled scroll position, so `resolveUserScrollAway` can distinguish a real
   * scroll-up (room below the current position) from a browser cap (parked at the bottom because
   * content shrank). Once latched, mid-animation geometry dips can't flip it, so the restore
   * paths stay disengaged until the user returns toward the pin or a new message is pinned.
   */
  private handleUserScroll = (): void => {
    const scrollElement = this.host.getScrollContainer();
    if (!scrollElement || !this.pinnedMessageId) {
      return;
    }
    const decision = resolveUserScrollAway({
      scrollTop: scrollElement.scrollTop,
      pinnedScrollTop: this.pinnedScrollTop,
      maxScrollTop: scrollElement.scrollHeight - scrollElement.clientHeight,
      thresholdPx: USER_SCROLL_AWAY_THRESHOLD_PX,
    });
    if (decision !== null) {
      this.userScrolledAwayFromPin = decision;
    }
  };

  /**
   * Reserve spacer space BEFORE an announced collapse removes content (`reasoning-animation-start`,
   * dispatched while the collapsing element is still at full height).
   *
   * The grow-only spacer is otherwise purely reactive: the ResizeObserver and the settle event
   * both fire *after* layout, so an instant collapse drops `scrollHeight` below
   * `pinnedScrollTop + clientHeight` for one frame. The browser caps `scrollTop`, the viewport
   * visibly jumps to the top, and the next frame restores it — a two-frame flash. Projecting the
   * post-collapse geometry and growing the spacer now keeps `pinnedScrollTop` reachable
   * throughout, so no cap ever happens and the collapse reflows exactly once.
   */
  private handleContentLayoutWillShrink = (): void => {
    const scrollElement = this.host.getScrollContainer();
    const spacerElem = this.host.getSpacer();
    if (!scrollElement || !spacerElem || !this.pinnedMessageId) {
      return;
    }

    // The collapse styles have already applied (the event is dispatched from
    // `attributeChangedCallback`), so this measures the POST-collapse layout. What matters is
    // that we run now, in the same task, rather than from the ResizeObserver, which fires only
    // after layout AND paint.
    //
    // Derive the true content height from the spacer's offset rather than `scrollHeight`
    // (floored at `clientHeight`, so it under-reports once content falls below the viewport),
    // and size against `pinnedScrollTop` rather than the live `scrollTop` (which the browser
    // may already have capped). Grow-only: never shrink here, the settle pass trims.
    const scrollerRect = scrollElement.getBoundingClientRect();
    const spacerRect = spacerElem.getBoundingClientRect();
    const contentHeightWithoutSpacer =
      spacerRect.top - scrollerRect.top + scrollElement.scrollTop;
    const requiredSpacerHeight = Math.max(
      0,
      Math.ceil(
        this.pinnedScrollTop +
          scrollElement.clientHeight -
          contentHeightWithoutSpacer,
      ),
    );
    if (requiredSpacerHeight > this.domSpacerHeight) {
      this.domSpacerHeight = requiredSpacerHeight;
      this.host.setSpacerHeight(this.domSpacerHeight);
    }

    // Forcing layout above may have let the browser cap scrollTop against the briefly-shorter
    // content. The spacer is restored now, so put the pin back in the same task; because no
    // paint has happened in between, the user never sees the intermediate position.
    if (
      !this.userScrolledAwayFromPin &&
      scrollElement.scrollTop < this.pinnedScrollTop
    ) {
      scrollElement.scrollTop = this.pinnedScrollTop;
    }
  };

  private handleContentLayoutSettled = (): void => {
    if (this.layoutSettledRafId !== null) {
      return;
    }
    this.layoutSettledRafId = requestAnimationFrame(() => {
      this.layoutSettledRafId = null;
      this.reconcileSpacerAfterLayoutSettled();
    });
  };

  /**
   * Re-establishes the pinned message's position after a content-layout change settles
   * (reasoning collapse/expand, or a code block finishing its async render). Because the
   * animation/render has ended, the layout is final and can be measured directly. When the
   * user is still at the pin — or was pushed above it because a shrink capped scrollTop — we
   * re-pin so the message stays flush to the top. Otherwise we only ensure the spacer keeps
   * the user's current position reachable.
   *
   * Runs inside a requestAnimationFrame (scheduled by handleContentLayoutSettled).
   */
  private reconcileSpacerAfterLayoutSettled(): void {
    const scrollElement = this.host.getScrollContainer();
    const pinnedElement = this.getPinnedElement();
    if (!scrollElement || !pinnedElement) {
      return;
    }

    // A deliberate scroll-away disengages re-pinning: keep the spacer correct but leave the
    // user's position alone.
    if (this.userScrolledAwayFromPin) {
      this.executeRecalculateSpacer(scrollElement);
      return;
    }

    const streamEndAction = resolveStreamEndAction({
      nearPinThresholdPx: STREAM_END_NEAR_PIN_THRESHOLD_PX,
      pinnedScrollTop: this.pinnedScrollTop,
      scrollTop: scrollElement.scrollTop,
      maxScrollTop: scrollElement.scrollHeight - scrollElement.clientHeight,
    });

    if (streamEndAction === "re_pin_and_scroll") {
      this.executePinAndScroll(
        {
          id: this.pinnedMessageId as string,
          element: pinnedElement,
        } as PortableMessage,
        scrollElement,
      );
    } else {
      this.executeRecalculateSpacer(scrollElement);
    }
  }

  private async executeResolvedAutoScrollAction(
    options: ScrollOptions,
    scrollElement: HTMLElement,
  ): Promise<void> {
    const messages = this.host.getMessages();
    const action = resolveAutoScrollAction({
      messages,
      options,
      pinnedMessageId: this.pinnedMessageId,
      scrollElement,
    });

    switch (action.type) {
      case "scroll_to_top":
        doScrollElement(scrollElement, action.scrollTop, 0);
        return;
      case "scroll_to_bottom": {
        // During streaming `scrollHeight` includes the blank spacer, so
        // `scrollHeight - offsetHeight` points into blank spacer territory.
        // Subtract domSpacerHeight to land at the bottom of real content.
        const isStreaming = messages.some((message) => message.isStreaming);
        const scrollTop = isStreaming
          ? Math.max(0, action.scrollTop - this.domSpacerHeight)
          : action.scrollTop;
        doScrollElement(
          scrollElement,
          scrollTop,
          0,
          action.preferAnimate && !isStreaming,
        );
        return;
      }
      case "reset_to_top":
        // No messages — scroll to top so the browser doesn't restore a stale position.
        scrollElement.scrollTop = 0;
        return;
      case "pin_message":
        await this.waitForMessageComponentLayout(action.message);
        if (!scrollElement.isConnected) {
          return;
        }
        this.executePinAndScroll(action.message, scrollElement);
        return;
      case "recalculate_spacer":
        this.executeRecalculateSpacer(scrollElement);
        return;
      default:
        return;
    }
  }

  private reconcileSpacerAfterPublicDoAutoScroll(
    scrollElement: HTMLElement,
  ): void {
    const reconciliationAction = resolvePublicSpacerReconciliationAction({
      pinnedMessageId: this.pinnedMessageId,
    });
    if (reconciliationAction.type === "noop") {
      return;
    }

    const savedScrollTop = scrollElement.scrollTop;
    this.executeRecalculateSpacer(scrollElement);
    if (scrollElement.scrollTop < savedScrollTop) {
      scrollElement.scrollTop = savedScrollTop;
    }
    this.host.onScrollGeometryChanged();
  }

  /**
   * Handles updates when the message count changes (messages added or removed).
   *
   * 1. Re-runs the auto-scroll policy to pin a new target or maintain the current pin
   * 2. Checks for new non-streaming responses that may need deferred spacer recalculation
   * 3. Schedules a throttled recalculation if needed
   */
  private handleCountChanged(): void {
    // Message list length changed (add/remove). Re-run auto-scroll policy so we either
    // pin a new target, maintain the current pin, or reset for empty state.
    this.doAutoScrollInternal();

    // For non-streaming MessageResponse items added via addMessage(), the initial pin
    // calculation may occur before response content is fully rendered, resulting in an
    // oversized spacer. Schedule a deferred recalculation to correct the spacer after
    // layout settles. Only do this for responses, as requests are the pinned targets
    // themselves and don't affect spacer calculation the same way.
    const hasNewResponse = hasNewNonStreamingResponse(this.host.getMessages());

    if (hasNewResponse) {
      // Use the same throttled approach as streaming to recalculate after content settles.
      // This is more reliable than trying to time rAF perfectly.
      this.doAutoScrollThrottled();
    }
  }

  /**
   * Handles scroll position maintenance during active streaming.
   *
   * Safari's scroll anchoring can decrease scrollTop during streaming updates.
   * This method applies a fix to restore the user's intended scroll position.
   */
  private handleStreamingUpdate(snapshot: number | null): void {
    // Prevent Safari's scroll anchoring from decreasing scrollTop during streaming.
    const el = this.host.getScrollContainer();
    if (!el) {
      return;
    }

    const restoreTarget = applySafariScrollAnchoringRestore(
      el.scrollTop,
      snapshot,
    );

    if (restoreTarget !== null) {
      el.scrollTop = restoreTarget;
    }
  }

  /**
   * Handles the transition when streaming completes.
   *
   * 1. Applies Safari scroll anchoring fix for the final stream commit
   * 2. Schedules a requestAnimationFrame to determine the final scroll action
   * 3. Either re-pins and scrolls to the message, or preserves the user's position
   */
  private handleStreamEndUpdate(snapshot: number | null): void {
    // Safari fires scroll anchoring during the final stream commit (same as mid-stream
    // commits). Apply the directional restore here too so the rAF's position check sees
    // the user's actual scrollTop, not the anchoring-adjusted one.
    const scrollElement = this.host.getScrollContainer();
    if (!scrollElement) {
      return;
    }

    const restoreTarget = applySafariScrollAnchoringRestore(
      scrollElement.scrollTop,
      snapshot,
    );

    if (restoreTarget !== null) {
      scrollElement.scrollTop = restoreTarget;
    }

    // Schedule the stream-end scroll action
    this.executeStreamEndScrollAction(snapshot);
  }

  /**
   * Executes the final scroll action after streaming completes.
   *
   * This method runs in a requestAnimationFrame to ensure DOM/layout has settled.
   * It determines whether to re-pin and scroll to the message, or preserve the
   * user's scroll position if they scrolled away during streaming.
   */
  private executeStreamEndScrollAction(snapshot: number | null): void {
    requestAnimationFrame(() => {
      const scrollElement = this.host.getScrollContainer();
      const pinnedElement = this.getPinnedElement();
      if (!scrollElement || !pinnedElement) {
        return;
      }

      // Use the pre-commit snapshot as the stream-end decision baseline. Safari can
      // adjust scrollTop during the final commit (not always in one direction), and
      // using post-commit scrollTop here can misclassify "near pin" vs "away from pin".
      const scrollTopForDecision = snapshot ?? scrollElement.scrollTop;

      // A deliberate scroll-away disengages the stream-end re-pin as well.
      const streamEndAction: StreamEndAction = this.userScrolledAwayFromPin
        ? "recalculate_and_preserve_scroll"
        : resolveStreamEndAction({
            nearPinThresholdPx: STREAM_END_NEAR_PIN_THRESHOLD_PX,
            pinnedScrollTop: this.pinnedScrollTop,
            scrollTop: scrollTopForDecision,
            maxScrollTop:
              scrollElement.scrollHeight - scrollElement.clientHeight,
          });

      if (streamEndAction === "re_pin_and_scroll") {
        this.executePinAndScroll(
          {
            id: this.pinnedMessageId as string,
            element: pinnedElement,
          } as PortableMessage,
          scrollElement,
        );
      } else {
        // Preserve the user's pre-commit position when they are away from pin.
        // Zero the spacer directly.
        const savedScrollTop = scrollTopForDecision;
        const spacerElem = this.host.getSpacer();
        if (spacerElem) {
          this.host.setSpacerHeight(0);
        }
        this.domSpacerHeight = 0;
        if (scrollElement.scrollTop < savedScrollTop) {
          scrollElement.scrollTop = savedScrollTop;
        }
      }
    });
  }

  private scheduleAutoScroll = (
    options: ScrollOptions = {},
    includePublicSpacerReconciliation = false,
  ): void => {
    requestAnimationFrame(() => {
      void (async () => {
        // Execute after DOM/layout settles for the current frame so measurements
        // (scrollHeight, rects) match what the user can actually see.
        const scrollElement = this.host.getScrollContainer();
        if (!scrollElement) {
          return;
        }

        await this.executeResolvedAutoScrollAction(options, scrollElement);
        if (includePublicSpacerReconciliation) {
          this.reconcileSpacerAfterPublicDoAutoScroll(scrollElement);
        }
      })();
    });
  };

  /**
   * Internal auto-scroll path used by the host lifecycle and internal handlers
   * (e.g. the scroll-to-bottom button). Does not run the public spacer-reconciliation pass.
   */
  doAutoScrollInternal = (options: ScrollOptions = {}): void => {
    try {
      this.scheduleAutoScroll(options, false);
    } catch (error) {
      // Just ignore any errors. It's not the end of the world if scrolling doesn't work for any reason.
      // eslint-disable-next-line no-console
      console.error("An error occurred while attempting to scroll.", error);
    }
  };

  /**
   * Public auto-scroll entry point exposed through ChatInstance/AppShell.
   * In addition to normal auto-scroll resolution, this always runs a spacer
   * reconciliation pass so external callers get up-to-date pin/spacer geometry.
   */
  doAutoScroll = (options: ScrollOptions = {}): void => {
    try {
      this.scheduleAutoScroll(options, true);
    } catch (error) {
      // Just ignore any errors. It's not the end of the world if scrolling doesn't work for any reason.
      // eslint-disable-next-line no-console
      console.error("An error occurred while attempting to scroll.", error);
    }
  };

  /**
   * Throttled auto-scroll method for automatic scroll operations (e.g., message updates).
   * This is throttled to prevent excessive scrolling during rapid updates.
   */
  private doAutoScrollThrottled = throttle(
    this.doAutoScrollInternal,
    AUTO_SCROLL_THROTTLE_MS,
    { leading: true, trailing: true },
  );

  /**
   * Returns the current scrollBottom value for the message scroll panel.
   */
  getContainerScrollBottom = (): number => {
    return getScrollBottom(this.host.getScrollContainer());
  };

  /**
   * Scrolls the given element into view so that it is fully visible. If the element is already visible, then no
   * scrolling will be done.
   *
   * @param element The element to scroll into view.
   * @param paddingTop An additional pixel value that will over scroll by this amount to give a little padding between
   * the element and the top of the scroll area.
   * @param paddingBottom An additional pixel value that will over scroll by this amount to give a little padding
   * between the element and the top of the scroll area.
   * @param animate Prefer animation
   */
  scrollElementIntoView = (
    element: HTMLElement,
    paddingTop = 8,
    paddingBottom = 8,
    animate = false,
  ): void => {
    const scrollElement = this.host.getScrollContainer();

    if (!scrollElement) {
      return;
    }

    const scrollRect = scrollElement.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // The distance the top and bottom of the element is from the top of the message list.
    const topDistanceFromTop =
      elementRect.top - scrollRect.top + scrollElement.scrollTop - paddingTop;
    const bottomDistanceFromTop =
      elementRect.bottom -
      scrollRect.top +
      scrollElement.scrollTop +
      paddingBottom;
    const elementHeight = element.offsetHeight + paddingTop + paddingBottom;

    if (
      topDistanceFromTop < scrollElement.scrollTop ||
      elementHeight > scrollElement.offsetHeight
    ) {
      // The top of the element is above the fold or the element doesn't fully fit. Scroll it so its top is at the top
      // of the scroll panel.
      doScrollElement(scrollElement, topDistanceFromTop, 0);
    } else if (
      bottomDistanceFromTop >
      scrollElement.scrollTop + scrollElement.offsetHeight
    ) {
      // The bottom of the element is below the fold. Scroll it so its bottom is at the bottom of the scroll panel.
      doScrollElement(
        scrollElement,
        bottomDistanceFromTop - scrollElement.offsetHeight,
        0,
        animate,
      );
    }
  };

  /**
   * Scrolls to the message with the given id. The `element` for that id is measured directly.
   *
   * @param messageElement The element of the message to scroll to.
   * @param animate Whether or not the scroll should be animated. Defaults to false.
   */
  doScrollToMessageElement(
    messageElement: HTMLElement | null,
    animate = false,
  ): void {
    try {
      if (messageElement) {
        const scrollElement = this.host.getScrollContainer();

        if (!scrollElement) {
          return;
        }

        // Scroll to the top of the message.
        const setScrollTop = messageElement.offsetTop;

        // Do the scrolling.
        doScrollElement(scrollElement, setScrollTop, 0, animate);
      }
    } catch (error) {
      // Just ignore any errors. It's not the end of the world if scrolling doesn't work for any reason.
      // eslint-disable-next-line no-console
      console.error("An error occurred while attempting to scroll.", error);
    }
  }

  /**
   * Calculates if there are any messages at the bottom out of the scroll view of the container.
   * The result determines if the user should be told if they need to scroll down to view more
   * messages or not. (Was `checkMessagesOutOfView`.)
   */
  isScrolledAwayFromBottom(): boolean {
    const scrollElement = this.host.getScrollContainer();

    if (!scrollElement) {
      return false;
    }

    // Subtract the real DOM spacer height to get the effective scroll height.
    // This prevents the scroll-to-bottom button from appearing for blank spacer space.
    return hasMessagesOutOfView({
      clientHeight: scrollElement.clientHeight,
      domSpacerHeight: this.domSpacerHeight,
      scrollHeight: scrollElement.scrollHeight,
      scrollTop: scrollElement.scrollTop,
      thresholdPx: SCROLL_DOWN_THRESHOLD_PX,
    });
  }
}

// ============================================================================
// Exported pure helpers
// ----------------------------------------------------------------------------
// These are the controller's decision/math mechanics. The single
// `MessagesScrollController` class is the sole owner of scroll state; exporting
// these stateless helpers keeps them independently unit-testable (they are NOT a
// "second brain"). Signatures are adapted to the `PortableMessage`-based model.
// ============================================================================

export {
  adjustScrollTopForTallMessage,
  applySafariScrollAnchoringRestore,
  calculateBaseScrollTop,
  calculateSpacerDeficit,
  cleanupMessageResizeObserver,
  computeGrowOnlySpacerHeight,
  createMessageResizeObserver,
  findLastPinnable,
  getAnchoringRestoreTarget,
  getMessageArrayChangeFlags,
  getStreamingTransition,
  hasActiveStreaming,
  hasMessagesOutOfView,
  hasNewNonStreamingResponse,
  pinMessageAndScroll,
  recalculatePinnedMessageSpacer,
  resolveAutoScrollAction,
  resolvePublicSpacerReconciliationAction,
  resolveStreamEndAction,
  resolveUserScrollAway,
  updateObservedMessages,
  type AutoScrollAction,
  type MessageResizeObserverState,
  type StreamEndAction,
};

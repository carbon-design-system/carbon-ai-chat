/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import throttle from "lodash-es/throttle.js";
import React, { Fragment, PureComponent, ReactNode } from "react";
import { useSelector } from "../hooks/useSelector";
import DownToBottom16 from "@carbon/icons/es/down-to-bottom/16.js";
import { HumanAgentBannerContainer } from "./humanAgent/HumanAgentBannerContainer";
import LatestWelcomeNodes from "./LatestWelcomeNodes";
import { MessagesScrollHandle } from "./MessagesScrollHandle";
import { MessagesScrollToBottomButton } from "./MessagesScrollToBottomButton";
import { MessagesTypingIndicator } from "./MessagesTypingIndicator";
import { MessagesView } from "./MessagesView";
import { SystemMessage } from "./SystemMessage";
import {
  HasServiceManager,
  withServiceManager,
} from "../hocs/withServiceManager";
import {
  selectHumanAgentDisplayState,
  selectInputState,
} from "../store/selectors";
import { AppState, ChatMessagesState } from "../../types/state/AppState";
import { shallowEqual } from "../store/appStore";
import { AutoScrollOptions } from "../../types/utilities/HasDoAutoScroll";
import HasIntl from "../../types/utilities/HasIntl";
import { HasRequestFocus } from "../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import { IS_MOBILE } from "../utils/browserUtils";
import { WriteableElementName } from "../utils/constants";
import { doScrollElement, getScrollBottom } from "../utils/domUtils";
import { formatShortcutForDisplay } from "../utils/keyboardUtils";
import { arrayLastValue } from "../utils/lang/arrayUtils";
import { isResponse, getMessageIDForUserInput } from "../utils/messageUtils";
import { DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT } from "../../types/config/ShortcutConfig";
import {
  applySafariScrollAnchoringRestore,
  cleanupMessageResizeObserver,
  createMessageResizeObserver,
  getMessageArrayChangeFlags,
  getStreamingTransition,
  hasMessagesOutOfView,
  hasNewNonStreamingResponse,
  pinMessageAndScroll,
  recalculatePinnedMessageSpacer,
  resolveAutoScrollAction,
  resolvePublicSpacerReconciliationAction,
  resolveStreamEndAction,
  updateObservedMessages as updateObservedMessagesUtil,
  type MessageResizeObserverState,
} from "../utils/messagesAutoScrollController";
import { buildRenderableMessageMetadata } from "../utils/messagesRenderUtils";
import { consoleError, debugLog } from "../utils/miscUtils";
import MessageComponent, {
  MessageClass,
  MoveFocusType,
} from "./MessageComponent";
import { Message } from "../../types/messaging/Messages";
import { LanguagePack } from "../../types/config/PublicConfig";
import { CarbonTheme } from "../../types/config/PublicConfig";
import { carbonIconToReact } from "../utils/carbonIcon";

const DownToBottom = carbonIconToReact(DownToBottom16);

const DEBUG_AUTO_SCROLL = false;
const STREAM_END_NEAR_PIN_THRESHOLD_PX = 60;
const SCROLL_DOWN_THRESHOLD_PX = 60;

/**
 * Throttle timeouts for different auto-scroll operations.
 * Each has different performance requirements based on its purpose.
 */

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
 * Scroll notification UI throttle - updates the "scroll to bottom" button visibility.
 * Visual indicator update doesn't need to be frame-perfect.
 */
const SCROLL_NOTIFICATION_THROTTLE_MS = 200;

/**
 * The type of the function used for scrolling elements inside the scroll panel into view.
 */
type ScrollElementIntoViewFunction = (
  element: HTMLElement,
  paddingTop?: number,
  paddingBottom?: number,
) => void;

interface MessagesOwnProps extends HasIntl, HasServiceManager {
  /**
   * The message state for this list of messages.
   */
  messageState: ChatMessagesState;

  /**
   * The specific list of messages to display in this chat window.
   */
  localMessageItems: LocalMessageItem[];

  /**
   * A callback function that will request that focus be moved to the main input field.
   */
  requestInputFocus: () => void;

  /**
   * The name of the assistant.
   */
  assistantName: string;

  /**
   * The URL pointing to an avatar image for the assistant.
   */
  assistantAvatarUrl: string;

  /**
   * The callback that is called when the user clicks the "end agent chat" button.
   */
  onEndHumanAgentChat: () => void;

  /**
   * The current locale.
   */
  locale: string;

  /**
   * Indicates if the AI theme should be used.
   */
  useAITheme: boolean;

  /**
   * Indicates which CarbonTheme is in use.
   */
  carbonTheme: CarbonTheme;
}

/**
 * Only the AppState slices that MessagesComponent actually reads.
 * Keeping this narrow avoids re-renders caused by unrelated state changes.
 */
interface MessagesInjectedState {
  config: AppState["config"];
  allMessagesByID: AppState["allMessagesByID"];
  humanAgentState: AppState["humanAgentState"];
  persistedToBrowserStorage: AppState["persistedToBrowserStorage"];
  assistantInputState: AppState["assistantInputState"];
}

interface MessagesProps extends MessagesOwnProps, MessagesInjectedState {}

interface MessagesState {
  /**
   * Indicates if the scroll handle has focus. This will be used to display the focus indicator on the actual scroll
   * panel.
   */
  scrollHandleHasFocus: boolean;
  /**
   * Indicates if there are messages below where the scroll bar currently is set.
   */
  scrollDown: boolean;
}

/**
 * MessagesComponent orchestrates three concerns:
 * 1) message rendering and focus navigation
 * 2) auto-scroll lifecycle integration
 * 3) bridge methods consumed by external callers via ref (ChatInstance/AppShell)
 *
 * Auto-scroll model:
 * - A qualifying message is "pinned" near the top of the viewport.
 * - A bottom spacer is grown/shrunk so that pin position is reachable/stable as content changes.
 * - Streaming updates consume spacer progressively; when streaming ends we recalculate from scratch.
 */
class MessagesComponent extends PureComponent<MessagesProps, MessagesState> {
  /**
   * Default state.
   */
  public readonly state: Readonly<MessagesState> = {
    scrollHandleHasFocus: false,
    scrollDown: false,
  };

  /**
   * The observer used to monitor for changes in the scroll panel size.
   */
  private scrollPanelObserver: ResizeObserver;

  /**
   * State for the message resize observer that detects async content loading.
   * This detects when async content (images, audio, video, user-defined) loads
   * and changes the message height, allowing us to recalculate the spacer.
   */
  private messageResizeObserverState: MessageResizeObserverState | null = null;

  /**
   * A registry of references to the child {@link MessageComponent} instances. The keys of the map are the IDs of
   * each message item and the value is the ref to the component.
   */
  private messageRefs: Map<string, MessageClass> = new Map();

  /**
   * A ref to the scrollable container that contains the messages.
   */
  public messagesContainerWithScrollingRef = React.createRef<HTMLDivElement>();

  /**
   * A ref to the top scroll handle button.
   */
  public scrollHandleTopRef = React.createRef<HTMLButtonElement>();

  /**
   * A ref to the bottom scroll handle button.
   */
  public scrollHandleBottomRef = React.createRef<HTMLButtonElement>();

  /**
   * A ref to the element that acts as a handle for scrolling.
   */
  public agentBannerRef = React.createRef<HasRequestFocus>();

  /**
   * The message component most recently pinned to the top of the visible scroll area.
   * Updated when pinning/re-pinning chooses a different target.
   */
  private pinnedMessageComponent: MessageClass | null = null;

  /**
   * The scrollTop value set at the moment of the last pin. Compared against the current
   * scrollTop at stream end to detect whether the user scrolled away from the pin during
   * streaming. In the standard "message added, then chunks stream" flow, this is set before
   * stream-end handling runs, so it is a stable baseline for the near-pin/away-from-pin check.
   */
  private pinnedScrollTop = 0;

  /**
   * The spacer height that is actually written to the DOM. Used by checkMessagesOutOfView
   * to prevent the scroll-to-bottom button from appearing for blank spacer space.
   */
  private domSpacerHeight = 0;

  /**
   * Spacer element at the bottom of the messages list. We set this element's
   * min-block-size attribute in order to ensure the request message is brought to the
   * top of the chat.
   */
  private bottomSpacerRef = React.createRef<HTMLDivElement>();

  componentDidMount(): void {
    // Use requestAnimationFrame to avoid ResizeObserver loop errors
    this.scrollPanelObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this.onResize();
      });
    });
    this.scrollPanelObserver.observe(
      this.messagesContainerWithScrollingRef.current,
    );

    // Create message resize observer for async content loading and streaming size changes
    // Uses a two-layer approach:
    // 1. ResizeObserver (baseline) - Delta-based tracking for general size changes
    // 2. requestAnimationFrame loop - Activated during CSS animations for frame-by-frame compensation
    this.messageResizeObserverState = createMessageResizeObserver({
      onSignificantResize: (delta: number) => {
        // Apply delta-based spacer adjustment to maintain visual position when content size changes.
        // Delta is positive when content grows, negative when it shrinks.
        // The spacer must adjust by the inverse: when content grows, spacer shrinks (and vice versa).
        const scrollElement = this.messagesContainerWithScrollingRef.current;
        const spacerElem = this.bottomSpacerRef.current;

        if (scrollElement && spacerElem && this.pinnedMessageComponent) {
          // Detect if scrollTop was capped by the browser due to scrollHeight reduction.
          // When content shrinks significantly (e.g., large reasoning trace collapse) and
          // scrollHeight drops below pinnedScrollTop + clientHeight, the browser caps
          // scrollTop to scrollHeight - clientHeight. This looks like the user scrolled
          // away but is actually browser-initiated.
          const maxScrollTop =
            scrollElement.scrollHeight - scrollElement.clientHeight;
          const wasBrowserCapped =
            scrollElement.scrollTop >= maxScrollTop - 2 &&
            scrollElement.scrollTop < this.pinnedScrollTop;

          // Always adjust spacer — keeps scrollHeight stable regardless of scroll position.
          // Inverse delta: content grows (+delta) → spacer shrinks (-delta)
          //                content shrinks (-delta) → spacer grows (+delta)
          this.domSpacerHeight = Math.max(0, this.domSpacerHeight - delta);
          spacerElem.style.minBlockSize = `${this.domSpacerHeight}px`;

          // Restore scrollTop if user is near the pin, or if browser capped scrollTop.
          const scrollDelta = Math.abs(
            scrollElement.scrollTop - this.pinnedScrollTop,
          );
          const hasScrolledAway = scrollDelta > 50;
          if (!hasScrolledAway || wasBrowserCapped) {
            scrollElement.scrollTop = this.pinnedScrollTop;
          }
        }
      },
      hasPinnedMessage: () => {
        return this.pinnedMessageComponent !== null;
      },
      significantChangeThreshold: 2, // Low threshold to catch reasoning step animations
    });

    // Start observing current messages
    this.updateObservedMessages();
  }

  /**
   * Captures scrollTop immediately before React commits DOM changes. Used by
   * componentDidUpdate to detect and cancel browser-initiated scrollTop adjustments
   * (Safari scroll anchoring) that occur synchronously during layout.
   */
  getSnapshotBeforeUpdate(
    _prevProps: MessagesProps,
    _prevState: MessagesState,
  ): number | null {
    const el = this.messagesContainerWithScrollingRef.current;
    return el ? el.scrollTop : null;
  }

  componentDidUpdate(
    oldProps: MessagesProps,
    _prevState: MessagesState,
    snapshot: number | null,
  ): void {
    const newItems = this.props.localMessageItems;
    const oldItems = oldProps.localMessageItems;

    // countChanged means a new message, itemsChanged means an actual message item changed (streaming, likely)
    const { countChanged, itemsChanged } = getMessageArrayChangeFlags({
      oldItems,
      newItems,
    });

    // No structural or reference change means no scroll maintenance needed.
    if (!countChanged && !itemsChanged) {
      return;
    }

    this.renderScrollDownNotification();

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
    if (!this.pinnedMessageComponent) {
      return;
    }

    const { isCurrentlyStreaming, wasStreaming } = getStreamingTransition({
      oldItems,
      newItems,
    });

    if (isCurrentlyStreaming) {
      this.handleStreamingUpdate(snapshot);
    } else if (wasStreaming) {
      this.handleStreamEndUpdate(snapshot);
    }
  }

  componentWillUnmount(): void {
    // Remove the listeners and observers we added previously.
    if (this.scrollPanelObserver) {
      this.scrollPanelObserver.disconnect();
    }
    if (this.messageResizeObserverState) {
      cleanupMessageResizeObserver(this.messageResizeObserverState);
      this.messageResizeObserverState = null;
    }
    this.doAutoScrollThrottled.cancel();
    this.renderScrollDownNotification.cancel();
  }

  /**
   * This will run internal auto-scroll to ensure proper scrolling behavior when the window is resized.
   */
  public onResize = throttle(
    () => {
      // Resize can invalidate both "scroll down" visibility and pin geometry.
      this.renderScrollDownNotification();
      this.doAutoScrollInternal();
    },
    WINDOW_RESIZE_THROTTLE_MS,
    { leading: true, trailing: true },
  );

  /**
   * Updates which message elements are being observed by the messageResizeObserver.
   * Called when messages are added, removed, or the message array changes.
   *
   * Now observes ALL messages including streaming ones. ResizeObserver handles
   * both streaming content growth and animated size changes (like reasoning steps
   * collapsing) smoothly without manual timing intervention.
   */
  private updateObservedMessages(): void {
    if (!this.messageResizeObserverState) {
      return;
    }

    // Get all current message elements (including streaming messages)
    const messageElements: HTMLElement[] = [];
    this.messageRefs.forEach((messageComponent) => {
      const element = messageComponent.ref?.current;
      if (element) {
        messageElements.push(element);
      }
    });

    // Update observations using utility function
    updateObservedMessagesUtil(
      this.messageResizeObserverState,
      messageElements,
    );
  }

  /**
   * Pin a message to the top of the visible scroll area and scroll to it instantly.
   * Runs synchronously inside a requestAnimationFrame — must only be called from within one.
   *
   * @param messageComponent - The MessageClass instance to pin
   * @param scrollElement - The scrollable container element
   */
  /**
   * Starts observing the streaming message for DOM mutations. Called when streaming begins.
   * Only starts observing once reasoning steps are complete and actual content is streaming.
   * This avoids jumps from reasoning step animations.
   */

  private executePinAndScroll(
    messageComponent: MessageClass,
    scrollElement: HTMLElement,
  ): void {
    const result = pinMessageAndScroll({
      messageComponent,
      scrollElement,
      spacerElem: this.bottomSpacerRef.current,
    });
    if (!result) {
      return;
    }

    // Keep component-level tracking aligned with the DOM writes performed by the controller.
    this.domSpacerHeight = result.currentSpacerHeight;
    this.pinnedMessageComponent = result.pinnedMessageComponent;
    this.pinnedScrollTop = result.scrollTop;

    debugAutoScroll(
      `[autoScroll] Pinned message, scrollTop=${result.scrollTop}, spacer=${result.currentSpacerHeight}px`,
    );
  }

  /**
   * Recalculate the spacer height for the currently pinned message without touching scrollTop.
   * Used when content below the pin changes (resize, non-streaming response, streaming done).
   * Runs synchronously inside a requestAnimationFrame — must only be called from within one.
   *
   * @param scrollElement - The scrollable container element
   */
  private executeRecalculateSpacer(scrollElement: HTMLElement): void {
    const result = recalculatePinnedMessageSpacer({
      pinnedMessageComponent: this.pinnedMessageComponent,
      scrollElement,
      spacerElem: this.bottomSpacerRef.current,
    });
    if (result === null) {
      return;
    }
    this.domSpacerHeight = result.deficit;
  }

  private executeResolvedAutoScrollAction(
    options: AutoScrollOptions,
    scrollElement: HTMLElement,
  ): void {
    const action = resolveAutoScrollAction({
      allMessagesByID: this.props.allMessagesByID,
      localMessageItems: this.props.localMessageItems,
      messageRefs: this.messageRefs,
      options,
      pinnedMessageComponent: this.pinnedMessageComponent,
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
        const isStreaming = this.props.localMessageItems.some(
          (item) =>
            item.ui_state.streamingState &&
            !item.ui_state.streamingState.isDone,
        );
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
        this.executePinAndScroll(action.messageComponent, scrollElement);
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
      pinnedMessageComponent: this.pinnedMessageComponent,
    });
    if (reconciliationAction.type === "noop") {
      return;
    }

    const savedScrollTop = scrollElement.scrollTop;
    this.executeRecalculateSpacer(scrollElement);
    if (scrollElement.scrollTop < savedScrollTop) {
      scrollElement.scrollTop = savedScrollTop;
    }
    this.renderScrollDownNotification();
  }

  /**
   * Handles updates when the message count changes (messages added or removed).
   *
   * This method:
   * 1. Re-runs the auto-scroll policy to pin a new target or maintain the current pin
   * 2. Checks for new non-streaming responses that may need deferred spacer recalculation
   * 3. Schedules a throttled recalculation if needed
   *
   * @private
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
    const hasNewResponse = hasNewNonStreamingResponse(
      this.props.localMessageItems,
      this.props.allMessagesByID,
    );

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
   *
   * Note: ResizeObserver handles all size changes during streaming, including
   * reasoning steps collapsing with CSS animations. The observer fires continuously
   * during transitions, keeping the spacer synchronized.
   *
   * @param snapshot - The scroll position captured before the update
   * @private
   */
  private handleStreamingUpdate(snapshot: number | null): void {
    // Prevent Safari's scroll anchoring from decreasing scrollTop during streaming.
    const el = this.messagesContainerWithScrollingRef.current;
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
   * This method:
   * 1. Applies Safari scroll anchoring fix for the final stream commit
   * 2. Schedules a requestAnimationFrame to determine the final scroll action
   * 3. Either re-pins and scrolls to the message, or preserves the user's position
   *
   * @param snapshot - The scroll position captured before the update
   * @private
   */
  private handleStreamEndUpdate(snapshot: number | null): void {
    // Safari fires scroll anchoring during the final stream commit (same as mid-stream
    // commits). Apply the directional restore here too so the rAF's position check sees
    // the user's actual scrollTop, not the anchoring-adjusted one.
    const scrollElement = this.messagesContainerWithScrollingRef.current;
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
   *
   * @param snapshot - The scroll position captured before the final stream commit
   * @private
   */
  private executeStreamEndScrollAction(snapshot: number | null): void {
    requestAnimationFrame(() => {
      const scrollElement = this.messagesContainerWithScrollingRef.current;
      if (!scrollElement || !this.pinnedMessageComponent) {
        return;
      }

      // Use the pre-commit snapshot as the stream-end decision baseline. Safari can
      // adjust scrollTop during the final commit (not always in one direction), and
      // using post-commit scrollTop here can misclassify "near pin" vs "away from pin".
      const scrollTopForDecision = snapshot ?? scrollElement.scrollTop;

      const streamEndAction = resolveStreamEndAction({
        nearPinThresholdPx: STREAM_END_NEAR_PIN_THRESHOLD_PX,
        pinnedScrollTop: this.pinnedScrollTop,
        scrollTop: scrollTopForDecision,
      });

      if (streamEndAction === "re_pin_and_scroll") {
        this.executePinAndScroll(this.pinnedMessageComponent, scrollElement);
      } else {
        // Preserve the user's pre-commit position when they are away from pin.
        // Zero the spacer directly.
        const savedScrollTop = scrollTopForDecision;
        const spacerElem = this.bottomSpacerRef.current;
        if (spacerElem) {
          spacerElem.style.minBlockSize = "0px";
        }
        this.domSpacerHeight = 0;
        if (scrollElement.scrollTop < savedScrollTop) {
          scrollElement.scrollTop = savedScrollTop;
        }
      }
    });
  }

  private scheduleAutoScroll = (
    options: AutoScrollOptions = {},
    includePublicSpacerReconciliation = false,
  ) => {
    requestAnimationFrame(() => {
      // Execute after DOM/layout settles for the current frame so measurements
      // (scrollHeight, rects) match what the user can actually see.
      const scrollElement = this.messagesContainerWithScrollingRef.current;
      if (!scrollElement) {
        return;
      }

      this.executeResolvedAutoScrollAction(options, scrollElement);
      if (includePublicSpacerReconciliation) {
        this.reconcileSpacerAfterPublicDoAutoScroll(scrollElement);
      }
    });
  };

  /**
   * Internal auto-scroll path used by component lifecycle and internal handlers.
   * This preserves historical behavior and does not run the public spacer-reconciliation pass.
   */
  private doAutoScrollInternal = (options: AutoScrollOptions = {}) => {
    try {
      this.scheduleAutoScroll(options, false);
    } catch (error) {
      // Just ignore any errors. It's not the end of the world if scrolling doesn't work for any reason.
      consoleError("An error occurred while attempting to scroll.", error);
    }
  };

  /**
   * Public auto-scroll entry point exposed through ChatInstance/AppShell.
   * In addition to normal auto-scroll resolution, this always runs a spacer
   * reconciliation pass so external callers get up-to-date pin/spacer geometry.
   */
  public doAutoScroll = (options: AutoScrollOptions = {}) => {
    try {
      this.scheduleAutoScroll(options, true);
    } catch (error) {
      // Just ignore any errors. It's not the end of the world if scrolling doesn't work for any reason.
      consoleError("An error occurred while attempting to scroll.", error);
    }
  };

  /**
   * Throttled auto-scroll method for automatic scroll operations (e.g., message updates).
   * This is throttled to prevent excessive scrolling during rapid updates.
   */
  public doAutoScrollThrottled = throttle(
    this.doAutoScrollInternal,
    AUTO_SCROLL_THROTTLE_MS,
    { leading: true, trailing: true },
  );

  /**
   * Returns the current scrollBottom value for the message scroll panel.
   */
  public getContainerScrollBottom = () => {
    return getScrollBottom(this.messagesContainerWithScrollingRef?.current);
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
  public scrollElementIntoView = (
    element: HTMLElement,
    paddingTop = 8,
    paddingBottom = 8,
    animate = false,
  ) => {
    const scrollElement = this.messagesContainerWithScrollingRef.current;

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
   * Moves focus to the button in the agent header.
   */
  public requestHumanAgentBannerFocus() {
    if (this.agentBannerRef.current) {
      return this.agentBannerRef.current.requestFocus();
    }
    return false;
  }

  /**
   * Moves focus to the first item of the last message.
   * Used by keyboard shortcut to toggle between input and message list.
   */
  public requestFocusOnFirstItemOfLastMessage() {
    const { localMessageItems } = this.props;
    if (localMessageItems.length === 0) {
      return false;
    }

    // Get the last message's full ID
    const lastItem = localMessageItems[localMessageItems.length - 1];
    const lastMessageID = lastItem.fullMessageID;

    // Find the first item of that message
    const firstItemOfLastMessage = localMessageItems.find(
      (item) => item.fullMessageID === lastMessageID,
    );

    if (firstItemOfLastMessage) {
      const ref = this.messageRefs.get(firstItemOfLastMessage.ui_state.id);
      if (ref) {
        ref.requestHandleFocus();
        return true;
      }
    }
    return false;
  }

  /**
   * Scrolls to the (full) message with the given ID. Since there may be multiple message items in a given
   * message, this will scroll the first message to the top of the message window.
   *
   * @param messageID The (full) message ID to scroll to.
   * @param animate Whether or not the scroll should be animated. Defaults to false.
   */
  public doScrollToMessage(messageID: string, animate = false) {
    try {
      // Find the component that has the message we want to scroll to.
      const { localMessageItems } = this.props;
      let panelComponent: MessageClass;
      for (let index = 0; index <= localMessageItems.length; index++) {
        const messageItem = localMessageItems[index];
        if (messageItem.fullMessageID === messageID) {
          panelComponent = this.messageRefs.get(messageItem.ui_state.id);
          break;
        }
      }

      if (panelComponent) {
        const scrollElement = this.messagesContainerWithScrollingRef.current;

        if (!scrollElement) {
          return;
        }

        // Scroll to the top of the message.
        const setScrollTop = panelComponent.ref.current.offsetTop;

        // Do the scrolling.
        doScrollElement(scrollElement, setScrollTop, 0, animate);
      }
    } catch (error) {
      // Just ignore any errors. It's not the end of the world if scrolling doesn't work for any reason.
      consoleError("An error occurred while attempting to scroll.", error);
    }
  }

  /**
   * Calculates if there are any messages at the bottom out of the scroll view of the container.
   * The result determines if the user should be told if they need to scroll down to view more
   * messages or not.
   */
  public checkMessagesOutOfView() {
    const scrollElement = this.messagesContainerWithScrollingRef.current;

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

  /**
   * Updates the state after checking if there are any unread messages in the chat view
   */
  public renderScrollDownNotification = throttle(
    () => {
      const shouldRender = this.checkMessagesOutOfView();
      // Throttled to avoid setState churn during continuous scroll/stream updates.
      this.setState({
        scrollDown: shouldRender,
      });
    },
    SCROLL_NOTIFICATION_THROTTLE_MS,
    { leading: false, trailing: true },
  );

  /**
   * Get all the elements inside the lastBotMessageGroupID.
   */
  public getLastOutputMessageElements(): HTMLElement[] {
    const { localMessageItems, allMessagesByID } = this.props;
    const lastMessageItem = arrayLastValue(localMessageItems);
    const lastMessage = allMessagesByID[lastMessageItem?.fullMessageID];
    if (isResponse(lastMessage)) {
      const elements: HTMLElement[] = [];
      let hasFoundLastBotMessageGroupID = false;

      // Loop from end of messages array until we find the elements with the lastBotMessageGroupID.
      for (let index = localMessageItems.length - 1; index >= 0; index--) {
        const messageItem = localMessageItems[index];
        const componentRef = this.messageRefs.get(messageItem?.ui_state.id);
        if (componentRef) {
          const { getLocalMessage } = componentRef;
          if (getLocalMessage().fullMessageID === lastMessage.id) {
            hasFoundLastBotMessageGroupID = true;
            const element = componentRef.ref?.current;
            if (element) {
              elements.push(element);
            } else {
              // If there are no refs to the elements yet, there is nothing to do here.
              break;
            }
          } else if (hasFoundLastBotMessageGroupID) {
            break;
          }
        }
      }
      // Reverse so the older messages are first.
      return elements.reverse();
    }

    return [];
  }

  /**
   * Renders the given message.
   *
   * @param localMessage The localMessage to be processed.
   * @param fullMessage The full message to be processed.
   * @param messagesIndex The index of the message.
   * @param showBeforeWelcomeNodeElement Boolean indicating if this is the first message in the most recent welcome
   * node.
   * @param isMessageForInput Indicates if this message is part the most recent message response that allows for input.
   * @param isFirstMessageItem Indicates if this message item is the first item in a message response.
   * @param isLastMessageItem Indicates if this message item is the last item in a message response.
   * @param lastMessageID The ID of the last full message shown.
   */
  renderMessage(
    localMessage: LocalMessageItem,
    fullMessage: Message,
    messagesIndex: number,
    showBeforeWelcomeNodeElement: boolean,
    isMessageForInput: boolean,
    isFirstMessageItem: boolean,
    isLastMessageItem: boolean,
    lastMessageID: string,
  ) {
    const {
      serviceManager,
      config,
      requestInputFocus,
      persistedToBrowserStorage,
      config: {
        public: { assistantName, assistantAvatarUrl },
        derived: { languagePack },
      },
      messageState,
      carbonTheme,
      useAITheme,
    } = this.props;

    const propsAsState = this.props as unknown as AppState;
    const inputState = selectInputState(propsAsState);
    const { isHumanAgentTyping } = selectHumanAgentDisplayState(propsAsState);
    const { isMessageLoadingCounter } = messageState;
    const { disclaimersAccepted } = persistedToBrowserStorage;

    // If there is a disclaimer, messages should only be rendered once it's accepted.
    if (
      config.public.disclaimer?.isOn &&
      !disclaimersAccepted[window.location.hostname]
    ) {
      return null;
    }

    const totalMessagesWithTyping =
      this.props.localMessageItems.length +
      (isMessageLoadingCounter > 0 || isHumanAgentTyping ? 1 : 0);

    const isLastMessage = messagesIndex === totalMessagesWithTyping - 1;
    const className = cx({
      "cds-aichat--message--first-message": messagesIndex === 0,
      "cds-aichat--message--last-message": isLastMessage,
    });

    // Allow for feedback to persist if configured to otherwise user can only
    // provide feedback on the last message.
    const allowNewFeedback =
      config.public.persistFeedback ||
      localMessage.fullMessageID === lastMessageID;

    const messageItemID = localMessage.ui_state.id;
    const message = (
      <MessageComponent
        intl={this.props.intl}
        ref={(component: MessageClass) => {
          if (component) {
            this.messageRefs.set(messageItemID, component);
          } else {
            this.messageRefs.delete(messageItemID);
          }
        }}
        className={className}
        config={config}
        localMessageItem={localMessage}
        message={fullMessage}
        languagePack={languagePack}
        requestInputFocus={requestInputFocus}
        serviceManager={serviceManager}
        messagesIndex={messagesIndex}
        assistantName={assistantName}
        assistantAvatarUrl={assistantAvatarUrl}
        disableUserInputs={inputState.isReadonly}
        isMessageForInput={isMessageForInput}
        showAvatarLine={isFirstMessageItem}
        requestMoveFocus={this.requestMoveFocus}
        scrollElementIntoView={this.scrollElementIntoView}
        isFirstMessageItem={isFirstMessageItem}
        isLastMessageItem={isLastMessageItem}
        locale={config.public.locale || "en"}
        carbonTheme={carbonTheme}
        useAITheme={useAITheme}
        allowNewFeedback={allowNewFeedback}
        hideFeedback={false}
      />
    );

    if (showBeforeWelcomeNodeElement) {
      return (
        <LatestWelcomeNodes
          welcomeNodeBeforeElement={
            serviceManager.writeableElements[
              WriteableElementName.WELCOME_NODE_BEFORE_ELEMENT
            ]
          }
          key={messageItemID}
        >
          {message}
        </LatestWelcomeNodes>
      );
    }

    return <Fragment key={messageItemID}>{message}</Fragment>;
  }

  /**
   * Renders the agent banner that appears at the top of the messages list when connecting to an agent.
   */
  private renderHumanAgentBanner() {
    return (
      <HumanAgentBannerContainer
        bannerRef={this.agentBannerRef}
        onButtonClick={this.props.onEndHumanAgentChat}
      />
    );
  }

  /**
   * This is a callback called by a child message component to request that it move focus to a different message.
   */
  private requestMoveFocus = (
    moveFocusType: MoveFocusType,
    currentMessageIndex: number,
  ) => {
    if (moveFocusType === MoveFocusType.INPUT) {
      this.props.requestInputFocus();
    } else {
      const { localMessageItems } = this.props;
      let index: number;
      switch (moveFocusType) {
        case MoveFocusType.LAST:
          index = localMessageItems.length - 1;
          break;
        case MoveFocusType.NEXT:
          index = currentMessageIndex + 1;
          // Stop at the last item instead of wrapping to the beginning
          if (index >= localMessageItems.length) {
            index = localMessageItems.length - 1;
          }
          break;
        case MoveFocusType.PREVIOUS:
          index = currentMessageIndex - 1;
          // Stop at the first item instead of wrapping to the end
          if (index < 0) {
            index = 0;
          }
          break;
        default:
          index = 0;
          break;
      }

      const messageItem = localMessageItems[index];
      const ref = this.messageRefs.get(messageItem?.ui_state.id);
      if (ref) {
        ref.requestHandleFocus();
      }
    }
  };

  /**
   * Renders an element that acts as a "handle" for the scroll panel. This is provided to allow the scroll panel to be
   * moved using the keyboard. When this element gets focus the keyboard can be used. Normally we would add
   * tabIndex=0 to the scroll panel itself but that has the unfortunate consequence of causing the scroll panel
   * to get focus when you click on it which we don't want. When this element gets focus it causes an extra class
   * name to be added to the scroll panel which displays a focus indicator on the scroll panel even though it
   * doesn't actually have focus. This element is not actually visible.
   *
   * In addition to providing the ability to scroll the panel, this acts as a button that will move focus to one of
   * the messages inside the scroll panel to provide additional navigation options.
   *
   * @param atTop Indicates if we're rendering the scroll handle at the top or bottom of the scroll panel.
   */
  private renderScrollHandle(atTop: boolean) {
    const { languagePack } = this.props.config.derived;
    const { intl, config } = this.props;

    let labelKey: keyof LanguagePack;
    let ariaLabel: string;

    if (IS_MOBILE) {
      labelKey = atTop ? "messages_scrollHandle" : "messages_scrollHandleEnd";
      ariaLabel = languagePack[labelKey] || languagePack.messages_scrollHandle;
    } else {
      // Get the keyboard shortcut configuration
      const shortcutConfig =
        config.public.keyboardShortcuts?.messageFocusToggle ||
        DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT;

      // Check if shortcuts are enabled (default to true if not specified)
      const shortcutsEnabled = shortcutConfig.is_on !== false;

      if (shortcutsEnabled) {
        // Use messages with shortcut information
        labelKey = atTop
          ? "messages_scrollHandleDetailed"
          : "messages_scrollHandleEndDetailed";

        const shortcutText = formatShortcutForDisplay(shortcutConfig);

        // Format the message with the shortcut parameter
        ariaLabel = intl.formatMessage(
          { id: labelKey },
          { shortcut: shortcutText },
        );
      } else {
        // Use messages without shortcut information
        labelKey = atTop
          ? "messages_scrollHandleDetailedNoShortcut"
          : "messages_scrollHandleEndDetailedNoShortcut";

        ariaLabel = intl.formatMessage({ id: labelKey });
      }
    }

    const onClick = IS_MOBILE
      ? undefined
      : () =>
          this.requestMoveFocus(
            atTop ? MoveFocusType.FIRST : MoveFocusType.LAST,
            0,
          );

    return (
      <MessagesScrollHandle
        buttonRef={atTop ? this.scrollHandleTopRef : this.scrollHandleBottomRef}
        ariaLabel={ariaLabel}
        onClick={onClick}
        onFocus={() => this.setState({ scrollHandleHasFocus: true })}
        onBlur={() => this.setState({ scrollHandleHasFocus: false })}
      />
    );
  }

  /**
   * Returns an array of React elements created by this.renderMessage starting from a given index and until the end of
   * the array OR optionally until we hit a new welcome node.
   *
   * @param messageIDForInput The ID of the last message response that can receive input.
   */
  renderMessages(messageIDForInput: string) {
    const { localMessageItems, allMessagesByID } = this.props;
    const renderMessageArray: ReactNode[] = [];
    const lastMessageID = arrayLastValue(localMessageItems)?.fullMessageID;
    const metadataList = buildRenderableMessageMetadata(
      localMessageItems,
      allMessagesByID,
      messageIDForInput,
    );

    metadataList.forEach((metadata) => {
      if (metadata.isStandaloneSystemMessage) {
        renderMessageArray.push(
          <Fragment key={metadata.messageItemID}>
            <SystemMessage message={metadata.fullMessage} standalone={true} />
          </Fragment>,
        );
        return;
      }
      renderMessageArray.push(
        this.renderMessage(
          metadata.localMessageItem,
          metadata.fullMessage,
          metadata.messagesIndex,
          metadata.showBeforeWelcomeNodeElement,
          metadata.isMessageForInput,
          metadata.isFirstMessageItem,
          metadata.isLastMessageItem,
          lastMessageID,
        ),
      );
    });

    return renderMessageArray;
  }

  render() {
    const {
      localMessageItems,
      messageState,
      intl,
      assistantName,
      config: {
        derived: { languagePack },
      },
    } = this.props;
    const { isMessageLoadingCounter, isMessageLoadingText } = messageState;
    const { isHumanAgentTyping } = selectHumanAgentDisplayState(
      this.props as unknown as AppState,
    );
    const { scrollHandleHasFocus, scrollDown } = this.state;

    const messageIDForInput = getMessageIDForUserInput(
      localMessageItems,
      this.props.allMessagesByID,
    );

    const regularMessages = this.renderMessages(messageIDForInput);

    let isTypingMessage;
    if (isHumanAgentTyping) {
      isTypingMessage = intl.formatMessage({ id: "messages_agentIsTyping" });
    } else if (isMessageLoadingCounter) {
      isTypingMessage = intl.formatMessage(
        { id: "messages_assistantIsLoading" },
        {
          assistantName,
        },
      );
    }

    const isTypingVisible =
      Boolean(isMessageLoadingCounter) || isHumanAgentTyping;
    const typingIndicator = (
      <MessagesTypingIndicator
        carbonTheme={this.props.carbonTheme}
        index={localMessageItems.length}
        isTypingMessage={isTypingMessage}
        isVisible={isTypingVisible}
        statusMessage={
          isMessageLoadingCounter ? isMessageLoadingText : undefined
        }
        processingLabel={languagePack.messages_processingLabel}
      />
    );
    // Don't show scroll-down button when scroll handle has focus
    // (the handle's expansion can trigger false positive scroll detection)
    const scrollDownButton =
      scrollDown && !scrollHandleHasFocus ? (
        <MessagesScrollToBottomButton
          ariaLabel={languagePack.messages_scrollMoreButton}
          onClick={() =>
            this.doAutoScrollInternal({
              scrollToBottom: 0,
              preferAnimate: true,
            })
          }
          icon={<DownToBottom slot="icon" />}
        />
      ) : null;

    return (
      <MessagesView
        humanAgentBanner={this.renderHumanAgentBanner()}
        messagesContainerRef={this.messagesContainerWithScrollingRef}
        onScroll={() => {
          this.renderScrollDownNotification();
        }}
        topScrollHandle={this.renderScrollHandle(true)}
        regularMessages={regularMessages}
        typingIndicator={typingIndicator}
        bottomSpacerRef={this.bottomSpacerRef}
        scrollDownButton={scrollDownButton}
        bottomScrollHandle={this.renderScrollHandle(false)}
        scrollHandleHasFocus={scrollHandleHasFocus}
      />
    );
  }
}

function debugAutoScroll(message: string, ...args: any[]) {
  if (DEBUG_AUTO_SCROLL) {
    debugLog(message, ...args);
  }
}

// Module-level selector — only the slices MessagesComponent actually reads.
const selectMessagesState = (state: AppState): MessagesInjectedState => ({
  config: state.config,
  allMessagesByID: state.allMessagesByID,
  humanAgentState: state.humanAgentState,
  persistedToBrowserStorage: state.persistedToBrowserStorage,
  assistantInputState: state.assistantInputState,
});

// Functional wrapper to supply the narrow state slice via hooks
const MessagesStateInjector = React.forwardRef<
  MessagesComponent,
  MessagesOwnProps
>((props, ref) => {
  const state = useSelector(selectMessagesState, shallowEqual);
  return (
    <MessagesComponent ref={ref} {...(props as MessagesOwnProps)} {...state} />
  );
});

export default withServiceManager(MessagesStateInjector);

export {
  MessagesComponent as MessagesComponentClass,
  ScrollElementIntoViewFunction,
};

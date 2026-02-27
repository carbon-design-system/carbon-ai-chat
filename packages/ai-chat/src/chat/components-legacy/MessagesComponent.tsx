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
import { AutoScrollOptions } from "../../types/utilities/HasDoAutoScroll";
import HasIntl from "../../types/utilities/HasIntl";
import { HasRequestFocus } from "../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import { IS_MOBILE } from "../utils/browserUtils";
import {
  AUTO_SCROLL_THROTTLE_TIMEOUT,
  WriteableElementName,
} from "../utils/constants";
import { doScrollElement, getScrollBottom } from "../utils/domUtils";
import { arrayLastValue } from "../utils/lang/arrayUtils";
import { isResponse, getMessageIDForUserInput } from "../utils/messageUtils";
import {
  consumeStreamingChunk,
  pinMessageAndScroll,
  recalculatePinnedMessageSpacer,
  resolveAutoScrollAction,
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

interface MessagesProps extends MessagesOwnProps, AppState {}

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
   * In-memory spacer budget in pixels used by pin/streaming math.
   * During streaming this can diverge from the DOM spacer height because we avoid
   * mid-stream DOM writes; `domSpacerHeight` tracks the real DOM value.
   */
  private currentSpacerHeight = 0;

  /**
   * The scrollHeight of the scroll container at the moment of the last pin or streaming
   * chunk update. Used by handleStreamingChunk to compute the growth delta.
   */
  private lastScrollHeight = 0;

  /**
   * The scrollTop value set at the moment of the last pin. Compared against the current
   * scrollTop at stream end to detect whether the user scrolled away from the pin during
   * streaming. In the standard "message added, then chunks stream" flow, this is set before
   * stream-end handling runs, so it is a stable baseline for the near-pin/away-from-pin check.
   */
  private pinnedScrollTop = 0;

  /**
   * The spacer height that is actually written to the DOM. This differs from
   * currentSpacerHeight during streaming: consumeStreamingChunk no longer writes to the
   * DOM spacer mid-stream, so domSpacerHeight stays at the pin-time value throughout the
   * stream. Using the real DOM height in checkMessagesOutOfView prevents the
   * scroll-to-bottom button from appearing for blank spacer space during streaming.
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

    const countChanged = newItems.length !== oldItems.length;
    const itemsChanged = newItems !== oldItems;
    // No structural or reference change means no scroll maintenance needed.
    if (!countChanged && !itemsChanged) {
      return;
    }

    this.renderScrollDownNotification();

    if (countChanged) {
      // Message list length changed (add/remove). Re-run auto-scroll policy so we either
      // pin a new target, maintain the current pin, or reset for empty state.
      this.doAutoScroll();
      return;
    }

    // Array reference changed but count is the same. In this codebase, that means
    // in-place evolution (typically streaming chunks or item-level state updates).
    // Only perform spacer maintenance if we have a pinned message.
    if (!this.pinnedMessageComponent) {
      return;
    }

    const isCurrentlyStreaming = newItems.some(
      (item) =>
        item.ui_state.streamingState && !item.ui_state.streamingState.isDone,
    );
    const wasStreaming = oldItems.some(
      (item) =>
        item.ui_state.streamingState && !item.ui_state.streamingState.isDone,
    );

    if (isCurrentlyStreaming) {
      // Prevent Safari's scroll anchoring from decreasing scrollTop during streaming
      // (the re-pin direction). getSnapshotBeforeUpdate captures scrollTop right
      // before React commits the DOM; scroll anchoring fires synchronously during
      // layout (between snapshot and now), so a decrease in this window is
      // browser-initiated — restore it.
      const el = this.messagesContainerWithScrollingRef.current;
      if (snapshot !== null && el && el.scrollTop < snapshot) {
        el.scrollTop = snapshot;
      }
      this.handleStreamingChunk();
    } else if (wasStreaming) {
      // Streaming just finished. Choose between two strategies based on where the
      // user is relative to the pin position at the moment the stream ends.
      //
      // In the normal flow, doAutoScroll already pinned (or maintained) the target before
      // this stream-end pass, so pinnedScrollTop reflects the baseline position for deciding
      // whether the user stayed near the pin.
      //
      // - Near pin (scrollTop ≤ pinnedScrollTop + 60): user stayed to watch the response.
      //   Call executePinAndScroll so the spacer and scrollTop are both written together,
      //   overriding any Safari scroll-anchoring that fired during the spacer DOM write.
      //
      // - Away from pin (scrollTop > pinnedScrollTop + 60): user scrolled to read.
      //   Recalculate the spacer, then restore the user's pre-write scrollTop. Setting
      //   scrollTop explicitly after the spacer write overrides Safari anchoring. If they
      //   were scrolled into blank spacer space, the browser caps them at the new content
      //   bottom — no explicit scroll-to-bottom needed.
      //
      // Safari fires scroll anchoring during the final stream commit (same as mid-stream
      // commits). Apply the directional restore here too so the rAF's position check sees
      // the user's actual scrollTop, not the anchoring-adjusted one.
      const elEnd = this.messagesContainerWithScrollingRef.current;
      if (snapshot !== null && elEnd && elEnd.scrollTop < snapshot) {
        elEnd.scrollTop = snapshot;
      }
      requestAnimationFrame(() => {
        const scrollElement = this.messagesContainerWithScrollingRef.current;
        if (!scrollElement || !this.pinnedMessageComponent) {
          return;
        }
        if (scrollElement.scrollTop <= this.pinnedScrollTop + 60) {
          this.executePinAndScroll(this.pinnedMessageComponent, scrollElement);
        } else {
          const savedScrollTop = scrollElement.scrollTop;
          this.executeRecalculateSpacer(scrollElement);
          scrollElement.scrollTop = savedScrollTop;
        }
      });
    }
  }

  componentWillUnmount(): void {
    // Remove the listeners and observer we added previously.
    if (this.scrollPanelObserver) {
      this.scrollPanelObserver.disconnect();
    }
  }

  /**
   * This will run doAutoScroll to ensure proper scrolling behavior when the window is resized.
   */
  public onResize = throttle(
    () => {
      // Resize can invalidate both "scroll down" visibility and pin geometry.
      this.renderScrollDownNotification();
      this.doAutoScroll();
    },
    AUTO_SCROLL_THROTTLE_TIMEOUT,
    { leading: true, trailing: true },
  );

  /**
   * Pin a message to the top of the visible scroll area and scroll to it instantly.
   * Runs synchronously inside a requestAnimationFrame — must only be called from within one.
   *
   * @param messageComponent - The MessageClass instance to pin
   * @param scrollElement - The scrollable container element
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
    this.currentSpacerHeight = result.currentSpacerHeight;
    this.domSpacerHeight = result.currentSpacerHeight;
    this.lastScrollHeight = result.lastScrollHeight;
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
    const spacerHeight = recalculatePinnedMessageSpacer({
      pinnedMessageComponent: this.pinnedMessageComponent,
      scrollElement,
      spacerElem: this.bottomSpacerRef.current,
    });
    if (spacerHeight === null) {
      return;
    }
    this.currentSpacerHeight = spacerHeight;
    this.domSpacerHeight = spacerHeight;
  }

  /**
   * Tracks streaming growth by updating in-memory spacer accounting only.
   * No DOM spacer write happens here; the DOM is reconciled once streaming ends
   * via executePinAndScroll/executeRecalculateSpacer.
   */
  private handleStreamingChunk(): void {
    const result = consumeStreamingChunk({
      currentSpacerHeight: this.currentSpacerHeight,
      lastScrollHeight: this.lastScrollHeight,
      scrollElement: this.messagesContainerWithScrollingRef.current,
    });
    // Persist controller outputs so the next streaming frame can compute a correct delta.
    // consumeStreamingChunk no longer writes to the DOM spacer mid-stream, so
    // domSpacerHeight stays at the original pin-time value throughout streaming.
    // The end-of-stream handler (executePinAndScroll / executeRecalculateSpacer)
    // performs the single DOM write and updates domSpacerHeight at that point.
    this.currentSpacerHeight = result.currentSpacerHeight;
    this.lastScrollHeight = result.lastScrollHeight;
  }

  /**
   * The primary scroll entry point. Handles all scroll scenarios:
   * - Explicit scrollToTop / scrollToBottom overrides (e.g. scroll-to-bottom button)
   * - New qualifying message: pin it to the top of the viewport (single scroll)
   * - Same qualifying message already pinned: recalculate spacer without scrolling
   * - No messages: reset to top to prevent browser restoring a stale position
   *
   * Also used externally via ChatInstance, AppShell, and child components (UserDefinedResponse,
   * MediaPlayer) that need to trigger a scroll or spacer update after a layout change.
   */
  public doAutoScroll = (options: AutoScrollOptions = {}) => {
    try {
      requestAnimationFrame(() => {
        // Execute after DOM/layout settles for the current frame so measurements
        // (scrollHeight, rects) match what the user can actually see.
        const scrollElement = this.messagesContainerWithScrollingRef.current;
        if (!scrollElement) {
          return;
        }

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
          case "scroll_to_bottom":
            doScrollElement(
              scrollElement,
              action.scrollTop,
              0,
              action.preferAnimate,
            );
            return;
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
      });
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
    this.doAutoScroll,
    AUTO_SCROLL_THROTTLE_TIMEOUT,
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

    // Subtract the real DOM spacer height, not the in-memory currentSpacerHeight.
    // During streaming, consumeStreamingChunk decrements currentSpacerHeight each chunk
    // but leaves the DOM spacer at its original size until content fully replaces it.
    // Using currentSpacerHeight would make effectiveScrollHeight grow by 2× the streamed
    // delta, causing the scroll-to-bottom button to appear for blank spacer space.
    const effectiveScrollHeight =
      scrollElement.scrollHeight - this.domSpacerHeight;
    const remainingPixelsToScroll =
      effectiveScrollHeight -
      scrollElement.scrollTop -
      scrollElement.clientHeight;
    return remainingPixelsToScroll > 60;
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
    AUTO_SCROLL_THROTTLE_TIMEOUT,
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
        public: { assistantName },
        derived: { languagePack },
      },
      messageState,
      carbonTheme,
      useAITheme,
    } = this.props;
    const inputState = selectInputState(this.props);
    const { isHumanAgentTyping } = selectHumanAgentDisplayState(this.props);
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
          if (index >= localMessageItems.length) {
            index = 0;
          }
          break;
        case MoveFocusType.PREVIOUS:
          index = currentMessageIndex - 1;
          if (index < 0) {
            index = localMessageItems.length - 1;
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

    let labelKey: keyof LanguagePack;
    if (IS_MOBILE) {
      labelKey = atTop ? "messages_scrollHandle" : "messages_scrollHandleEnd";
    } else {
      labelKey = atTop
        ? "messages_scrollHandleDetailed"
        : "messages_scrollHandleEndDetailed";
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
        // The extra "||" can be removed when we have translations for the other keys.
        ariaLabel={languagePack[labelKey] || languagePack.messages_scrollHandle}
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
    const { isHumanAgentTyping } = selectHumanAgentDisplayState(this.props);
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
    const scrollDownButton = scrollDown ? (
      <MessagesScrollToBottomButton
        ariaLabel={languagePack.messages_scrollMoreButton}
        onClick={() =>
          this.doAutoScroll({
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

// Functional wrapper to supply AppState via hooks
const MessagesStateInjector = React.forwardRef<
  MessagesComponent,
  MessagesOwnProps
>((props, ref) => {
  const state = useSelector<AppState, AppState>((s) => s);
  return (
    <MessagesComponent ref={ref} {...(props as MessagesOwnProps)} {...state} />
  );
});

export default withServiceManager(MessagesStateInjector);

export {
  MessagesComponent as MessagesComponentClass,
  ScrollElementIntoViewFunction,
};

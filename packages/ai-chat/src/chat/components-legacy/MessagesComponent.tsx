/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/* eslint-disable jsx-a11y/no-noninteractive-tabindex */

import cx from "classnames";
import throttle from "lodash-es/throttle.js";
import debounce from "lodash-es/debounce.js";
import React, { Fragment, PureComponent, ReactNode } from "react";
import { useSelector } from "../hooks/useSelector";
import DownToBottom16 from "@carbon/icons/es/down-to-bottom/16.js";
import { HumanAgentBannerContainer } from "./humanAgent/HumanAgentBannerContainer";
import { AriaLiveMessage } from "./aria/AriaLiveMessage";
import LatestWelcomeNodes from "./LatestWelcomeNodes";
import {
  HasServiceManager,
  withServiceManager,
} from "../hocs/withServiceManager";
import actions from "../store/actions";
import {
  selectHumanAgentDisplayState,
  selectInputState,
} from "../store/selectors";
import { AppState, ChatMessagesState } from "../../types/state/AppState";
import { AutoScrollOptions } from "../../types/utilities/HasDoAutoScroll";
import HasIntl from "../../types/utilities/HasIntl";
import { HasRequestFocus } from "../../types/utilities/HasRequestFocus";
import {
  LocalMessageItem,
  MessageErrorState,
} from "../../types/messaging/LocalMessageItem";
import { IS_MOBILE } from "../utils/browserUtils";
import {
  AUTO_SCROLL_EXTRA,
  AUTO_SCROLL_THROTTLE_TIMEOUT,
  WriteableElementName,
} from "../utils/constants";
import {
  doScrollElement,
  getScrollBottom,
  waitForStableHeight,
} from "../utils/domUtils";
import { arrayLastValue } from "../utils/lang/arrayUtils";
import { isRequest, isResponse } from "../utils/messageUtils";
import { consoleError, debugLog } from "../utils/miscUtils";
import MessageComponent, {
  MessageClass,
  MoveFocusType,
} from "./MessageComponent";
import { Message, MessageRequest } from "../../types/messaging/Messages";
import { LanguagePack } from "../../types/config/PublicConfig";
import { CarbonTheme } from "../../types/config/PublicConfig";
import { carbonIconToReact } from "../utils/carbonIcon";
import Processing from "@carbon/ai-chat-components/es/react/processing.js";
import ChatButton, {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_SIZE,
} from "@carbon/ai-chat-components/es/react/chat-button.js";
import { MountChildrenOnDelay } from "./util/MountChildrenOnDelay";

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
   * A ref to the element that acts as a handle for scrolling.
   */
  public scrollHandleRef = React.createRef<HTMLButtonElement>();

  /**
   * A ref to the element that acts as a handle for scrolling.
   */
  public agentBannerRef = React.createRef<HasRequestFocus>();

  /**
   * This is the previous value of the offset height of the scrollable element when the last scroll event was fired.
   */
  private previousScrollOffsetHeight: number;

  /**
   * This is the previous message that was scrolled to.
   */
  private previousScrollableMessage: MessageClass;

  /**
   * Spacer element at the bottom of the messages list. We set this element's
   * min-block-size attribute in order to ensure the request message is brought to the
   * top of the chat.
   */
  private bottomSpacerRef = React.createRef<HTMLDivElement>();

  componentDidMount(): void {
    this.scrollPanelObserver = new ResizeObserver(this.onResize);
    this.scrollPanelObserver.observe(
      this.messagesContainerWithScrollingRef.current,
    );

    this.previousScrollOffsetHeight =
      this.messagesContainerWithScrollingRef.current.offsetHeight;
  }

  componentDidUpdate(oldProps: MessagesProps) {
    const newProps = this.props;

    // If the number of messages changes (usually because of new messages) or the state of the "is typing" indicator
    // changes, then we need to check to see if we want to perform some auto-scrolling behavior.
    const numMessagesChanged =
      oldProps.localMessageItems.length !== newProps.localMessageItems.length;

    const oldHumanAgentDisplayState = selectHumanAgentDisplayState(oldProps);
    const newHumanAgentDisplayState = selectHumanAgentDisplayState(newProps);

    const typingChanged =
      oldProps.messageState.isMessageLoadingCounter !==
        newProps.messageState.isMessageLoadingCounter ||
      oldHumanAgentDisplayState.isHumanAgentTyping !==
        newHumanAgentDisplayState.isHumanAgentTyping;

    if (numMessagesChanged || typingChanged) {
      const newLastItem = arrayLastValue(newProps.localMessageItems);
      const oldLastItem = arrayLastValue(oldProps.localMessageItems);

      // If the last message has changed, then do an auto scroll.
      const lastItemChanged = newLastItem !== oldLastItem;
      if (lastItemChanged || typingChanged) {
        this.doAutoScroll({ preferAnimate: true });
      }
    }
  }

  componentWillUnmount(): void {
    // Remove the listeners and observer we added previously.
    this.scrollPanelObserver.unobserve(
      this.messagesContainerWithScrollingRef.current,
    );
  }

  /**
   * Determines if the message should be scrolled to. By default, response messages should be scrolled to,
   * and request messages should not be scrolled to.
   * Special cases:
   * 1. If a response has history.silent=true, it should not be scrolled to
   * 2. If a message is from history, we should always scroll to it if possible
   */
  private shouldScrollToMessage = (
    localItem: LocalMessageItem,
    message: Message,
  ) => {
    if (isResponse(message)) {
      const { allMessagesByID } = this.props;
      const messageRequest = allMessagesByID[
        message?.request_id
      ] as MessageRequest;

      // If the request for this response was silent, then scroll to it instead of scrolling to where the
      // silent user message would be. But don't do this if it's an empty message (which happens with a
      // skip_use_input message from an extension).
      return (
        messageRequest?.history?.silent && messageRequest.input?.text !== ""
      );
    }

    return isRequest(message);
  };

  /**
   * This function is called when the scrollable messages list is scrolled. It will determine if the scroll panel
   * has been scrolled all the way to the bottom and if so, it will enable the scroll anchor that will keep it there.
   * Note that this callback is not attached via the normal react method with an `onScroll` prop as that doesn't
   * work with under a shadow DOM. This callback is attached directly in {@link componentDidMount}.
   *
   * This function will also make a somewhat crude attempt to distinguish if a scroll event has occurred because the
   * user initiated a scroll or if the application initiated a scroll as the result of a changing in size of the
   * widget. If the user initiates a scroll, then we use that event to anchor or un-anchor the scroll panel. If the
   * application did the scroll, we want the anchor state to remain unchanged.
   *
   * @param fromAutoScroll Indicates if the reason we are checking the anchor is due to an auto-scroll action.
   * @param assumeScrollTop A value to assume the scroll panel is (or will be) scrolled to. This can be useful when
   * an animation is occurring and the current scroll position isn't the final scroll position.
   */
  private checkScrollAnchor(
    fromAutoScroll?: boolean,
    assumeScrollTop?: number,
  ) {
    const scrollElement = this.messagesContainerWithScrollingRef.current;

    if (!scrollElement) {
      return;
    }

    // If we're checking because of auto-scrolling, we want check the scroll position even if the scroll detection
    // is normally suspended because of something like an animation in progress.
    if (
      fromAutoScroll ||
      (this.previousScrollOffsetHeight === scrollElement.offsetHeight &&
        !this.props.suspendScrollDetection)
    ) {
      // If the scroll panel has been scrolled all the way to the bottom, turn on the anchor.
      const assumedScrollTop =
        assumeScrollTop !== undefined
          ? assumeScrollTop
          : scrollElement.scrollTop;
      const isScrollAnchored =
        assumedScrollTop >=
        scrollElement.scrollHeight - scrollElement.offsetHeight;
      if (isScrollAnchored !== this.props.messageState.isScrollAnchored) {
        this.props.serviceManager.store.dispatch(
          actions.setChatMessagesStateProperty(
            "isScrollAnchored",
            isScrollAnchored,
          ),
        );
      }
    }

    this.previousScrollOffsetHeight = scrollElement.offsetHeight;
  }

  /**
   * This will check to see if the messages list is anchored to the bottom of the panel and if so, ensure that the
   * list is still scrolled to the bottom. It will also run doAutoScroll to ensure proper scrolling behavior
   * when the window is resized.
   */
  public onResize = () => {
    this.renderScrollDownNotification();
    if (this.props.messageState.isScrollAnchored) {
      const element = this.messagesContainerWithScrollingRef.current;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    }

    // Run doAutoScroll when the window is resized to maintain proper scroll position
    // This is important for workspace functionality
    this.doAutoScroll();
  };

  /**
   * This will execute an auto-scroll operation based on the current state of messages in the component. This should
   * be called whenever the messages change.
   *
   * The scrolling rules are as follows.
   *
   * 1. If the last message is a welcome node, auto-scroll to the top of the message without animating. This
   * means the user has just started a new chat, and we want to just jump to the top.
   * 2. If the component has just mounted and the last message is not a welcome node, just jump to the bottom
   * without animating.
   * 3. If the typing indicator is visible, then scroll that into view.
   * 4. Scroll to the top of the last user message. This means that the bot messages will auto-scroll until the user's
   * last message reaches the top of the window, and then they'll stop and not scroll anymore.
   * 5. If the there is no user message that can be scrolled to, scroll to the last bot message.
   * 6. If the last bot message has an empty output. Just scroll to bottom.
   *
   * @param options The options to control how the scrolling should occur.
   */
  public doAutoScroll = throttle((options: AutoScrollOptions = {}) => {
    let animate: boolean = options.preferAnimate ?? true;

    try {
      requestAnimationFrame(() => {
        debugAutoScroll("[doAutoScroll] Running doAutoScroll", options);

        const { scrollToTop, scrollToBottom } = options;
        const { localMessageItems, allMessagesByID } = this.props;
        const scrollElement = this.messagesContainerWithScrollingRef.current;

        if (scrollToTop !== undefined) {
          doScrollElement(scrollElement, scrollToTop, 0);
          return;
        }

        if (scrollToBottom !== undefined) {
          const scrollTop =
            scrollElement.scrollHeight -
            scrollElement.offsetHeight -
            scrollToBottom;
          doScrollElement(scrollElement, scrollTop, 0, animate);
          return;
        }

        let setScrollTop: number;

        const lastLocalItemIndex = localMessageItems.length - 1;
        const lastLocalItem = localMessageItems.length
          ? localMessageItems[lastLocalItemIndex]
          : null;
        const lastMessage = allMessagesByID[lastLocalItem?.fullMessageID];

        // if message comes from history, don't animate scroll
        if (lastMessage?.ui_state_internal?.from_history) {
          animate = false;
        }

        if (!lastLocalItem) {
          debugAutoScroll("[doAutoScroll] No last time");
          // No messages, so set the scroll position to the top. If we don't set this explicitly, the browser may
          // decide it remembers the previous scroll position and set it for us.
          setScrollTop = 0;
        } else {
          // Iterate backwards until we find the last message to scroll to. By default, request messages should be
          // scrolled to (not response messages). However, if a response has history.silent=true, it should not be scrolled to.
          // If all messages are not scrollable, we'll default to the bottom of the conversation.
          let messageIndex = localMessageItems.length - 1;
          let localItem = localMessageItems[messageIndex];
          let lastScrollableMessageComponent: MessageClass = undefined;

          while (messageIndex >= 1) {
            localItem = localMessageItems[messageIndex];
            const message = allMessagesByID[localItem?.fullMessageID];

            if (this.shouldScrollToMessage(localItem, message)) {
              lastScrollableMessageComponent = this.messageRefs.get(
                localItem.ui_state.id,
              );
              debugAutoScroll(
                `[doAutoScroll] lastScrollableMessageComponent=${messageIndex}`,
                localMessageItems[messageIndex],
                message,
              );
              break;
            }
            messageIndex--;
          }

          if (lastScrollableMessageComponent) {
            /**
             * Make sure the message container scroll height is stable before we grab values for
             * scroll position calculations. It can sometimes take a couple animation frames
             * for the height to settle, especially with dropdowns which can increase / decrease
             * the scroll height when it's open / closed.
             */
            waitForStableHeight(scrollElement).then(() => {
              /**
               * In order to bump the request message to the top of the chat client height, we set the
               * `min-block-size` of a spacer div element at the bottom of the message list.
               */
              const spacerElem = this.bottomSpacerRef.current;
              const spacerHeight =
                getComputedStyle(spacerElem).getPropertyValue("min-block-size");
              const previousDeficit = parseFloat(spacerHeight) || 0;

              const lastResponseMessage =
                lastScrollableMessageComponent?.ref?.current;

              const lastResponseRect =
                lastResponseMessage.getBoundingClientRect();
              const scrollerRect = scrollElement.getBoundingClientRect();
              const targetHeight = lastResponseRect.height;
              // subtract the previous deficit / height of the spacer element div to prevent
              // the desired scroll top / request message scroll position to be skewed especially
              // as the spacer element height will be adjusted later when the response messages come
              // through
              const scrollerHeight = scrollerRect.height - previousDeficit;

              const targetOffsetWithinScroller =
                lastResponseRect.top -
                scrollerRect.top +
                scrollElement.scrollTop;

              // Scroll position needed to set request message at top of chat
              setScrollTop = Math.max(
                0,
                Math.floor(targetOffsetWithinScroller + AUTO_SCROLL_EXTRA),
              );

              // If the request message is too tall (more than 1/4 of the chat height), we push it
              // to the top, but only show the bottom 100px of the request message. We do this so the response
              // isn't hidden, forcing the user to have to scroll.
              const isVeryTall = targetHeight > scrollerHeight / 4;

              if (isVeryTall) {
                // Tall message: we want bottom 100px visible.
                const VISIBLE_BOTTOM_PORTION = 100;
                const tallAdjustment = Math.max(
                  0,
                  targetHeight - VISIBLE_BOTTOM_PORTION,
                );

                setScrollTop = setScrollTop + tallAdjustment;
              }

              const lastRect = spacerElem.getBoundingClientRect();
              const lastOffset =
                lastRect.top - scrollerRect.top + scrollElement.scrollTop;

              const visibleBottom = setScrollTop + scrollElement.clientHeight;
              const deficit = Math.max(
                0,
                Math.ceil(visibleBottom - lastOffset),
              );

              spacerElem.style.setProperty("min-block-size", `${deficit}px`);

              debugAutoScroll(
                `[doAutoScroll] Scrolling to message offsetTop=${setScrollTop}`,
              );

              // Scroll only on request message change
              if (
                this.previousScrollableMessage !==
                lastScrollableMessageComponent
              ) {
                doScrollElement(scrollElement, setScrollTop, 0, animate);
                this.checkScrollAnchor(true, setScrollTop);

                this.previousScrollableMessage = lastScrollableMessageComponent;
              }
            });
            return;
          } else {
            // No message found.
            setScrollTop = -1;
            debugAutoScroll("[doAutoScroll] No message found");
          }
        }

        if (setScrollTop !== -1) {
          debugAutoScroll(
            `[doAutoScroll] doScrollElement`,
            scrollElement,
            setScrollTop,
          );
          doScrollElement(scrollElement, setScrollTop, 0, animate);

          // Update the scroll anchor setting based on this new position.
          this.checkScrollAnchor(true, setScrollTop);
        }
      });
    } catch (error) {
      // Just ignore any errors. It's not the end of the world if scrolling doesn't work for any reason.
      consoleError("An error occurred while attempting to scroll.", error);
    }
  }, AUTO_SCROLL_THROTTLE_TIMEOUT);

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

        // Scroll to the top of the message.
        const setScrollTop = panelComponent.ref.current.offsetTop;

        // Do the scrolling.
        doScrollElement(scrollElement, setScrollTop, 0, animate);

        // Update the scroll anchor setting based on this new position.
        this.checkScrollAnchor(true, setScrollTop);
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

    const remainingPixelsToScroll =
      scrollElement.scrollHeight -
      scrollElement.scrollTop -
      scrollElement.clientHeight;
    return remainingPixelsToScroll > 60;
  }

  /**
   * Updates the state after checking if there are any unread messages in the chat view
   */
  public renderScrollDownNotification = debounce(
    () => {
      const shouldRender = this.checkMessagesOutOfView();
      this.setState({
        scrollHandleHasFocus: false,
        scrollDown: shouldRender,
      });
    },
    50,
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
   * JSX to show typing indicator.
   *
   * @param isTypingMessage The aria label for the typing indicator.
   * @param index The index of this message.
   * @param statusMessage The optional visible message with the typing indicator
   */
  private renderTypingIndicator(
    isTypingMessage: string,
    index: number,
    statusMessage?: string,
  ) {
    return (
      <div
        className={`cds-aichat--message cds-aichat--message-${index} cds-aichat--message--last-message`}
      >
        <div className="cds-aichat--message--padding">
          {isTypingMessage && <AriaLiveMessage message={isTypingMessage} />}
          <div className="cds-aichat--assistant-message">
            <div className="cds-aichat--received cds-aichat--received--loading cds-aichat--message-vertical-padding">
              <div className="cds-aichat--received--inner">
                <div className="cds-aichat--processing">
                  <Processing
                    className="cds-aichat--processing-component"
                    loop
                    carbonTheme={this.props.carbonTheme}
                  />{" "}
                  <div className="cds-aichat--processing-label">
                    {statusMessage}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
        doAutoScroll={this.doAutoScroll}
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
      <button
        type="button"
        className="cds-aichat--messages--scroll-handle"
        ref={this.scrollHandleRef}
        tabIndex={0}
        // The extra "||" can be removed when we have translations for the other keys.
        aria-label={
          languagePack[labelKey] || languagePack.messages_scrollHandle
        }
        onClick={onClick}
        onFocus={() =>
          this.setState({ scrollHandleHasFocus: true, ...this.state })
        }
        onBlur={() =>
          this.setState({ scrollHandleHasFocus: false, ...this.state })
        }
      />
    );
  }

  /**
   * As soon as the user sends a message, we want to disable all the previous message responses to prevent the user
   * from interacting with them again. However, if the user's message results in an error, we want to re-enable the
   * last response from the bot to prevent the user from getting stuck in the case where the input bar is disabled.
   * This function returns the id of the last message that is permitted to be enabled.
   */
  getMessageIDForUserInput() {
    const { localMessageItems, allMessagesByID } = this.props;
    for (let index = localMessageItems.length - 1; index >= 0; index--) {
      const message = localMessageItems[index];
      const originalMessage = allMessagesByID[message.fullMessageID];
      if (
        isRequest(originalMessage) &&
        originalMessage?.history?.error_state !== MessageErrorState.FAILED
      ) {
        // If we find a request that was not an error, then we need to disable everything.
        return null;
      }
      if (isResponse(originalMessage)) {
        // If we didn't find a successful request, then the first response we find can be enabled.
        return message.fullMessageID;
      }
    }
    // Nothing should be enabled.
    return null;
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

    let previousMessageID: string = null;
    for (
      let currentIndex = 0;
      currentIndex < localMessageItems.length;
      currentIndex++
    ) {
      const localMessageItem = localMessageItems[currentIndex];
      const fullMessage = allMessagesByID[localMessageItem.fullMessageID];
      const isMessageForInput =
        messageIDForInput === localMessageItem.fullMessageID;
      const isFirstMessageItem =
        previousMessageID !== localMessageItem.fullMessageID;
      const showBeforeWelcomeNodeElement =
        localMessageItem.ui_state.isWelcomeResponse && isFirstMessageItem;
      const isLastMessageItem =
        localMessageItems.length - 1 === currentIndex ||
        localMessageItem.fullMessageID !==
          localMessageItems[currentIndex + 1].fullMessageID;

      previousMessageID = localMessageItem.fullMessageID;

      renderMessageArray.push(
        this.renderMessage(
          localMessageItem,
          fullMessage,
          currentIndex,
          showBeforeWelcomeNodeElement,
          isMessageForInput,
          isFirstMessageItem,
          isLastMessageItem,
          lastMessageID,
        ),
      );
    }

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

    const messageIDForInput = this.getMessageIDForUserInput();

    const regularMessages = this.renderMessages(messageIDForInput);

    let isTypingMessage;
    if (isHumanAgentTyping) {
      isTypingMessage = intl.formatMessage({ id: "messages_agentIsTyping" });
    } else if (isMessageLoadingCounter) {
      isTypingMessage = intl.formatMessage(
        { id: "messages_assistantIsLoading" },
        { assistantName },
      );
    }

    return (
      <div className="cds-aichat--messages--holder">
        {this.renderHumanAgentBanner()}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          className={cx("cds-aichat--messages__wrapper", {
            "cds-aichat--messages__wrapper--scroll-handle-has-focus":
              scrollHandleHasFocus,
          })}
          ref={this.messagesContainerWithScrollingRef}
          onScroll={() => {
            this.checkScrollAnchor();
            this.renderScrollDownNotification();
          }}
        >
          <div className="cds-aichat--messages">
            {this.renderScrollHandle(true)}
            {regularMessages}
            {(Boolean(isMessageLoadingCounter) || isHumanAgentTyping) &&
              this.renderTypingIndicator(
                isTypingMessage,
                localMessageItems.length,
                isMessageLoadingCounter ? isMessageLoadingText : undefined,
              )}
            {this.renderScrollHandle(false)}
            <div id="chat-bottom-spacer" ref={this.bottomSpacerRef} />
            <MountChildrenOnDelay>
              <div className="cds-aichat__scroll-to-bottom">
                <ChatButton
                  className={cx("cds-aichat__scroll-to-bottom-button", {
                    "cds-aichat__scroll-to-bottom-button--hidden": !scrollDown,
                  })}
                  size={CHAT_BUTTON_SIZE.SMALL}
                  kind={CHAT_BUTTON_KIND.SECONDARY}
                  aria-label={languagePack.messages_scrollMoreButton}
                  onClick={() =>
                    this.doAutoScroll({
                      scrollToBottom: 0,
                      preferAnimate: true,
                    })
                  }
                >
                  <DownToBottom slot="icon" />
                </ChatButton>
              </div>
            </MountChildrenOnDelay>
          </div>
        </div>
      </div>
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

/*
 *  Copyright IBM Corp. 2025, 2026
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
import { MessagesScrollHandle } from "./MessagesScrollHandle";
import { MessagesScrollToBottomButton } from "./MessagesScrollToBottomButton";
import { ProcessingWithText } from "../components/util/ProcessingWithText";
import { MessagesView } from "./MessagesView";
import { SystemMessage } from "../components/SystemMessage";
import WriteableElement from "../components/util/WriteableElement";
import {
  HasServiceManager,
  withServiceManager,
} from "../hocs/withServiceManager";
import {
  selectHumanAgentDisplayState,
  selectInputIsReadonly,
} from "../store/selectors";
import { AppState, ChatMessagesState } from "../../types/state/AppState";
import { shallowEqual } from "../store/appStore";
import { AutoScrollOptions } from "../../types/utilities/HasDoAutoScroll";
import HasIntl from "../../types/utilities/HasIntl";
import { HasRequestFocus } from "../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import { IS_MOBILE } from "../utils/browserUtils";
import { WriteableElementName } from "../utils/constants";
import { applyDynamicStyles } from "../utils/cspStyleUtils";
import { formatShortcutForDisplay } from "../utils/keyboardUtils";
import { arrayLastValue } from "../utils/lang/arrayUtils";
import {
  isRequest,
  isResponse,
  getMessageIDForUserInput,
} from "../utils/messageUtils";
import { DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT } from "../../types/config/ShortcutConfig";
import {
  MessagesScrollController,
  type PortableMessage,
  type ScrollHost,
} from "../utils/messagesAutoScrollController";
import { buildRenderableMessageMetadata } from "../utils/messagesRenderUtils";
import { consoleError } from "../utils/miscUtils";
import MessageComponent, {
  MessageClass,
  MoveFocusType,
} from "./MessageComponent";
import { Message, MessageRequest } from "../../types/messaging/Messages";
import { LanguagePack } from "../../types/config/LanguagePack";
import { CarbonTheme } from "../../types/config/CarbonTheme";
import { ChatShortcutConfig } from "../../types/config/ShortcutConfig";
import { carbonIconToReact } from "../utils-react/carbonIcon";

const DownToBottom = carbonIconToReact(DownToBottom16);

/**
 * Scroll notification UI throttle - updates the "scroll to bottom" button visibility.
 * Visual indicator update doesn't need to be frame-perfect.
 */
const SCROLL_NOTIFICATION_THROTTLE_MS = 200;

/**
 * Write `min-block-size` for the bottom spacer via the shared dynamic
 * stylesheet so a strict CSP can drop style-src-attr 'unsafe-inline'.
 */
function applySpacerDeficit(spacerElem: HTMLElement, deficit: number): void {
  applyDynamicStyles(spacerElem, "spacer", {
    "min-block-size": `${deficit}px`,
  });
}

/**
 * Determines if a message qualifies as a scroll target (pin target).
 *
 * Rules:
 * - A MessageRequest always qualifies.
 * - A MessageResponse qualifies only if its corresponding request had `history.silent = true`,
 *   meaning no visible user bubble was shown and the response is the right element to pin.
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
   * Indicates which CarbonTheme is in use.
   */
  carbonTheme: CarbonTheme;
}

/**
 * The only language-pack strings MessagesComponent reads as props. Narrowing to
 * these (instead of the whole `languagePack` slice) keeps this PureComponent from
 * re-rendering on any unrelated string change — every other scroll-handle variant
 * is resolved through `intl.formatMessage` by id, not through these props.
 */
type MessagesLanguagePackStrings = Pick<
  LanguagePack,
  | "messages_scrollHandle"
  | "messages_scrollHandleEnd"
  | "messages_processingLabel"
  | "messages_scrollMoreButton"
>;

/**
 * Only the AppState slices and derived values that MessagesComponent actually
 * reads. Narrowing the config to specific fields lets reconciliation keep their
 * references stable across unrelated config changes, so this heavy component
 * doesn't re-render on every config update.
 */
interface MessagesInjectedState {
  allMessagesByID: AppState["allMessagesByID"];
  humanAgentState: AppState["humanAgentState"];
  persistedToBrowserStorage: AppState["persistedToBrowserStorage"];
  /** Effective whole-chat read-only state (override or config). */
  isInputReadonly: boolean;
  disclaimerIsOn: boolean | undefined;
  persistFeedback: boolean | undefined;
  hideAvatar: boolean | undefined;
  languagePack: MessagesLanguagePackStrings;
  keyboardShortcutConfig: ChatShortcutConfig | undefined;
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
   * Spacer element at the bottom of the messages list. We set this element's
   * min-block-size attribute in order to ensure the request message is brought to the
   * top of the chat.
   */
  private bottomSpacerRef = React.createRef<HTMLDivElement>();

  /**
   * The framework-agnostic scroll/spacer engine. This host implements
   * {@link ScrollHost} and delegates all scroll behavior to the controller.
   */
  private scroll: MessagesScrollController = new MessagesScrollController(
    this.createScrollHost(),
  );

  /**
   * Builds the {@link ScrollHost} adapter the controller uses to read/write the DOM
   * without knowing about React. Semantic booleans (`isPinnable`/`isStreaming`/
   * `isResponse`) are computed here from `LocalMessageItem`/`allMessagesByID`.
   */
  private createScrollHost(): ScrollHost {
    return {
      getScrollContainer: () => this.messagesContainerWithScrollingRef.current,
      getSpacer: () => this.bottomSpacerRef.current,
      setSpacerHeight: (px: number) => {
        const spacerElem = this.bottomSpacerRef.current;
        if (spacerElem) {
          applySpacerDeficit(spacerElem, px);
        }
      },
      getMessages: () => this.getPortableMessages(),
      onScrollGeometryChanged: () => this.renderScrollDownNotification(),
    };
  }

  /**
   * Maps the current `localMessageItems` to the framework-neutral
   * {@link PortableMessage}[] the controller consumes, in document order.
   */
  private getPortableMessages(): PortableMessage[] {
    const { localMessageItems, allMessagesByID } = this.props;
    return localMessageItems.map((item) => {
      const fullMessage = allMessagesByID[item.fullMessageID];
      const streamingState = item.ui_state.streamingState;
      return {
        id: item.ui_state.id,
        element: this.messageRefs.get(item.ui_state.id)?.ref?.current ?? null,
        isPinnable: fullMessage
          ? shouldScrollToMessage(fullMessage, allMessagesByID)
          : false,
        isStreaming: Boolean(streamingState && !streamingState.isDone),
        isResponse: Boolean(fullMessage && isResponse(fullMessage)),
      };
    });
  }

  componentDidMount(): void {
    this.scroll.connect();
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
    // Check if human agent banner just became visible
    const oldDisplayState = selectHumanAgentDisplayState(oldProps);
    const newDisplayState = selectHumanAgentDisplayState(this.props);

    // Request focus when banner transitions from hidden to visible
    if (
      !oldDisplayState.isConnectingOrConnected &&
      newDisplayState.isConnectingOrConnected
    ) {
      // Use requestAnimationFrame to ensure the banner has rendered
      requestAnimationFrame(() => {
        this.requestHumanAgentBannerFocus();
      });
    }

    // Delegate all scroll/spacer maintenance to the controller. It reads the
    // latest messages from this host and compares against its own baseline. The
    // pre-commit snapshot feeds the Safari scroll-anchoring restore.
    this.scroll.onHostUpdated(snapshot);
  }

  componentWillUnmount(): void {
    this.scroll.disconnect();
    this.renderScrollDownNotification.cancel();
  }

  /**
   * This will run internal auto-scroll to ensure proper scrolling behavior when the window is resized.
   */
  public onResize = (): void => {
    // Resize can invalidate both "scroll down" visibility and pin geometry.
    this.renderScrollDownNotification();
    this.scroll.onContainerResize();
  };

  /**
   * Public auto-scroll entry point exposed through ChatInstance/AppShell.
   * Thin pass-through to the controller.
   */
  public doAutoScroll = (options: AutoScrollOptions = {}): void => {
    this.scroll.doAutoScroll(options);
  };

  /**
   * Returns the current scrollBottom value for the message scroll panel.
   */
  public getContainerScrollBottom = (): number => {
    return this.scroll.getContainerScrollBottom();
  };

  /**
   * Scrolls the given element into view so that it is fully visible. If the element is already visible, then no
   * scrolling will be done. Thin pass-through to the controller.
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
  ): void => {
    this.scroll.scrollElementIntoView(
      element,
      paddingTop,
      paddingBottom,
      animate,
    );
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
      // Resolve the (full) message id to the first matching row's element (this host
      // owns the id → element mapping), then delegate the actual scroll to the controller.
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
        this.scroll.doScrollToMessageElement(
          panelComponent.ref.current,
          animate,
        );
      }
    } catch (error) {
      // Just ignore any errors. It's not the end of the world if scrolling doesn't work for any reason.
      consoleError("An error occurred while attempting to scroll.", error);
    }
  }

  /**
   * Calculates if there are any messages at the bottom out of the scroll view of the container.
   * The result determines if the user should be told if they need to scroll down to view more
   * messages or not. Thin pass-through to the controller's scroll-to-bottom decision.
   */
  public checkMessagesOutOfView() {
    return this.scroll.isScrolledAwayFromBottom();
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
      requestInputFocus,
      persistedToBrowserStorage,
      assistantName,
      assistantAvatarUrl,
      isInputReadonly,
      disclaimerIsOn,
      persistFeedback,
      locale,
      messageState,
      hideAvatar,
    } = this.props;

    const { isHumanAgentTyping } = selectHumanAgentDisplayState(this.props);
    const { isMessageLoadingCounter } = messageState;
    const { disclaimersAccepted } = persistedToBrowserStorage;

    // If there is a disclaimer, messages should only be rendered once it's accepted.
    if (disclaimerIsOn && !disclaimersAccepted[window.location.hostname]) {
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
      persistFeedback || localMessage.fullMessageID === lastMessageID;

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
        localMessageItem={localMessage}
        message={fullMessage}
        requestInputFocus={requestInputFocus}
        serviceManager={serviceManager}
        messagesIndex={messagesIndex}
        assistantName={assistantName}
        assistantAvatarUrl={assistantAvatarUrl}
        disableUserInputs={isInputReadonly}
        isMessageForInput={isMessageForInput}
        showAvatarLine={isFirstMessageItem}
        hideAvatar={hideAvatar}
        requestMoveFocus={this.requestMoveFocus}
        scrollElementIntoView={this.scrollElementIntoView}
        isFirstMessageItem={isFirstMessageItem}
        isLastMessageItem={isLastMessageItem}
        locale={locale || "en"}
        allowNewFeedback={allowNewFeedback}
        hideFeedback={false}
      />
    );

    if (showBeforeWelcomeNodeElement) {
      return (
        <Fragment key={messageItemID}>
          <WriteableElement
            slotName={WriteableElementName.WELCOME_NODE_BEFORE_ELEMENT}
            id={`welcomeNodeBeforeElement${serviceManager.namespace.suffix}`}
          />
          {message}
        </Fragment>
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
    const { intl, languagePack, keyboardShortcutConfig } = this.props;

    let labelKey: keyof LanguagePack;
    let ariaLabel: string;

    if (IS_MOBILE) {
      ariaLabel =
        (atTop
          ? languagePack.messages_scrollHandle
          : languagePack.messages_scrollHandleEnd) ||
        languagePack.messages_scrollHandle;
    } else {
      // Get the keyboard shortcut configuration
      const shortcutConfig =
        keyboardShortcutConfig || DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT;

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
      languagePack,
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
      <ProcessingWithText
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
            this.scroll.doAutoScrollInternal({
              scrollToBottom: 0,
              preferAnimate: true,
            })
          }
          icon={
            <DownToBottom
              slot="icon"
              aria-label={languagePack.messages_scrollMoreButton}
            />
          }
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

// Module-level selector — only the slices/derived values MessagesComponent
// actually reads. With shallowEqual the whole config tree no longer pulls this
// component into every config-change re-render; each narrow field's
// reconciled reference / primitive value is compared instead.
const selectMessagesState = (
  state: AppState,
): Omit<MessagesInjectedState, "languagePack"> => ({
  allMessagesByID: state.allMessagesByID,
  humanAgentState: state.humanAgentState,
  persistedToBrowserStorage: state.persistedToBrowserStorage,
  isInputReadonly: selectInputIsReadonly(state),
  disclaimerIsOn: state.config.public.disclaimer?.isOn,
  persistFeedback: state.config.public.persistFeedback,
  hideAvatar: state.config.public.hideAvatar,
  keyboardShortcutConfig:
    state.config.public.keyboardShortcuts?.messageFocusToggle,
});

// Selected separately (with its own shallowEqual) rather than folded into
// `selectMessagesState`: a nested fresh object inside that bag would fail its
// shallowEqual by reference on every commit. As its own narrow bag it changes
// only when one of these four strings changes.
const selectMessagesStrings = (
  state: AppState,
): MessagesLanguagePackStrings => ({
  messages_scrollHandle: state.languagePack.messages_scrollHandle,
  messages_scrollHandleEnd: state.languagePack.messages_scrollHandleEnd,
  messages_processingLabel: state.languagePack.messages_processingLabel,
  messages_scrollMoreButton: state.languagePack.messages_scrollMoreButton,
});

// Functional wrapper to supply the narrow state slice via hooks
const MessagesStateInjector = React.forwardRef<
  MessagesComponent,
  MessagesOwnProps
>((props, ref) => {
  const state = useSelector(selectMessagesState, shallowEqual);
  const languagePack = useSelector(selectMessagesStrings, shallowEqual);
  return (
    <MessagesComponent
      ref={ref}
      {...(props as MessagesOwnProps)}
      {...state}
      languagePack={languagePack}
    />
  );
});

export default withServiceManager(MessagesStateInjector);

export {
  MessagesComponent as MessagesComponentClass,
  ScrollElementIntoViewFunction,
  selectMessagesState,
};

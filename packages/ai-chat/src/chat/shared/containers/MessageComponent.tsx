/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ChatBot from "@carbon/icons-react/es/ChatBot.js";
import CheckmarkFilled from "@carbon/icons-react/es/CheckmarkFilled.js";
import Headset from "@carbon/icons-react/es/Headset.js";
import { Loading } from "@carbon/react";
import cx from "classnames";
import React, { KeyboardEvent, PureComponent } from "react";
import { FormattedMessage, injectIntl } from "react-intl";

import { nodeToText } from "../components/aria/AriaAnnouncerComponent";
import { Avatar } from "../components/Avatar";
import { InlineError } from "../components/responseTypes/error/InlineError";
import { IconHolder } from "../components/util/IconHolder";
import { ImageWithFallback } from "../components/util/ImageWithFallback";
import VisuallyHidden from "../components/util/VisuallyHidden";
import { HasAriaAnnouncer, withAriaAnnouncer } from "../hocs/withAriaAnnouncer";
import { HasServiceManager } from "../hocs/withServiceManager";
import actions from "../store/actions";
import { AppConfig } from "../../../types/state/AppConfig";
import { HasClassName } from "../../../types/utilities/HasClassName";
import { HasDoAutoScroll } from "../../../types/utilities/HasDoAutoScroll";
import HasIntl from "../../../types/utilities/HasIntl";
import HasLanguagePack from "../../../types/utilities/HasLanguagePack";
import {
  LocalMessageItem,
  MessageErrorState,
} from "../../../types/messaging/LocalMessageItem";
import { FileStatusValue } from "../utils/constants";
import { doFocusRef } from "../utils/domUtils";
import {
  isConnectToHumanAgent,
  isFullWidthUserDefined,
  isOptionItem,
  isRequest,
  isResponse,
  isSingleItemCarousel,
  renderAsUserDefinedMessage,
} from "../utils/messageUtils";
import { createDidCatchErrorData } from "../utils/miscUtils";
import { timestampToTimeString } from "../utils/timeUtils";
import { type ScrollElementIntoViewFunction } from "./MessagesComponent";
import { MessageTypeComponent } from "./MessageTypeComponent";
import {
  HumanAgentMessageType,
  Message,
  MessageRequest,
  MessageResponseTypes,
  UserType,
  watsonx,
} from "../../../types/messaging/Messages";
import { CarbonTheme } from "../../../types/utilities/carbonTypes";
import { EnglishLanguagePack } from "../../../types/instance/apiTypes";
import { ResponseUserAvatar } from "../components/ResponseUserAvatar";

enum MoveFocusType {
  /**
   * Indicates that focus should be moved to the first message.
   */
  FIRST = 1,

  /**
   * Indicates that focus should be moved to the last message.
   */
  LAST = 2,

  /**
   * Indicates that focus should be moved to the next message.
   */
  NEXT = 3,

  /**
   * Indicates that focus should be moved to the previous message.
   */
  PREVIOUS = 4,

  /**
   * Indicates that focus should be moved back to the input field.
   */
  INPUT = 5,
}

interface MessageProps
  extends HasServiceManager,
    HasLanguagePack,
    HasClassName,
    HasAriaAnnouncer,
    HasDoAutoScroll {
  /**
   * The local message item that is part of the original message.
   */
  localMessageItem: LocalMessageItem;

  /**
   * The original message that came from the assistant.
   */
  message: Message;

  config: AppConfig;

  /**
   * A callback function that will request that focus be moved to the main input field.
   */
  requestInputFocus: () => void;
  messagesIndex: number;

  /**
   * The name of the bot.
   */
  botName: string;

  /**
   * Indicates if any user inputs on this message should be disabled such as buttons or dropdowns.
   */
  disableUserInputs: boolean;

  /**
   * Required due to a bug in injectIntl: https://github.com/formatjs/react-intl/issues/1444.
   */
  ref: (component: MessageComponent) => void;

  /**
   * A callback used to move focus.
   */
  requestMoveFocus: (
    moveFocusType: MoveFocusType,
    currentMessageIndex: number,
  ) => void;

  /**
   * Indicates if this message is part the most recent message response that allows for input.
   */
  isMessageForInput: boolean;

  /**
   * This is used to scroll elements of messages into view.
   */
  scrollElementIntoView: ScrollElementIntoViewFunction;

  /**
   * Indicates if this message item is the first item in a message response.
   */
  isFirstMessageItem: boolean;

  /**
   * Indicates if this message item is the last item in a message response.
   */
  isLastMessageItem: boolean;

  /**
   * The current locale. This value is not directly used by this component. It is indirectly used by the dayjs
   * library which formats the timestamps in this message. However, it needs to be passed a prop to ensure that this
   * component re-renders if the locale changes.
   */
  locale: string;

  /**
   * The URL for the bot avatar.
   */
  botAvatarURL: string;

  /**
   * Indicates if the avatar line should be shown for this message.
   */
  showAvatarLine: boolean;

  /**
   * Indicates which CarbonTheme is being used.
   */
  carbonTheme: CarbonTheme;

  /**
   * Indicates if the AI theme should be used.
   */
  useAITheme: boolean;

  /**
   * Indicates if all feedback components should be hidden.
   */
  hideFeedback: boolean;

  /**
   * Indicates if this message should permit the user to provide new feedback. The property has no effect if
   * {@link hideFeedback} is false.
   */
  allowNewFeedback: boolean;
}

interface MessageState {
  /**
   * Indicates that this component threw an error while rendered and that a generic error message should be
   * displayed instead.
   */
  didRenderErrorOccur: boolean;

  /**
   * Indicates if the focus handle has focus. This will be used to display the focus indicator on the message.
   */
  focusHandleHasFocus: boolean;
}

class MessageComponent extends PureComponent<
  MessageProps & HasIntl,
  MessageState
> {
  /**
   * Default state.
   */
  public readonly state: Readonly<MessageState> = {
    didRenderErrorOccur: false,
    focusHandleHasFocus: false,
  };

  /**
   * A reference to the root element in this component.
   */
  public ref = React.createRef<HTMLDivElement>();

  /**
   * A reference to the pure message element in this component.
   */
  public messageRef = React.createRef<HTMLDivElement>();

  /**
   * A reference to the focus handle element in this component.
   */
  public focusHandleRef = React.createRef<HTMLDivElement>();

  /**
   * Returns the value of the local message for the component.
   */
  public getLocalMessage = () => {
    return this.props.localMessageItem;
  };

  /**
   * Returns an ARIA message that can be used to indicate that the widget (either bot or agent) was responsible for
   * saying a specific message.
   */
  private getWidgetSaidMessage() {
    const { intl, botName, localMessageItem } = this.props;
    let messageId: keyof EnglishLanguagePack;
    if (localMessageItem.item.agent_message_type) {
      // For the human agent view, we only want to say "agent said" for messages that are text. The status messages
      // do not need this announcement.
      if (localMessageItem.item.response_type === MessageResponseTypes.TEXT) {
        messageId = "messages_agentSaid";
      }
    } else {
      messageId = "messages_botSaid";
    }

    return messageId
      ? intl.formatMessage({ id: messageId }, { botName })
      : null;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.serviceManager.actions.errorOccurred(
      createDidCatchErrorData("Message", error, errorInfo),
    );
    this.setState({ didRenderErrorOccur: true });
  }

  componentDidMount() {
    const uiState = this.props.localMessageItem.ui_state;
    if (uiState.needsAnnouncement) {
      this.props.ariaAnnouncer(this.ref.current);
      this.props.serviceManager.store.dispatch(
        actions.setMessageWasAnnounced(uiState.id),
      );
    }
  }

  componentDidUpdate() {
    const uiState = this.props.localMessageItem.ui_state;
    if (uiState.needsAnnouncement) {
      this.props.ariaAnnouncer(this.ref.current);
      this.props.serviceManager.store.dispatch(
        actions.setMessageWasAnnounced(uiState.id),
      );
    }
  }

  /**
   * Indicates if we should render the failed message instead of the actual message.
   */
  private shouldRenderFailedMessage() {
    if (this.state.didRenderErrorOccur) {
      return true;
    }

    const { localMessageItem, message } = this.props;

    // If the message is a CTA, has a service desk error, and we're supposed to report service desk errors, then we
    // need to render the failed message.
    return (
      isConnectToHumanAgent(localMessageItem.item) &&
      message.ui_state_internal?.agent_no_service_desk
    );
  }

  private reAnnounceFocusHandle() {
    const handle = this.focusHandleRef.current;
    if (!handle) {
      return;
    }
    this.props.ariaAnnouncer(handle.getAttribute("aria-label"));
  }

  /**
   * Moves focus to this message's focus handle.
   *
   * @see renderFocusHandle
   */
  public requestHandleFocus() {
    const { languagePack, intl, message, botName } = this.props;

    // Announce who said it and then the actual message. The "Bot said" text is normally only read once per
    // MessageResponse instead of once per LocalMessage but since we're moving focus between each LocalMessage, go
    // ahead and announce the "who" part for each one.
    const whoAnnouncement = isRequest(message)
      ? languagePack.messages_youSaid
      : intl.formatMessage({ id: "messages_botSaid" }, { botName });

    const strings: string[] = [whoAnnouncement];
    nodeToText(this.messageRef.current, strings);

    // Using this aria-label allows us to make sure that this text is read out loud before JAWS reads its "1 of 2"
    // list item message that it adds after reading the aria-label.
    this.focusHandleRef.current.setAttribute("aria-label", strings.join(" "));

    doFocusRef(this.focusHandleRef, true);
  }

  /**
   * Renders the error state version of this message. This code carefully avoids touching the message data as it
   * could be data that doesn't match what we were expecting.
   */
  private renderFailedRenderMessage() {
    const { messagesIndex } = this.props;
    return (
      <div
        className={`WAC__message WAC__message--inlineError WAC__message-${messagesIndex} ${
          this.props.className || ""
        }`}
        ref={this.ref}
      >
        <div className="WAC__message--padding">
          <div className="WAC__bot-message">
            <VisuallyHidden>{this.getWidgetSaidMessage()}</VisuallyHidden>
            <div className="WAC__received WAC__message-vertical-padding WAC__received--text">
              <InlineError
                text={this.props.languagePack.errors_singleMessage}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Renders the avatar line that appears above each message that has the avatar (for responses) and timestamps.
   */
  private renderAvatarLine(
    localMessageItem: LocalMessageItem,
    message: Message,
  ) {
    let avatar;
    const { languagePack, botName, botAvatarURL, useAITheme, carbonTheme } =
      this.props;

    const timestamp = timestampToTimeString(message.history.timestamp);

    let label;
    let actorName;
    let iconClassName = "";
    if (isResponse(message)) {
      // We'll use the first message item for deciding if we should show the agent's avatar.
      const agentMessageType = localMessageItem.item.agent_message_type;
      const responseUserProfile =
        message.message_options?.response_user_profile;

      if (isHumanAgentStatusMessage(agentMessageType)) {
        // These messages don't show an avatar line.
        return null;
      }

      const fromHumanAgent =
        agentMessageType === HumanAgentMessageType.FROM_HUMAN_AGENT;
      if (responseUserProfile?.profile_picture_url) {
        avatar = (
          <ImageWithFallback
            url={responseUserProfile?.profile_picture_url}
            alt={
              fromHumanAgent
                ? languagePack.agent_ariaResponseUserAvatar
                : languagePack.agent_ariaGenericAvatar
            }
            fallback={<IconHolder icon={<Headset />} />}
          />
        );
        iconClassName = "WACMessage__Avatar--agent";
        actorName = responseUserProfile?.nickname || "";
      } else {
        actorName = responseUserProfile?.nickname || botName;

        let icon = <IconHolder icon={<ChatBot />} />;

        if (useAITheme && actorName === watsonx) {
          icon = <Avatar theme={carbonTheme} />;
        }

        avatar = (
          <ImageWithFallback
            url={botAvatarURL}
            alt={languagePack.agent_ariaGenericBotAvatar}
            fallback={icon}
          />
        );

        if (responseUserProfile?.user_type === UserType.HUMAN) {
          avatar = (
            <ResponseUserAvatar
              responseUserProfile={responseUserProfile}
              languagePack={languagePack}
              width="32px"
              height="32px"
            />
          );
        }

        iconClassName = "WACMessage__Avatar--bot";
      }

      label = (
        <span data-wac-exclude-node-read>
          <FormattedMessage
            id="message_labelBot"
            values={{ timestamp, actorName }}
          />
        </span>
      );
    } else {
      label = <FormattedMessage id="message_labelYou" values={{ timestamp }} />;
    }

    return (
      <div className="WACMessage__AvatarLine" key={`${message.id}-avatar-line`}>
        {avatar && (
          <div className={`WACMessage__Avatar ${iconClassName}`}>{avatar}</div>
        )}
        <div className="WACMessage__Label">{label}</div>
      </div>
    );
  }

  /**
   * Renders the state indicator for the message sent by the user. This can appear on the left of message or beneath the
   * message.
   */
  private renderMessageState(message: MessageRequest) {
    const { languagePack } = this.props;
    let element;
    let className;
    let showBelowMessage = false;

    const errorState = message.history?.error_state;
    const fileStatus = message.history?.file_upload_status;

    if (errorState === MessageErrorState.FAILED) {
      element = <InlineError text={languagePack.errors_singleMessage} />;
      className = "WAC__message-error-failed";
      showBelowMessage = true;
    } else if (fileStatus === FileStatusValue.UPLOADING) {
      element = (
        <Loading
          withOverlay={false}
          small
          aria-label={languagePack.fileSharing_statusUploading}
        />
      );
      className = "WAC__message-status-file-uploading";
    } else if (fileStatus === "success") {
      element = (
        <CheckmarkFilled
          aria-label={languagePack.fileSharing_statusUploading}
        />
      );
      className = "WAC__message-status-file-success";
    }

    // We probably should include an aria-label here but since we explicit announce state changes in the message
    // service and this icon is contained in a live region, that would result in duplicate text being announced. We
    // can't rely solely on the aria-label here in this live region because the SRs don't seem to reliably announce
    // what we want to announce, moving to success for example. Our a11y expert says it's okay to leave it out here.
    return (
      element && {
        element: (
          <div className={`WAC__message-status ${className}`}>{element}</div>
        ),
        showBelowMessage,
      }
    );
  }

  /**
   * Renders a focus "handle" for this message. When this message gets focus, we actually move focus to an element
   * inside it instead of the entire message. This is only done when the user clicks the scroll handle button on the
   * scroll container that moves focus into the scroll panel or when focus moves from one message to another. We move
   * focus to the handle which is inside the message instead of the message itself because if we make the whole message
   * actually focusable then a screen reader will read the entire message whenever any item inside it gets focus which
   * is not desirable.
   */
  private renderFocusHandle() {
    return (
      // The aria-label is dynamically added when focused.
      // eslint-disable-next-line jsx-a11y/control-has-associated-label
      <div
        className="WACMessage--focusHandle"
        ref={this.focusHandleRef}
        tabIndex={-1}
        onFocus={this.onHandleFocus}
        onBlur={this.onHandleBlur}
        onKeyDown={(event) => this.onHandleKeyDown(event)}
        onClick={() => this.reAnnounceFocusHandle()}
        role="button"
      />
    );
  }

  /**
   * Called when the focus handle gets focus.
   */
  private onHandleFocus = () => {
    this.setState({ focusHandleHasFocus: true });
  };

  /**
   * Called when the focus handle loses focus.
   */
  private onHandleBlur = () => {
    this.setState({ focusHandleHasFocus: false });
  };

  /**
   * Called when a key down event occurs while the focus handle has focus.
   */
  private onHandleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) {
      // Don't do anything if any modifiers are present.
      return;
    }

    let moveFocus: MoveFocusType;
    if (event.key === "ArrowUp") {
      moveFocus = MoveFocusType.PREVIOUS;
    } else if (event.key === "ArrowDown") {
      moveFocus = MoveFocusType.NEXT;
    } else if (event.key === "Home") {
      moveFocus = MoveFocusType.FIRST;
    } else if (event.key === "End") {
      moveFocus = MoveFocusType.LAST;
    } else if (event.key === "Escape") {
      moveFocus = MoveFocusType.INPUT;
    } else if (event.key === "Enter" || event.key === " ") {
      // Prevent native scrolling on Space
      event.preventDefault();
      this.reAnnounceFocusHandle(); // Re-announce message content
      return;
    }

    if (moveFocus) {
      // This will stop the scroll panel from moving as a result of the keypress. We only want it to move as a
      // result of the focus change.
      event.preventDefault();
      this.props.requestMoveFocus(moveFocus, this.props.messagesIndex);
    }
  };

  render() {
    if (this.shouldRenderFailedMessage()) {
      // If an error occurred, don't attempt to do anything with the message. Just show an error.
      return this.renderFailedRenderMessage();
    }

    const {
      serviceManager,
      config,
      localMessageItem,
      message,
      languagePack,
      requestInputFocus,
      messagesIndex,
      disableUserInputs,
      showAvatarLine,
      className,
      doAutoScroll,
      isMessageForInput,
      scrollElementIntoView,
      isFirstMessageItem,
      isLastMessageItem,
      hideFeedback,
      allowNewFeedback,
    } = this.props;

    const { isIntermediateStreaming, isWelcomeResponse, disableFadeAnimation } =
      localMessageItem.ui_state;
    const messageItem = localMessageItem.item;
    const responseType = messageItem.response_type;
    const agentMessageType = messageItem.agent_message_type;
    const fromHistory = message.ui_state_internal?.from_history;
    const readWidgetSaid = isFirstMessageItem;

    if (
      isIntermediateStreaming &&
      !canRenderIntermediateStreaming(messageItem.response_type)
    ) {
      return false;
    }

    const messageComponent = (
      <MessageTypeComponent
        serviceManager={serviceManager}
        languagePack={languagePack}
        requestInputFocus={requestInputFocus}
        message={localMessageItem}
        originalMessage={message}
        disableUserInputs={disableUserInputs}
        isMessageForInput={isMessageForInput}
        config={config}
        doAutoScroll={doAutoScroll}
        scrollElementIntoView={scrollElementIntoView}
        showChainOfThought={isLastMessageItem}
        hideFeedback={hideFeedback}
        allowNewFeedback={allowNewFeedback}
      />
    );

    const isCustomMessage = renderAsUserDefinedMessage(localMessageItem.item);

    // Don't show animation on the welcome node or for messages that explicitly turn it off.
    const noAnimation = isWelcomeResponse || disableFadeAnimation;

    // If this is a user_defined response type with silent set, we don't want to render all the extra cruft around it.
    const agentClassName = agentMessageType
      ? getHumanAgentMessageClassName(
          agentMessageType,
          responseType,
          isCustomMessage,
        )
      : null;

    const messageIsRequest = isRequest(message);
    const isSystemMessage = isHumanAgentStatusMessage(
      localMessageItem.item.agent_message_type,
    );

    let isOptionResponseWithoutTitleOrDescription = false;
    if (isOptionItem(localMessageItem.item)) {
      if (!localMessageItem.item.title && !localMessageItem.item.description) {
        isOptionResponseWithoutTitleOrDescription = true;
      }
    }

    let messageState;
    if (messageIsRequest) {
      messageState = this.renderMessageState(message);
    }

    return (
      <div
        id={`WAC__message-${messagesIndex}${serviceManager.namespace.suffix}`}
        className={cx(
          `WAC__message WAC__message-${messagesIndex}`,
          className,
          agentMessageType && "WAC__message--agentMessage",
          {
            "WAC__message--withAvatarLine": showAvatarLine,
            "WAC__message--request": messageIsRequest,
            "WAC__message--systemMessage": isSystemMessage,
            "WAC__message--response": !messageIsRequest,
            "WAC__message--no-animation": noAnimation,
            "WAC__message--custom": isCustomMessage,
            "WAC__message--disabled-inputs": disableUserInputs,
            "WAC__message--has-focus": this.state.focusHandleHasFocus,
            "WAC__message--option-response-without-title-or-description":
              isOptionResponseWithoutTitleOrDescription,
          },
        )}
        ref={this.ref}
      >
        {this.renderFocusHandle()}
        {showAvatarLine && this.renderAvatarLine(localMessageItem, message)}
        <div className="WAC__message--padding">
          {isResponse(message) && (
            <div className="WAC__bot-message">
              {readWidgetSaid && (
                <VisuallyHidden>{this.getWidgetSaidMessage()}</VisuallyHidden>
              )}
              <div
                className={cx(
                  "WAC__received",
                  "WAC__message-vertical-padding",
                  agentClassName,
                  {
                    "WAC__received--fromHuman":
                      !agentMessageType &&
                      message.message_options?.response_user_profile
                        ?.user_type === UserType.HUMAN,
                    "WAC__received--text":
                      responseType === MessageResponseTypes.TEXT,
                    "WAC__received--image":
                      responseType === MessageResponseTypes.IMAGE,
                    "WAC__received--options":
                      responseType === MessageResponseTypes.OPTION,
                    "WAC__received--inlineError":
                      responseType === MessageResponseTypes.INLINE_ERROR,
                    "WAC__received--iframePreviewCard":
                      responseType === MessageResponseTypes.IFRAME,
                    "WAC__received--video":
                      responseType === MessageResponseTypes.VIDEO,
                    "WAC__received--audio":
                      responseType === MessageResponseTypes.AUDIO,
                    "WAC__received--date":
                      responseType === MessageResponseTypes.DATE,
                    "WAC__received--card":
                      responseType === MessageResponseTypes.CARD,
                    "WAC__received--carousel":
                      responseType === MessageResponseTypes.CAROUSEL,
                    "WAC__received--conversationalSearch":
                      responseType ===
                      MessageResponseTypes.CONVERSATIONAL_SEARCH,
                    "WAC__received--carouselSingle": isSingleItemCarousel(
                      localMessageItem.item,
                    ),
                    "WAC__received--button":
                      responseType === MessageResponseTypes.BUTTON,
                    "WAC__received--grid":
                      responseType === MessageResponseTypes.GRID,
                    "WAC__received--fullWidth": isFullWidthUserDefined(
                      localMessageItem.item,
                    ),
                    "WAC__message--historical": fromHistory,
                  },
                )}
                ref={this.messageRef}
              >
                <div className="WAC__received--inner">{messageComponent}</div>
              </div>
            </div>
          )}
          {messageIsRequest && (
            <div className="WAC__sent-container">
              <div
                className={cx(
                  "WAC__sentAndMessageState-container",
                  "WAC__message-vertical-padding",
                  {
                    "WAC__sentAndMessageState--belowMessage":
                      messageState?.showBelowMessage,
                  },
                )}
              >
                {/* messageState is empty, or the messageState is not empty and the messageState should not be below the message. */}
                {!messageState?.showBelowMessage && messageState?.element}
                <div className="WAC__sent">
                  <VisuallyHidden>
                    {languagePack.messages_youSaid}
                  </VisuallyHidden>
                  <div className="WAC__sent--bubble">
                    <div ref={this.messageRef}>{messageComponent}</div>
                  </div>
                </div>
                {messageState?.showBelowMessage && messageState?.element}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

/**
 * Returns the class name to add to messages with the given agent message type.
 */
function getHumanAgentMessageClassName(
  agentMessageType: HumanAgentMessageType,
  messageResponseType: MessageResponseTypes,
  isUserDefinedResponse: boolean,
) {
  if (agentMessageType && isUserDefinedResponse) {
    return "WAC__received--agentCustom";
  }
  if (
    !messageResponseType ||
    (messageResponseType !== MessageResponseTypes.TEXT &&
      messageResponseType !== MessageResponseTypes.BUTTON)
  ) {
    return "";
  }
  switch (agentMessageType) {
    case null:
    case undefined:
    case HumanAgentMessageType.FROM_USER:
      return null;
    case HumanAgentMessageType.RELOAD_WARNING:
    case HumanAgentMessageType.DISCONNECTED:
      return "WAC__received--chatStatusMessage";
    case HumanAgentMessageType.FROM_HUMAN_AGENT:
      return "WAC__received--fromHuman";
    default:
      return "WAC__received--agentStatusMessage";
  }
}

/**
 * Indicates if this message is a status message. These are messages that are centered in the view.
 */
function isHumanAgentStatusMessage(agentMessageType: HumanAgentMessageType) {
  switch (agentMessageType) {
    case null:
    case undefined:
    case HumanAgentMessageType.FROM_USER:
    case HumanAgentMessageType.RELOAD_WARNING:
    case HumanAgentMessageType.DISCONNECTED:
    case HumanAgentMessageType.FROM_HUMAN_AGENT:
    case HumanAgentMessageType.INLINE_ERROR:
      return false;
    default:
      return true;
  }
}

/**
 * Indicates if an item with the given response type is allowed to be rendered in an intermediate stream state.
 */
function canRenderIntermediateStreaming(type: MessageResponseTypes) {
  switch (type) {
    case MessageResponseTypes.IMAGE:
    case MessageResponseTypes.VIDEO:
    case MessageResponseTypes.AUDIO:
    case MessageResponseTypes.OPTION:
    case MessageResponseTypes.IFRAME:
    case MessageResponseTypes.INLINE_ERROR:
    case MessageResponseTypes.CONVERSATIONAL_SEARCH:
    case MessageResponseTypes.USER_DEFINED:
    case MessageResponseTypes.TEXT:
      return true;
    default:
      return false;
  }
}

export default withAriaAnnouncer(
  injectIntl(MessageComponent, { forwardRef: true }),
);
export { MessageComponent as MessageClass, MoveFocusType };

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ChatBot32 from "@carbon/icons/es/chat-bot/32.js";
import CheckmarkFilled16 from "@carbon/icons/es/checkmark--filled/16.js";
import Headset32 from "@carbon/icons/es/headset/32.js";
import ReasoningStepsComponent from "@carbon/ai-chat-components/es/react/reasoning-steps.js";
import ReasoningStepComponent from "@carbon/ai-chat-components/es/react/reasoning-step.js";
import ReasoningStepsToggle from "@carbon/ai-chat-components/es/react/reasoning-steps-toggle.js";
import type CDSAIChatReasoningSteps from "@carbon/ai-chat-components/es/components/reasoning-steps/src/reasoning-steps.js";
import { type ReasoningStepsToggleEventDetail } from "@carbon/ai-chat-components/es/components/reasoning-steps/src/reasoning-steps-toggle.js";
import { carbonIconToReact } from "../utils/carbonIcon";
import Loading from "../components/carbon/Loading";
import cx from "classnames";
import React, { KeyboardEvent, PureComponent } from "react";
import { FormattedMessage, injectIntl } from "react-intl";

import { nodeToText } from "./aria/AriaAnnouncerComponent";
import { Avatar } from "./Avatar";
import { InlineError } from "./responseTypes/error/InlineError";
import { IconHolder } from "./util/IconHolder";
import { ImageWithFallback } from "./util/ImageWithFallback";
import VisuallyHidden from "./util/VisuallyHidden";
import { HasAriaAnnouncer, withAriaAnnouncer } from "../hocs/withAriaAnnouncer";
import { HasServiceManager } from "../hocs/withServiceManager";
import actions from "../store/actions";
import { AppConfig } from "../../types/state/AppConfig";
import { HasClassName } from "../../types/utilities/HasClassName";
import { HasDoAutoScroll } from "../../types/utilities/HasDoAutoScroll";
import HasIntl from "../../types/utilities/HasIntl";
import HasLanguagePack from "../../types/utilities/HasLanguagePack";
import {
  LocalMessageItem,
  MessageErrorState,
} from "../../types/messaging/LocalMessageItem";
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
  ReasoningStep as ReasoningStepData,
  ReasoningStepOpenState,
  ReasoningSteps as ReasoningStepsData,
  ResponseUserProfile,
  TextItem,
  UserType,
} from "../../types/messaging/Messages";
import { LanguagePack } from "../../types/config/PublicConfig";
import { ResponseUserAvatar } from "./ResponseUserAvatar";
import { CarbonTheme } from "../../types/config/PublicConfig";
import RichText from "./responseTypes/util/RichText";

const ChatBot = carbonIconToReact(ChatBot32);
const CheckmarkFilled = carbonIconToReact(CheckmarkFilled16);
const Headset = carbonIconToReact(Headset32);

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
  extends
    HasServiceManager,
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
   * The name of the assistant.
   */
  assistantName: string;

  /**
   * Indicates if any user inputs on this message should be disabled such as buttons or dropdowns.
   */
  disableUserInputs: boolean;

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

  /**
   * Tracks whether auto-controlled reasoning steps should be open.
   */
  autoReasoningContainerOpen?: boolean;

  /**
   * Tracks whether each auto-controlled reasoning step should be open.
   */
  autoReasoningStepOpenStates: boolean[];

  /**
   * Tracks if auto-controlled reasoning has already collapsed due to response content.
   */
  autoReasoningHasAutoCollapsed: boolean;

  /**
   * Tracks manual open/close state for reasoning steps when they are not auto-controlled.
   */
  manualReasoningOpen?: boolean;
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
    autoReasoningContainerOpen: true,
    autoReasoningStepOpenStates: [],
    autoReasoningHasAutoCollapsed: false,
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

  private isAgent: boolean;
  /**
   * Returns an ARIA message that can be used to indicate that the widget (either assistant or agent) was responsible for
   * saying a specific message.
   */
  private getWidgetSaidMessage() {
    const { intl, assistantName, localMessageItem } = this.props;
    let messageId: keyof LanguagePack;
    if (localMessageItem.item.agent_message_type) {
      // For the human agent view, we only want to say "agent said" for messages that are text. The status messages
      // do not need this announcement.
      if (localMessageItem.item.response_type === MessageResponseTypes.TEXT) {
        messageId = "messages_agentSaid";
        this.isAgent = true;
      }
    } else {
      messageId = "messages_assistantSaid";
      this.isAgent = false;
    }
    return messageId
      ? intl.formatMessage({ id: messageId }, { assistantName })
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
    this.syncAutoReasoningState();
  }

  componentDidUpdate() {
    const uiState = this.props.localMessageItem.ui_state;
    if (uiState.needsAnnouncement) {
      this.props.ariaAnnouncer(this.ref.current);
      this.props.serviceManager.store.dispatch(
        actions.setMessageWasAnnounced(uiState.id),
      );
    }
    this.syncAutoReasoningState();
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
    const { languagePack, intl, message, assistantName } = this.props;

    // Announce who said it and then the actual message. The "Assistant said" text is normally only read once per
    // MessageResponse instead of once per LocalMessage but since we're moving focus between each LocalMessage, go
    // ahead and announce the "who" part for each one.
    const whoAnnouncement = isRequest(message)
      ? languagePack.messages_youSaid
      : intl.formatMessage({ id: "messages_assistantSaid" }, { assistantName });

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
        className={`cds-aichat--message cds-aichat--message--inline-error cds-aichat--message-${messagesIndex} ${
          this.props.className || ""
        }`}
        ref={this.ref}
      >
        <div className="cds-aichat--message--padding">
          <div className="cds-aichat--assistant-message">
            <VisuallyHidden>{this.getWidgetSaidMessage()}</VisuallyHidden>
            <div className="cds-aichat--received cds-aichat--message-vertical-padding cds-aichat--received--text">
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
    const { languagePack, assistantName, useAITheme, carbonTheme } = this.props;

    const timestamp = timestampToTimeString(message.history.timestamp);

    let label;
    let actorName;
    let iconClassName = "";
    let reasoning;

    if (isResponse(message)) {
      // We'll use the first message item for deciding if we should show the agent's avatar.
      const agentMessageType = localMessageItem.item.agent_message_type;
      const responseUserProfile: ResponseUserProfile = message.message_options
        ?.response_user_profile || {
        id: "watsonx",
        nickname: "watsonx",
        user_type: UserType.WATSONX,
      };

      if (isHumanAgentStatusMessage(agentMessageType)) {
        // These messages don't show an avatar line.
        return null;
      }

      const fromHumanAgent =
        agentMessageType === HumanAgentMessageType.FROM_HUMAN_AGENT;
      if (
        responseUserProfile.profile_picture_url &&
        responseUserProfile.user_type !== UserType.WATSONX
      ) {
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
        iconClassName = "cds-aichat--message__avatar--agent";
        actorName = responseUserProfile?.nickname || "";
      } else {
        actorName =
          responseUserProfile?.nickname === "watsonx" && assistantName
            ? assistantName
            : responseUserProfile?.nickname;

        let icon = <IconHolder icon={<ChatBot />} />;

        if (useAITheme && responseUserProfile.user_type === UserType.WATSONX) {
          icon = <Avatar theme={carbonTheme} />;
        }

        avatar = (
          <ImageWithFallback
            url={responseUserProfile?.profile_picture_url}
            alt={languagePack.agent_ariaGenericAssistantAvatar}
            fallback={icon}
          />
        );

        if (responseUserProfile.user_type === UserType.HUMAN) {
          avatar = (
            <ResponseUserAvatar
              responseUserProfile={responseUserProfile}
              languagePack={languagePack}
              width="32px"
              height="32px"
            />
          );
        }

        iconClassName = "cds-aichat--message__avatar--assistant";
      }

      label = (
        <span data-cds-aichat-exclude-node-read>
          <FormattedMessage
            id="message_labelAssistant"
            values={{ timestamp, actorName }}
          />
        </span>
      );

      const reasoningData = message.message_options?.reasoning;
      if (reasoningData?.steps?.length || reasoningData?.content) {
        const isOpen = this.getReasoningContainerOpen(reasoningData);
        reasoning = (
          <>
            <span className="cds-aichat--message__reasoning-separator">|</span>
            <ReasoningStepsToggle
              open={isOpen}
              panelID={this.getReasoningContainerId()}
              openLabelText={languagePack.reasoningSteps_mainLabelOpen}
              closedLabelText={languagePack.reasoningSteps_mainLabelClosed}
              onToggle={this.handleReasoningToggleClick}
            />
          </>
        );
      }
    } else {
      label = <FormattedMessage id="message_labelYou" values={{ timestamp }} />;
    }

    return (
      <div
        className="cds-aichat--message__avatar-line"
        key={`${message.id}-avatar-line`}
      >
        {avatar && (
          <div className={`cds-aichat--message__avatar ${iconClassName}`}>
            {avatar}
          </div>
        )}
        <div className="cds-aichat--message__label">{label}</div>
        <div className="cds-aichat--message__reasoning">{reasoning}</div>
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
      className = "cds-aichat--message-error-failed";
      showBelowMessage = true;
    } else if (fileStatus === FileStatusValue.UPLOADING) {
      element = (
        <Loading
          active
          overlay={false}
          small
          assistiveText={languagePack.fileSharing_statusUploading}
        />
      );
      className = "cds-aichat--message-status-file-uploading";
    } else if (fileStatus === "success") {
      element = (
        <CheckmarkFilled
          aria-label={languagePack.fileSharing_statusUploading}
        />
      );
      className = "cds-aichat--message-status-file-success";
    }

    // We probably should include an aria-label here but since we explicit announce state changes in the message
    // service and this icon is contained in a live region, that would result in duplicate text being announced. We
    // can't rely solely on the aria-label here in this live region because the SRs don't seem to reliably announce
    // what we want to announce, moving to success for example. Our a11y expert says it's okay to leave it out here.
    return (
      element && {
        element: (
          <div className={`cds-aichat--message-status ${className}`}>
            {element}
          </div>
        ),
        showBelowMessage,
      }
    );
  }

  private renderReasoningSteps(
    reasoning?: ReasoningStepsData,
    streaming?: boolean,
  ) {
    const steps = reasoning?.steps;

    const hasSteps = Boolean(steps && steps.length);
    const hasContent = Boolean(reasoning?.content);

    if (!hasSteps && !hasContent) {
      return null;
    }

    const isAutoControlled = this.isAutoReasoning(this.props.message);
    const containerOpen = this.getReasoningContainerOpen(reasoning);

    return (
      <div className="cds-aichat--message__reasoning-steps">
        <ReasoningStepsComponent
          controlled
          id={this.getReasoningContainerId()}
          open={containerOpen}
          onToggle={
            isAutoControlled ? this.handleAutoReasoningToggle : undefined
          }
        >
          {hasContent && reasoning?.content && (
            <RichText
              text={reasoning.content}
              highlight={true}
              streaming={streaming}
            />
          )}
          {(steps ?? []).map((step: ReasoningStepData, index: number) => {
            const stepOpenState = step.open_state;
            const hasExplicitStepState =
              typeof stepOpenState !== "undefined" &&
              stepOpenState !== ReasoningStepOpenState.DEFAULT;
            const autoState = this.state.autoReasoningStepOpenStates[index];
            const stepOpen = hasExplicitStepState
              ? stepOpenState === ReasoningStepOpenState.OPEN
              : isAutoControlled
                ? typeof autoState === "boolean"
                  ? autoState
                  : index === steps.length - 1
                    ? containerOpen
                    : false
                : containerOpen && index === steps.length - 1;
            const stepToggleHandler =
              isAutoControlled && !hasExplicitStepState
                ? (event: CustomEvent<{ open: boolean }>) =>
                    this.handleAutoReasoningStepToggle(index, event)
                : undefined;

            const stepContent = step.content ? (
              <RichText
                text={step.content}
                highlight={true}
                streaming={streaming}
              />
            ) : null;

            return (
              <ReasoningStepComponent
                key={`${this.props.message.id}-reasoning-${index}`}
                title={step.title}
                open={stepOpen}
                controlled
                onToggle={stepToggleHandler}
              >
                {stepContent}
              </ReasoningStepComponent>
            );
          })}
        </ReasoningStepsComponent>
      </div>
    );
  }

  private isAutoReasoning(message: Message) {
    if (!isResponse(message)) {
      return false;
    }
    const reasoning = message.message_options?.reasoning;
    const hasSteps = Boolean(reasoning?.steps && reasoning.steps.length);
    const hasContent = Boolean(reasoning?.content);
    if (!hasSteps && !hasContent) {
      return false;
    }
    const containerState = reasoning.open_state;
    return (
      typeof containerState === "undefined" ||
      containerState === ReasoningStepOpenState.DEFAULT
    );
  }

  private shouldCloseReasoning(localMessageItem?: LocalMessageItem) {
    if (!localMessageItem || !localMessageItem.item?.response_type) {
      return false;
    }
    const { item, ui_state: uiState } = localMessageItem;
    if (item.response_type === MessageResponseTypes.TEXT) {
      const textFromStreaming = uiState.streamingState
        ? uiState.streamingState.chunks
            .map((chunk) => (chunk as Partial<TextItem>).text ?? "")
            .join("")
        : undefined;
      const text = (item as TextItem).text.length
        ? (item as TextItem).text
        : textFromStreaming;
      return Boolean(text && text.trim());
    }
    return true;
  }

  private getReasoningContainerOpen(reasoning?: ReasoningStepsData) {
    const containerOpenState = reasoning?.open_state;
    const hasExplicitContainerState =
      typeof containerOpenState !== "undefined" &&
      containerOpenState !== ReasoningStepOpenState.DEFAULT;

    if (typeof this.state.manualReasoningOpen === "boolean") {
      return this.state.manualReasoningOpen;
    }

    if (hasExplicitContainerState) {
      return containerOpenState === ReasoningStepOpenState.OPEN;
    }

    return this.state.autoReasoningContainerOpen ?? true;
  }

  private getReasoningContainerId() {
    return `cds-aichat-reasoning-${this.props.message.id}`;
  }

  private handleReasoningToggleClick = (
    event?: CustomEvent<ReasoningStepsToggleEventDetail>,
  ) => {
    if (!isResponse(this.props.message)) {
      return;
    }
    const reasoning = this.props.message.message_options?.reasoning;
    const nextOpen =
      typeof event?.detail?.open === "boolean"
        ? event.detail.open
        : !this.getReasoningContainerOpen(reasoning);

    if (this.isAutoReasoning(this.props.message)) {
      this.setState({ autoReasoningContainerOpen: nextOpen });
    } else {
      this.setState({ manualReasoningOpen: nextOpen });
    }
  };

  private syncAutoReasoningState() {
    if (
      !this.isAutoReasoning(this.props.message) ||
      !isResponse(this.props.message)
    ) {
      return;
    }

    const reasoningSteps =
      this.props.message?.message_options?.reasoning?.steps ?? [];
    const shouldClose = this.shouldCloseReasoning(this.props.localMessageItem);

    this.setState((prevState) => {
      let containerOpen =
        typeof prevState.autoReasoningContainerOpen === "boolean"
          ? prevState.autoReasoningContainerOpen
          : true;

      const prevStepStates = prevState.autoReasoningStepOpenStates.slice(
        0,
        reasoningSteps.length,
      );

      const hasMatchingLength = prevStepStates.length === reasoningSteps.length;

      const lastIndex = Math.max(0, reasoningSteps.length - 1);
      const nextStepStates =
        hasMatchingLength && prevStepStates.length
          ? prevStepStates
          : reasoningSteps.map((_, index) =>
              index === lastIndex ? containerOpen : false,
            );

      let containerChanged = false;
      let stepsChanged =
        nextStepStates.length !==
          prevState.autoReasoningStepOpenStates.length ||
        nextStepStates.some(
          (value, index) =>
            value !== prevState.autoReasoningStepOpenStates[index],
        );

      let hasAutoCollapsed = prevState.autoReasoningHasAutoCollapsed;

      if (shouldClose && !hasAutoCollapsed && containerOpen) {
        containerOpen = false;
        containerChanged = true;
        stepsChanged = true;
        hasAutoCollapsed = true;
      }

      const stepStates = shouldClose
        ? nextStepStates.map(() => false)
        : nextStepStates;

      if (
        containerChanged ||
        stepsChanged ||
        hasAutoCollapsed !== prevState.autoReasoningHasAutoCollapsed
      ) {
        return {
          autoReasoningContainerOpen: containerOpen,
          autoReasoningStepOpenStates: stepStates,
          autoReasoningHasAutoCollapsed: hasAutoCollapsed,
        };
      }

      return null;
    });
  }

  private handleAutoReasoningToggle = (
    event: React.ToggleEvent<CDSAIChatReasoningSteps>,
  ) => {
    if (!this.isAutoReasoning(this.props.message)) {
      return;
    }
    const open =
      typeof event?.newState !== "undefined"
        ? event.newState === "open"
        : Boolean(
            (event as unknown as CustomEvent<{ open: boolean }>).detail?.open ??
            event.currentTarget?.open,
          );
    this.setState((prevState) => {
      if (prevState.autoReasoningContainerOpen === open) {
        return null;
      }
      return {
        autoReasoningContainerOpen: open,
      };
    });
  };

  private handleAutoReasoningStepToggle = (
    index: number,
    event: CustomEvent<{ open: boolean }>,
  ) => {
    if (!this.isAutoReasoning(this.props.message)) {
      return;
    }
    const open = Boolean(event?.detail?.open);
    this.setState((prevState) => {
      if (prevState.autoReasoningStepOpenStates[index] === open) {
        return null;
      }
      const nextStates = prevState.autoReasoningStepOpenStates.slice();
      nextStates[index] = open;
      return {
        autoReasoningStepOpenStates: nextStates,
      };
    });
  };

  /**
   * Renders a focus "handle" for this message. When this message gets focus, we actually move focus to an element
   * inside it instead of the entire message. This is only done when the user clicks the scroll handle button on the
   * scroll container that moves focus into the scroll panel or when focus moves from one message to another. We move
   * focus to the handle which is inside the message instead of the message itself because if we make the whole message
   * actually focusable then a screen reader will read the entire message whenever any item inside it gets focus which
   * is not desirable.
   */
  private renderFocusHandle() {
    const { languagePack } = this.props;
    return (
      <div
        className="cds-aichat--message--focus-handle"
        ref={this.focusHandleRef}
        tabIndex={-1}
        onFocus={this.onHandleFocus}
        onBlur={this.onHandleBlur}
        onKeyDown={(event) => this.onHandleKeyDown(event)}
        onClick={() => this.reAnnounceFocusHandle()}
        role="button"
        aria-label={languagePack.messages_focusHandle}
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

    const { isIntermediateStreaming } = localMessageItem.ui_state;
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
        data-testid={`message-by-index-${messagesIndex}${serviceManager.namespace.suffix}`}
        className={cx(
          `cds-aichat--message cds-aichat--message-${messagesIndex}`,
          className,
          agentMessageType && "cds-aichat--message--agent-message",
          {
            "cds-aichat--message--with-avatar-line": showAvatarLine,
            "cds-aichat--with-human-agent": this.isAgent,
            "cds-aichat--message--request": messageIsRequest,
            "cds-aichat--message--system-message": isSystemMessage,
            "cds-aichat--message--response": !messageIsRequest,
            "cds-aichat--message--custom": isCustomMessage,
            "cds-aichat--message--disabled-inputs": disableUserInputs,
            "cds-aichat--message--has-focus": this.state.focusHandleHasFocus,
            "cds-aichat--message--option-response-without-title-or-description":
              isOptionResponseWithoutTitleOrDescription,
          },
        )}
        ref={this.ref}
      >
        {this.renderFocusHandle()}
        {showAvatarLine && this.renderAvatarLine(localMessageItem, message)}
        <div className="cds-aichat--message--padding">
          {isResponse(message) && (
            <div className="cds-aichat--assistant-message">
              {readWidgetSaid && (
                <VisuallyHidden>{this.getWidgetSaidMessage()}</VisuallyHidden>
              )}
              <div
                className={cx(
                  "cds-aichat--received",
                  "cds-aichat--message-vertical-padding",
                  agentClassName,
                  {
                    "cds-aichat--received--from-human":
                      !agentMessageType &&
                      message.message_options?.response_user_profile
                        ?.user_type === UserType.HUMAN,
                    "cds-aichat--received--text":
                      responseType === MessageResponseTypes.TEXT,
                    "cds-aichat--received--image":
                      responseType === MessageResponseTypes.IMAGE,
                    "cds-aichat--received--options":
                      responseType === MessageResponseTypes.OPTION,
                    "cds-aichat--received--inline-error":
                      responseType === MessageResponseTypes.INLINE_ERROR,
                    "cds-aichat--received--iframe-preview-card":
                      responseType === MessageResponseTypes.IFRAME,
                    "cds-aichat--received--video":
                      responseType === MessageResponseTypes.VIDEO,
                    "cds-aichat--received--audio":
                      responseType === MessageResponseTypes.AUDIO,
                    "cds-aichat--received--date":
                      responseType === MessageResponseTypes.DATE,
                    "cds-aichat--received--card":
                      responseType === MessageResponseTypes.CARD,
                    "cds-aichat--received--carousel":
                      responseType === MessageResponseTypes.CAROUSEL,
                    "cds-aichat--received--conversational-search":
                      responseType ===
                      MessageResponseTypes.CONVERSATIONAL_SEARCH,
                    "cds-aichat--received--carousel-single":
                      isSingleItemCarousel(localMessageItem.item),
                    "cds-aichat--received--button":
                      responseType === MessageResponseTypes.BUTTON,
                    "cds-aichat--received--grid":
                      responseType === MessageResponseTypes.GRID,
                    "cds-aichat--received--full-width": isFullWidthUserDefined(
                      localMessageItem.item,
                    ),
                    "cds-aichat--message--historical": fromHistory,
                  },
                )}
                ref={this.messageRef}
              >
                <div className="cds-aichat--received--inner">
                  {isFirstMessageItem &&
                    this.renderReasoningSteps(
                      message.message_options?.reasoning,
                      Boolean(
                        localMessageItem.ui_state.streamingState &&
                        !localMessageItem.ui_state.streamingState.isDone,
                      ),
                    )}
                  {messageComponent}
                </div>
              </div>
            </div>
          )}
          {messageIsRequest && (
            <div className="cds-aichat--sent-container">
              <div
                className={cx(
                  "cds-aichat--sent-and-message-state-container",
                  "cds-aichat--message-vertical-padding",
                  {
                    "cds-aichat--sent-and-message-state--below-message":
                      messageState?.showBelowMessage,
                  },
                )}
              >
                {/* messageState is empty, or the messageState is not empty and the messageState should not be below the message. */}
                {!messageState?.showBelowMessage && messageState?.element}
                <div className="cds-aichat--sent">
                  <VisuallyHidden>
                    {languagePack.messages_youSaid}
                  </VisuallyHidden>
                  <div className="cds-aichat--sent--bubble">
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
    return "cds-aichat--received--agent-custom";
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
      return "cds-aichat--received--chat-status-message";
    case HumanAgentMessageType.FROM_HUMAN_AGENT:
      return "cds-aichat--received--from-human";
    default:
      return "cds-aichat--received--agent-status-message";
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

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/* eslint-disable react/no-array-index-key */

import Attachment16 from "@carbon/icons/es/attachment/16.js";
import { carbonIconToReact } from "./../utils/carbonIcon";
import React, { useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useSelector } from "../hooks/useSelector";
import { shallowEqual } from "../store/appStore";

import {
  BusEventFeedback,
  BusEventType,
  FeedbackInteractionType,
} from "../../types/events/eventBusTypes";
import { FeedbackButtonsComponent } from "../ai-chat-components/react/components/feedback/FeedbackButtonsComponent";
import {
  FeedbackComponent,
  FeedbackSubmitDetails,
} from "../ai-chat-components/react/components/feedback/FeedbackComponent";
import { FeedbackInitialValues } from "../ai-chat-components/web-components/components/feedbackElement/src/FeedbackElement";
import { prefix } from "../ai-chat-components/web-components/settings";
import { ResponseStopped } from "./ResponseStopped";
import { ConnectToHumanAgent } from "./responseTypes/humanAgent/ConnectToHumanAgent";
import { AudioComponent } from "./responseTypes/audio/AudioComponent";
import { ButtonItemComponent } from "./responseTypes/buttonItem/ButtonItemComponent";
import { CardItemComponent } from "./responseTypes/card/CardItemComponent";
import { CarouselItemComponent } from "./responseTypes/carousel/CarouselItemComponent";
import { ConversationalSearch } from "./responseTypes/conversationalSearch/ConversationalSearch";
import UserDefinedResponse from "./responseTypes/custom/UserDefinedResponse";
import { DatePickerComponent } from "./responseTypes/datePicker/DatePickerComponent";
import InlineError from "./responseTypes/error/InlineError";
import { GridItemComponent } from "./responseTypes/grid/GridItemComponent";
import { IFrameMessage } from "./responseTypes/iframe/IFrameMessage";
import { Image } from "./responseTypes/image/Image";
import { OptionComponent } from "./responseTypes/options/OptionComponent";
import { StreamingRichText } from "./responseTypes/util/StreamingRichText";
import { VideoComponent } from "./responseTypes/video/VideoComponent";
import { useLanguagePack } from "../hooks/useLanguagePack";
import { useUUID } from "../hooks/useUUID";
import actions from "../store/actions";
import { selectHumanAgentDisplayState } from "../store/selectors";
import { AppState } from "../../types/state/AppState";
import {
  LocalMessageItem,
  MessageErrorState,
} from "../../types/messaging/LocalMessageItem";
import { MessageTypeComponentProps } from "../../types/messaging/MessageTypeComponentProps";
import {
  getMediaDimensions,
  isRequest,
  isResponse,
  isTextItem,
  renderAsUserDefinedMessage,
} from "../utils/messageUtils";
import { ChainOfThought } from "../ai-chat-components/react/components/chainOfThought/ChainOfThought";
import {
  AudioItem,
  ButtonItem,
  CardItem,
  CarouselItem,
  ConnectToHumanAgentItem,
  ConversationalSearchItem,
  DateItem,
  GridItem,
  IFrameItem,
  IFrameItemDisplayOption,
  ImageItem,
  InlineErrorItem,
  InternalMessageRequestType,
  Message,
  MessageHistoryFeedback,
  MessageInputType,
  MessageRequest,
  MessageResponse,
  MessageResponseHistory,
  MessageResponseTypes,
  OptionItem,
  TextItem,
  UserType,
  VideoItem,
} from "../../types/messaging/Messages";
import RichText from "./responseTypes/util/RichText";

/**
 * This component renders a specific message component based on a message's type.
 */
function MessageTypeComponent(props: MessageTypeComponentProps) {
  const {
    allowNewFeedback,
    hideFeedback,
    serviceManager,
    originalMessage,
    message,
  } = props;

  const intl = useIntl();
  const languagePack = useLanguagePack();
  const feedbackDetailsRef = useRef<HTMLDivElement>(undefined);
  const agentDisplayState = useSelector(
    selectHumanAgentDisplayState,
    shallowEqual,
  );
  const humanAgentState = useSelector(
    (state: AppState) => state.humanAgentState,
  );
  const persistedHumanAgentState = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.humanAgentState,
  );
  const feedbackID = message.item.message_item_options?.feedback?.id;
  const feedbackPanelID = useUUID();

  const feedbackHistory = isResponse(originalMessage)
    ? originalMessage.history?.feedback?.[feedbackID]
    : null;

  const feedbackInitialValues = useMemo<FeedbackInitialValues>(() => {
    if (!feedbackHistory) {
      return null;
    }
    return {
      text: feedbackHistory.text,
      selectedCategories: feedbackHistory.categories,
    };
  }, [feedbackHistory]);

  // Indicates if the one of the feedback details are open.
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Indicates if the negative or positive feedback buttons are marked as selected.
  const [isPositiveFeedbackSelected, setIsPositiveFeedbackSelected] = useState(
    feedbackHistory && feedbackHistory.is_positive,
  );
  const [isNegativeFeedbackSelected, setIsNegativeFeedbackSelected] = useState(
    feedbackHistory && !feedbackHistory.is_positive,
  );

  // Indicates if details have been submitted.
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(
    Boolean(feedbackHistory),
  );

  /**
   * Returns the appropriate component to render the given message.
   */
  function renderSpecificMessage(
    localMessageItem: LocalMessageItem,
    message: Message,
  ) {
    if (isRequest(message)) {
      return renderRequest(localMessageItem, message as MessageRequest);
    }

    if (isResponse(message)) {
      const response = renderResponse(localMessageItem, message);
      const isResponseStopped =
        localMessageItem.item.streaming_metadata?.stream_stopped;
      return (
        <>
          {response}
          {isResponseStopped && <ResponseStopped />}
          {props.showChainOfThought &&
            renderChainOfThought(localMessageItem, message)}
          {renderFeedback(localMessageItem, message)}
        </>
      );
    }

    return false;
  }

  /**
   * Returns the appropriate component to render the given message.
   */
  function renderRequest(
    localMessageItem: LocalMessageItem,
    originalMessage: MessageRequest,
  ) {
    const messageItem = localMessageItem.item;

    if (isTextItem(messageItem)) {
      const text = originalMessage.history?.label || messageItem.text;

      // If this was user entered text, show the user's original text before showing the text that was actually sent to
      // the assistant.
      const userText = localMessageItem.ui_state.originalUserText || text;
      return (
        <div className="cds-aichat--sent--text">
          {originalMessage.input.message_type ===
            (InternalMessageRequestType.FILE as unknown as MessageInputType) && (
            <Attachment
              className="cds-aichat--sent-file-icon"
              aria-label={props.languagePack.fileSharing_fileIcon}
            />
          )}
          {/* The use of the heading role here is a compromise to enable the use of the
              next/previous heading hotkeys in JAWS to enable a screen reader user an easier ability to navigate
              messages. */}
          <div role="heading" aria-level={2}>
            <RichText
              text={userText}
              removeHTML
              overrideSanitize={true}
            ></RichText>
          </div>
        </div>
      );
    }

    return null;
  }

  /**
   * Returns the appropriate component to render the given message.
   */
  function renderResponse(
    localMessageItem: LocalMessageItem,
    message: MessageResponse,
  ) {
    if (renderAsUserDefinedMessage(localMessageItem.item)) {
      // Render all invalid components as a user defined response
      return renderUserDefinedResponse(
        localMessageItem as LocalMessageItem<any>,
        message,
      );
    }

    const responseType = localMessageItem.item.response_type;
    const withHuman = Boolean(
      message.message_options?.response_user_profile?.user_type ===
        UserType.HUMAN || localMessageItem.item.agent_message_type,
    );
    switch (responseType) {
      case MessageResponseTypes.TEXT:
        return renderText(
          localMessageItem as LocalMessageItem<TextItem>,
          message,
          withHuman,
        );
      case MessageResponseTypes.IMAGE:
        return renderImage(localMessageItem as LocalMessageItem<ImageItem>);
      case MessageResponseTypes.OPTION:
        return renderOption(
          localMessageItem as LocalMessageItem<OptionItem>,
          message,
        );
      case MessageResponseTypes.CONNECT_TO_HUMAN_AGENT:
        return renderConnectToHumanAgent(
          localMessageItem as LocalMessageItem<ConnectToHumanAgentItem>,
          message as MessageResponse,
        );
      case MessageResponseTypes.INLINE_ERROR:
        return renderInlineError(
          localMessageItem as LocalMessageItem<InlineErrorItem>,
        );
      case MessageResponseTypes.IFRAME:
        return renderIFrameMessage(
          localMessageItem as LocalMessageItem<IFrameItem>,
        );
      case MessageResponseTypes.VIDEO:
        return renderVideoMessage(
          localMessageItem as LocalMessageItem<VideoItem>,
        );
      case MessageResponseTypes.AUDIO:
        return renderAudioMessage(
          localMessageItem as LocalMessageItem<AudioItem>,
        );
      case MessageResponseTypes.DATE:
        return renderDateMessage(
          localMessageItem as LocalMessageItem<DateItem>,
        );
      case MessageResponseTypes.CONVERSATIONAL_SEARCH:
        return renderConversationalSearchMessage(
          localMessageItem as LocalMessageItem<ConversationalSearchItem>,
          message as MessageResponse,
        );
      case MessageResponseTypes.CARD:
        return renderCard(
          localMessageItem as LocalMessageItem<CardItem>,
          message as MessageResponse,
        );
      case MessageResponseTypes.CAROUSEL:
        return renderCarouselMessage(
          localMessageItem as LocalMessageItem<CarouselItem>,
          message as MessageResponse,
        );
      case MessageResponseTypes.BUTTON:
        return renderButtonItem(
          localMessageItem as LocalMessageItem<ButtonItem>,
          message as MessageResponse,
        );
      case MessageResponseTypes.GRID:
        return renderGrid(
          localMessageItem as LocalMessageItem<GridItem>,
          message as MessageResponse,
        );
      default:
        return renderUserDefinedResponse(
          localMessageItem as LocalMessageItem<TextItem>,
          message,
        );
    }
  }

  function renderText(
    message: LocalMessageItem<TextItem>,
    originalMessage: MessageResponse,
    removeHTML: boolean,
  ) {
    if (props.isNestedMessageItem) {
      return renderRichText(
        message,
        removeHTML,
        originalMessage as MessageResponse,
      );
    }

    // For text provided by the assistant, pass it through some HTML formatting before displaying it.
    return (
      <div>
        {renderRichText(
          message,
          removeHTML,
          originalMessage as MessageResponse,
        )}
      </div>
    );
  }

  function renderRichText(
    localMessageItem: LocalMessageItem<TextItem>,
    removeHTML: boolean,
    originalMessage?: MessageResponse,
  ) {
    return (
      <StreamingRichText
        text={localMessageItem.item.text}
        streamingState={localMessageItem.ui_state.streamingState}
        isStreamingError={
          originalMessage?.history?.error_state ===
          MessageErrorState.FAILED_WHILE_STREAMING
        }
        removeHTML={removeHTML}
      />
    );
  }

  function renderOption(
    message: LocalMessageItem<OptionItem>,
    originalMessage: Message,
  ) {
    const {
      languagePack,
      requestInputFocus,
      serviceManager,
      disableUserInputs,
      isMessageForInput,
    } = props;
    const withHumanAgent = Boolean(message.item.agent_message_type);

    return (
      <OptionComponent
        localMessage={message}
        originalMessage={originalMessage}
        languagePack={languagePack}
        disableUserInputs={disableUserInputs || !isMessageForInput}
        requestInputFocus={requestInputFocus}
        serviceManager={serviceManager}
        removeHTML={withHumanAgent}
      />
    );
  }

  function renderImage(message: LocalMessageItem<ImageItem>) {
    const { languagePack, serviceManager } = props;
    const { aiEnabled } =
      serviceManager.store.getState().config.derived.themeWithDefaults;

    return (
      <Image
        imageError={languagePack.errors_imageSource}
        source={message.item.source}
        title={message.item.title}
        description={message.item.description}
        altText={message.item.alt_text}
        needsAnnouncement={message.ui_state.needsAnnouncement}
        useAITheme={aiEnabled}
      />
    );
  }

  function renderInlineError(message: LocalMessageItem<TextItem>) {
    return <InlineError text={message.item.text} />;
  }

  function renderIFrameMessage(message: LocalMessageItem<IFrameItem>) {
    const { doAutoScroll, isNestedMessageItem } = props;
    const display = isNestedMessageItem
      ? IFrameItemDisplayOption.INLINE
      : undefined;

    return (
      <IFrameMessage
        localMessage={message}
        doAutoScroll={doAutoScroll}
        displayOverride={display}
      />
    );
  }

  function renderVideoMessage(message: LocalMessageItem<VideoItem>) {
    const { doAutoScroll } = props;
    const { item } = message;
    const { source, title, description, alt_text, file_accessibility } = item;
    return (
      <VideoComponent
        source={source}
        title={title}
        description={description}
        baseHeight={getMediaDimensions(item)?.base_height}
        ariaLabel={alt_text}
        subtitle_tracks={file_accessibility?.subtitle_tracks}
        doAutoScroll={doAutoScroll}
        needsAnnouncement={message.ui_state.needsAnnouncement}
      />
    );
  }

  function renderAudioMessage(message: LocalMessageItem<AudioItem>) {
    const { doAutoScroll } = props;
    const { source, title, description, alt_text, file_accessibility } =
      message.item;
    return (
      <AudioComponent
        source={source}
        title={title}
        description={description}
        ariaLabel={alt_text}
        transcript={file_accessibility?.transcript}
        doAutoScroll={doAutoScroll}
        needsAnnouncement={message.ui_state.needsAnnouncement}
      />
    );
  }

  function renderDateMessage(message: LocalMessageItem<DateItem>) {
    return (
      <DatePickerComponent
        localMessage={message}
        disabled={!props.isMessageForInput}
        scrollElementIntoView={props.scrollElementIntoView}
      />
    );
  }

  function renderUserDefinedResponse(
    message: LocalMessageItem,
    originalMessage: MessageResponse,
  ) {
    const { serviceManager } = props;
    return (
      <UserDefinedResponse
        streamingState={message.ui_state.streamingState}
        isStreamingError={
          originalMessage?.history?.error_state ===
          MessageErrorState.FAILED_WHILE_STREAMING
        }
        doAutoScroll={props.doAutoScroll}
        localMessageID={message.ui_state.id}
        serviceManager={serviceManager}
      />
    );
  }

  function renderConnectToHumanAgent(
    message: LocalMessageItem,
    originalMessage: MessageResponse,
  ) {
    const {
      languagePack,
      config,
      serviceManager,
      disableUserInputs,
      isMessageForInput,
    } = props;

    return (
      <ConnectToHumanAgent
        localMessage={message}
        originalMessage={originalMessage}
        languagePack={languagePack}
        config={config}
        serviceManager={serviceManager}
        humanAgentState={humanAgentState}
        agentDisplayState={agentDisplayState}
        persistedHumanAgentState={persistedHumanAgentState}
        disableUserInputs={disableUserInputs || !isMessageForInput}
        requestFocus={props.requestInputFocus}
      />
    );
  }

  function renderCard(
    message: LocalMessageItem<CardItem>,
    originalMessage: MessageResponse,
  ) {
    const { isMessageForInput, requestInputFocus } = props;
    return (
      <CardItemComponent
        localMessageItem={message}
        fullMessage={originalMessage}
        isMessageForInput={isMessageForInput}
        requestFocus={requestInputFocus}
        renderMessageComponent={(childProps) => (
          <MessageTypeComponent {...childProps} />
        )}
      />
    );
  }

  function renderConversationalSearchMessage(
    localMessageItem: LocalMessageItem<ConversationalSearchItem>,
    fullMessage: MessageResponse,
  ) {
    const { scrollElementIntoView, doAutoScroll } = props;
    return (
      <ConversationalSearch
        localMessageItem={localMessageItem}
        scrollElementIntoView={scrollElementIntoView}
        isStreamingError={
          fullMessage?.history?.error_state ===
          MessageErrorState.FAILED_WHILE_STREAMING
        }
        doAutoScroll={doAutoScroll}
      />
    );
  }

  function renderButtonItem(
    message: LocalMessageItem<ButtonItem>,
    originalMessage: MessageResponse,
  ) {
    const { isMessageForInput, requestInputFocus } = props;
    return (
      <ButtonItemComponent
        localMessageItem={message}
        fullMessage={originalMessage}
        isMessageForInput={isMessageForInput}
        requestFocus={requestInputFocus}
      />
    );
  }

  function renderCarouselMessage(
    message: LocalMessageItem<CarouselItem>,
    originalMessage: MessageResponse,
  ) {
    const { isMessageForInput, requestInputFocus } = props;
    return (
      <CarouselItemComponent
        localMessageItem={message}
        fullMessage={originalMessage}
        isMessageForInput={isMessageForInput}
        requestFocus={requestInputFocus}
        renderMessageComponent={(childProps) => (
          <MessageTypeComponent {...childProps} />
        )}
      />
    );
  }

  function renderGrid(
    message: LocalMessageItem<GridItem>,
    originalMessage: MessageResponse,
  ) {
    return (
      <GridItemComponent
        localMessageItem={message}
        originalMessage={originalMessage}
        renderMessageComponent={(childProps) => (
          <MessageTypeComponent {...childProps} />
        )}
      />
    );
  }

  function scrollChainOfThought(open: boolean, element: HTMLElement) {
    if (open) {
      setTimeout(() => {
        props.scrollElementIntoView(element, 64, 64);
      });
    }
  }

  function formatStepLabelText({
    stepNumber,
    stepTitle,
  }: {
    stepNumber: number;
    stepTitle: string;
  }) {
    return intl.formatMessage(
      { id: "chainOfThought_stepTitle" },
      { stepNumber, stepTitle },
    );
  }

  /**
   * Renders chain of thought component for the given {@link MessageResponse}.
   */
  function renderChainOfThought(
    localMessageItem: LocalMessageItem,
    message: MessageResponse,
  ) {
    const chainOfThought = message.message_options?.chain_of_thought;
    if (!chainOfThought || props.isNestedMessageItem) {
      return false;
    }
    return (
      <ChainOfThought
        steps={chainOfThought}
        onToggle={scrollChainOfThought}
        onStepToggle={scrollChainOfThought}
        formatStepLabelText={formatStepLabelText}
        explainabilityText={languagePack.chainOfThought_explainabilityLabel}
        inputLabelText={languagePack.chainOfThought_inputLabel}
        outputLabelText={languagePack.chainOfThought_outputLabel}
        toolLabelText={languagePack.chainOfThought_toolLabel}
      />
    );
  }

  /**
   * Renders the feedback options for the given message item if appropriate.
   */
  function renderFeedback(
    localMessageItem: LocalMessageItem,
    message: MessageResponse,
  ) {
    const feedbackOptions =
      localMessageItem.item.message_item_options?.feedback || {};

    const {
      id: feedbackID,
      is_on,
      show_positive_details = true,
      show_negative_details = true,
      show_text_area = true,
      show_prompt = true,
      title,
      prompt,
      categories,
      placeholder,
      disclaimer,
    } = feedbackOptions;

    if (
      props.isNestedMessageItem ||
      hideFeedback ||
      (!allowNewFeedback && !feedbackHistory) ||
      !is_on
    ) {
      return false;
    }

    /**
     * Updates the message history with the feedback data provided.
     */
    function updateFeedbackHistory(data: MessageHistoryFeedback) {
      if (feedbackID) {
        const history: MessageResponseHistory = {
          feedback: {
            [feedbackID]: data,
          },
        };
        serviceManager.store.dispatch(
          actions.mergeMessageHistory(localMessageItem.fullMessageID, history),
        );
      }
    }

    /**
     * Handles when one of the feedback buttons is clicked. We also treat clicking the cancel button the same way as
     * clicking the feedback button.
     */
    function onFeedbackClicked(isPositive: boolean) {
      const toggleToSelected = isPositive
        ? !isPositiveFeedbackSelected
        : !isNegativeFeedbackSelected;
      const openDetails =
        (isPositive ? show_positive_details : show_negative_details) &&
        toggleToSelected;

      if (toggleToSelected && !openDetails) {
        // If the button has been toggled to selected but we're not showing details, that means the option is considered
        // immediately submitted.
        updateFeedbackHistory({ is_positive: isPositive });
        setIsFeedbackSubmitted(true);

        serviceManager.fire({
          type: BusEventType.FEEDBACK,
          messageItem: localMessageItem.item,
          message,
          interactionType: FeedbackInteractionType.SUBMITTED,
          isPositive,
        } satisfies BusEventFeedback);
      } else {
        setIsFeedbackOpen(openDetails);
        if (openDetails) {
          setTimeout(() => {
            props.scrollElementIntoView(feedbackDetailsRef.current, 48, 56);
          });
        }

        serviceManager.fire({
          type: BusEventType.FEEDBACK,
          messageItem: localMessageItem.item,
          message,
          interactionType: openDetails
            ? FeedbackInteractionType.DETAILS_OPENED
            : FeedbackInteractionType.DETAILS_CLOSED,
          isPositive,
        } satisfies BusEventFeedback);
      }

      setIsPositiveFeedbackSelected(isPositive ? toggleToSelected : false);
      setIsNegativeFeedbackSelected(isPositive ? false : toggleToSelected);
    }

    /**
     * Handles when the feedback submit button is clicked.
     */
    function onSubmit(isPositive: boolean, details: FeedbackSubmitDetails) {
      setIsFeedbackSubmitted(true);
      setIsFeedbackOpen(false);

      const event: BusEventFeedback = {
        type: BusEventType.FEEDBACK,
        messageItem: localMessageItem.item,
        message,
        interactionType: FeedbackInteractionType.SUBMITTED,
        isPositive,
        text: details.text,
        categories: details.selectedCategories,
      };
      serviceManager.fire(event);

      // Submit this update to be recorded in history.
      updateFeedbackHistory({
        is_positive: event.isPositive,
        text: event.text,
        categories: event.categories,
      });
    }

    /**
     * Render the feedback popup for either positive or negative feedback.
     */
    function renderFeedbackPopup(isPositive: boolean) {
      // Only one popup can be open and which one is opened depends on which feedback is selected.
      const isOpen =
        isFeedbackOpen &&
        (isPositive ? isPositiveFeedbackSelected : isNegativeFeedbackSelected);

      let filteredCategories;
      // Categories can be an array of strings or an object with positive and negative arrays.
      if (Array.isArray(categories)) {
        filteredCategories = categories;
      } else if (isPositive) {
        filteredCategories = categories?.positive;
      } else {
        filteredCategories = categories?.negative;
      }

      return (
        <FeedbackComponent
          class={`${prefix}--feedback-details-${
            isPositive ? "positive" : "negative"
          }`}
          id={`${feedbackPanelID}-feedback-${
            isPositive ? "positive" : "negative"
          }`}
          isOpen={isOpen}
          isReadonly={isFeedbackSubmitted}
          onClose={() => onFeedbackClicked(isPositive)}
          onSubmit={(details) => onSubmit(isPositive, details)}
          initialValues={
            feedbackHistory && feedbackHistory?.is_positive === isPositive
              ? feedbackInitialValues
              : null
          }
          showTextArea={show_text_area}
          showPrompt={show_prompt}
          title={title || languagePack.feedback_defaultTitle}
          prompt={prompt || languagePack.feedback_defaultPrompt}
          categories={filteredCategories}
          placeholder={placeholder || languagePack.feedback_defaultPlaceholder}
          disclaimer={disclaimer}
          submitLabel={languagePack.feedback_submitLabel}
          cancelLabel={languagePack.feedback_cancelLabel}
        />
      );
    }

    return (
      <div className="cds-aichat--received--feedback">
        <FeedbackButtonsComponent
          isPositiveOpen={isFeedbackOpen && isPositiveFeedbackSelected}
          isNegativeOpen={isFeedbackOpen && isNegativeFeedbackSelected}
          isPositiveSelected={isPositiveFeedbackSelected}
          isNegativeSelected={isNegativeFeedbackSelected}
          hasPositiveDetails={show_positive_details}
          hasNegativeDetails={show_negative_details}
          isPositiveDisabled={isNegativeFeedbackSelected || isFeedbackSubmitted}
          isNegativeDisabled={isPositiveFeedbackSelected || isFeedbackSubmitted}
          positiveLabel={languagePack.feedback_positiveLabel}
          negativeLabel={languagePack.feedback_negativeLabel}
          panelID={feedbackPanelID}
          onClick={onFeedbackClicked}
        />
        <div ref={feedbackDetailsRef}>
          {renderFeedbackPopup(true)}
          {renderFeedbackPopup(false)}
        </div>
      </div>
    );
  }
  return renderSpecificMessage(props.message, props.originalMessage);
}

export { MessageTypeComponent };
const Attachment = carbonIconToReact(Attachment16);

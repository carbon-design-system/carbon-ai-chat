/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { useAriaAnnouncer } from "../../hooks/useAriaAnnouncer";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { AppState } from "../../../../types/state/AppState";
import { getMediaDimensions } from "../../utils/messageUtils";
import { consoleError } from "../../utils/miscUtils";
import InlineError from "../responseTypes/error/InlineError";
import { Image } from "../responseTypes/image/Image";
import { RichText } from "../responseTypes/util/RichText";
import { VideoComponent } from "../responseTypes/video/VideoComponent";
import {
  GenericItem,
  ImageItem,
  MessageResponseTypes,
  TextItem,
  VideoItem,
} from "../../../../types/messaging/Messages";

interface TourStepContentComponentProps {
  /**
   * A GenericItem within the steps array.
   */
  stepGenericItem: GenericItem;

  /**
   * Whether this tour step is the current step.
   */
  isCurrentStep: boolean;
}

interface TourStepComponentProp<T extends GenericItem> {
  /**
   * A response type the represents this step.
   */
  messageItem: T;

  /**
   * Whether this tour step is the current step.
   */
  // eslint-disable-next-line react/no-unused-prop-types
  isCurrentStep?: boolean;
}

/**
 * This renders the content for a particular step within the tour.
 */
function TourStepContentComponent(props: TourStepContentComponentProps) {
  const { stepGenericItem, isCurrentStep } = props;
  const ariaAnnouncer = useAriaAnnouncer();
  const rootRef = useRef<HTMLDivElement>();

  /**
   * Determine if a border should be shown between the step content and the tour controls.
   */
  function showBottomBorder() {
    const responseType = stepGenericItem.response_type;
    switch (responseType) {
      case MessageResponseTypes.TEXT:
        // For a text step we want to show a border between the text and the tour controls.
        return true;
      case MessageResponseTypes.IMAGE:
        // If the Image is going to have a description then we want to show a border between the description and the
        // tour controls.
        return (stepGenericItem as ImageItem)?.description;
      case MessageResponseTypes.VIDEO:
        // If the Video is going to have a description then we want to show a border between the description and the
        // tour controls.
        return (stepGenericItem as VideoItem)?.description;
      default:
        // For an unsupported step we want to show a border between the error and the tour controls.
        return true;
    }
  }

  /**
   * Render the appropriate component for the given message responseType.
   */
  function renderStepContent() {
    const responseType = stepGenericItem.response_type;
    switch (responseType) {
      case MessageResponseTypes.TEXT:
        return <StepContentText messageItem={stepGenericItem} />;
      case MessageResponseTypes.IMAGE:
        return <StepContentImage messageItem={stepGenericItem as ImageItem} />;
      case MessageResponseTypes.VIDEO:
        return (
          <StepContentVideo
            messageItem={stepGenericItem as VideoItem}
            isCurrentStep={isCurrentStep}
          />
        );
      default:
        // If the responseType is not one of the three supported types for tours then render an inline error.
        return (
          <StepContentUnsupportedError
            messageItem={stepGenericItem}
            isCurrentStep={isCurrentStep}
          />
        );
    }
  }

  // If this is the current step then send an event and track the type of response being shown.
  useEffect(() => {
    if (isCurrentStep) {
      // Announce the content of the current step. The announcement is handled in setTimeout so that it doesn't prevent
      // the initial announcement from being heard when the tour is open.
      setTimeout(() => ariaAnnouncer(rootRef.current));
    }
  }, [isCurrentStep, stepGenericItem.response_type, ariaAnnouncer]);

  return (
    <div className="WACTourStep__Wrapper" ref={rootRef}>
      <div
        className={cx("WACTourStep", "WAC__message", {
          "WACTourStep--hidden": !isCurrentStep,
          WACTourStep__BottomBorder: showBottomBorder(),
        })}
      >
        {renderStepContent()}
      </div>
    </div>
  );
}

/**
 * Given a TextItem return a RichText component containing the text from the message.
 */
function StepContentText(props: TourStepComponentProp<TextItem>) {
  const { messageItem } = props;
  const { text } = messageItem;

  // For text provided by the assistant, pass it through some HTML formatting before displaying it.
  return (
    <div className="WACTourStep__Text">
      <RichText text={text} />
    </div>
  );
}

/**
 * Given an ImageItem return an Image component containing the image from the message.
 */
function StepContentImage(props: TourStepComponentProp<ImageItem>) {
  const { messageItem } = props;
  const { source, description, alt_text } = messageItem;
  const languagePack = useLanguagePack();

  return (
    // Don't pass the title to the Image component since tours only support descriptions.
    <Image
      imageError={languagePack.errors_imageSource}
      source={source}
      description={description}
      altText={alt_text}
      hideIconAndTitle
    />
  );
}

/**
 * Given a VideoItem return a VideoComponent containing the video from the message.
 */
function StepContentVideo(props: TourStepComponentProp<VideoItem>) {
  const { messageItem, isCurrentStep } = props;
  const { source, description, alt_text } = messageItem;

  const { viewState } = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.launcherState
  );

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // If this isn't the current step or the tour isn't visible then the video needs to be paused.
  useEffect(() => {
    if (!isCurrentStep || !viewState.tour) {
      setIsVideoPlaying(false);
    }
  }, [isCurrentStep, viewState.tour]);

  return (
    // Don't pass the title to the VideoComponent since tours only support descriptions.
    <VideoComponent
      source={source}
      description={description}
      baseHeight={getMediaDimensions(messageItem)?.base_height}
      ariaLabel={alt_text}
      playing={isVideoPlaying}
      onPlay={() => setIsVideoPlaying(true)}
      onPause={() => setIsVideoPlaying(false)}
      hideIconAndTitle
    />
  );
}

/**
 * If the responseType is not one of the three supported types for tours then render an inline error.
 */
function StepContentUnsupportedError(
  props: TourStepComponentProp<GenericItem>
) {
  const { messageItem, isCurrentStep } = props;
  const languagePack = useLanguagePack();

  // If the current response type isn't a supported response type then log an error.
  useEffect(() => {
    if (isCurrentStep) {
      consoleError(
        `The response type you tried to use "${messageItem.response_type}" is not valid within a tour step. The supported response types in tour steps are text, video, and image.`
      );
    }
  }, [isCurrentStep, messageItem.response_type]);

  return (
    <div className="WACTourStep__UnsupportedResponse">
      <InlineError text={languagePack.errors_generalContent} />
    </div>
  );
}

const TourStepContentComponentExport = React.memo(TourStepContentComponent);
export { TourStepContentComponentExport as TourStepContentComponent };

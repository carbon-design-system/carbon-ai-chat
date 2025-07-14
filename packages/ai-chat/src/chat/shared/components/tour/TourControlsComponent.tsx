/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ArrowLeft from "@carbon/icons-react/es/ArrowLeft.js";
import ArrowRight from "@carbon/icons-react/es/ArrowRight.js";
import Chat from "@carbon/icons-react/es/Chat.js";
import { Button } from "@carbon/react";
import cx from "classnames";
import React, { useImperativeHandle, useRef } from "react";

import { useLanguagePack } from "../../hooks/useLanguagePack";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { doFocusRef } from "../../utils/domUtils";

interface TourControlsComponentProps {
  /**
   * If there is more than one step in the tour then render a previous button.
   */
  reservePreviousButtonSpace: boolean;

  /**
   * If this is the first step of the tour then hide the previous button.
   */
  hidePreviousButton: boolean;

  /**
   * Determines if the next button should be disabled.
   */
  disableNextButton: boolean;

  /**
   * Indicates if the buttons should be hidden. This is only used to hide the buttons during the tour loading state.
   */
  hideButtons: boolean;

  /**
   * Indicates if the chat button should be hidden.
   */
  hideChatButton: boolean;

  /**
   * If this is the last step of the tour then show a done button instead of a next button.
   */
  renderDoneButton: boolean;

  /**
   * When the next button is clicked hide the current step, show the next step, and increment the activeTourCurrentStepIndex in
   * sessionStorage.
   */
  onNextClick: () => void;

  /**
   * When the previous button is clicked hide the current step, show the previous step, and decrement the activeTourCurrentStepIndex
   * in sessionStorage.
   */
  onPreviousClick: () => void;

  /**
   * When the main window icon is clicked switch to the main window and fire the window:open events.
   */
  onOpenMainWindowClick: () => void;

  /**
   * When the done button is clicked switch to the launcher and clear the tour data. When the launcher is clicked the
   * main window will open.
   */
  onDoneClick: () => void;
}

/**
 * This renders the buttons to open the main window, progress forward and back through the steps, and end the tour once
 * on the last step.
 */
function TourControlsComponent(
  props: TourControlsComponentProps,
  ref: React.Ref<HasRequestFocus>
) {
  const {
    reservePreviousButtonSpace,
    hidePreviousButton,
    renderDoneButton,
    disableNextButton,
    hideButtons,
    hideChatButton,
    onOpenMainWindowClick,
    onNextClick,
    onPreviousClick,
    onDoneClick,
  } = props;
  const {
    tour_ariaChatButton,
    tour_ariaNextButton,
    tour_ariaPreviousButton,
    tour_doneButton,
  } = useLanguagePack();
  const nextButtonRef = useRef<HTMLButtonElement>();
  const doneButtonRef = useRef<HTMLButtonElement>();

  useImperativeHandle(ref, () => ({
    requestFocus: () => {
      setTimeout(() => {
        if (doneButtonRef.current) {
          doFocusRef(doneButtonRef);
        } else {
          doFocusRef(nextButtonRef);
        }
      });
    },
  }));

  return (
    <div
      className={cx("WACTour__Controls", {
        "WACTour__Controls--empty": hideButtons,
      })}
    >
      {!hideChatButton && (
        <div className="WACTour__ControlsButton">
          <Button
            className="WACTour__MainWindowButton"
            kind="ghost"
            size="md"
            hasIconOnly
            renderIcon={(props) => <Chat {...props} />}
            iconDescription={tour_ariaChatButton}
            onClick={onOpenMainWindowClick}
            aria-label={tour_ariaChatButton}
          />
        </div>
      )}
      {reservePreviousButtonSpace && (
        <div className="WACTour__ControlsButton">
          <Button
            className={cx("WACTour__PreviousButton", {
              "WACTour__ControlsButton--hidden": hidePreviousButton,
            })}
            kind="ghost"
            size="md"
            hasIconOnly
            renderIcon={(props) => <ArrowLeft {...props} />}
            iconDescription={tour_ariaPreviousButton}
            onClick={onPreviousClick}
            aria-label={tour_ariaPreviousButton}
          />
        </div>
      )}
      {renderDoneButton && (
        <div className="WACTour__ControlsButton">
          <Button
            ref={doneButtonRef}
            className="WACTour__DoneButton"
            size="md"
            onClick={onDoneClick}
          >
            {tour_doneButton}
          </Button>
        </div>
      )}
      {!renderDoneButton && (
        <div className="WACTour__ControlsButton">
          <Button
            ref={nextButtonRef}
            className="WACTour__NextButton"
            size="md"
            hasIconOnly
            renderIcon={(props) => <ArrowRight {...props} />}
            iconDescription={tour_ariaNextButton}
            onClick={onNextClick}
            disabled={disableNextButton}
            aria-label={tour_ariaNextButton}
          />
        </div>
      )}
    </div>
  );
}

const TourControlsComponentExport = React.forwardRef(TourControlsComponent);

export { TourControlsComponentExport as TourControlsComponent };

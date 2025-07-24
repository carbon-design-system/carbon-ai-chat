/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import React from "react";
import { useSelector } from "react-redux";

import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useServiceManager } from "../../hooks/useServiceManager";
import {
  AnimationInType,
  AnimationOutType,
} from "../../../../types/utilities/Animation";
import { AppState } from "../../../../types/state/AppState";
import { HasClassName } from "../../../../types/utilities/HasClassName";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import { BasePanelComponent } from "../BasePanelComponent";
import { BodyWithFooterComponent } from "../BodyWithFooterComponent";
import { OverlayPanel, OverlayPanelName } from "../OverlayPanel";
import { MessageResponse } from "../../../../types/messaging/Messages";

interface BodyAndFooterPanelComponentProps
  extends HasRequestFocus,
    HasClassName {
  /**
   * Determines if the panel is open.
   */
  isOpen: boolean;

  /**
   * Indicates if this message is part the most recent message response that allows for input.
   */
  isMessageForInput: boolean;

  /**
   * The local message item with the body and footer content to render.
   */
  localMessageItem?: LocalMessageItem;

  /**
   * The title to give the panel in Carbon AI chat.
   */
  title?: string;

  /**
   * Determines if the panel close and open animations should be enabled or not.
   */
  showAnimations?: boolean;

  /**
   * The name of the event being tracked. This is for tracking the panel being opened.
   */
  eventName?: string;

  /**
   * The description of the event being tracked. This is for tracking the panel being opened.
   */
  eventDescription?: string;

  /**
   * Indicates if the AI theme should be used.
   */
  useAITheme?: boolean;

  /**
   * Unique name for overlay panel.
   */
  overlayPanelName: OverlayPanelName;

  /**
   * This callback is called when the back button is clicked.
   */
  onClickBack: () => void;

  /**
   * Update the panel counter to show a panel has opened, and add any proper focus.
   */
  onPanelOpenStart: () => void;

  /**
   * Update the panel animating counter to show a panel has finished opening, and add any proper focus.
   */
  onPanelOpenEnd: () => void;

  /**
   * Update the panel counter to show a panel has started to close.
   */
  onPanelCloseStart: () => void;

  /**
   * Update the panel animating counter to show a panel has finished closing.
   */
  onPanelCloseEnd: () => void;

  /**
   * This callback is called when the user clicks the close button.
   */
  onClose: () => void;

  /**
   * This callback is called when the user clicks the close-and-restart button and confirms the action.
   */
  onCloseAndRestart: () => void;

  /**
   * Called when the restart button is clicked.
   */
  onClickRestart?: () => void;

  /**
   * The header component is used by multiple panels. This is a prefix for data-testid to keep buttons
   * in the header obviously unique.
   */
  testIdPrefix: OverlayPanelName;
}

/**
 * This component handles rendering a panel with body/footer content.
 */
function BodyAndFooterPanelComponent(props: BodyAndFooterPanelComponentProps) {
  const {
    isOpen,
    isMessageForInput,
    localMessageItem,
    eventName,
    eventDescription,
    overlayPanelName,
    className,
    title,
    useAITheme,
    requestFocus,
    onClickBack,
    onClose,
    onClickRestart,
    onCloseAndRestart,
    onPanelOpenEnd,
    onPanelCloseEnd,
    onPanelOpenStart,
    onPanelCloseStart,
    testIdPrefix,
  } = props;
  const languagePack = useLanguagePack();
  const serviceManager = useServiceManager();
  const originalMessage = useSelector(
    (state: AppState) => state.allMessagesByID[localMessageItem?.fullMessageID]
  );
  const showAnimations = props.showAnimations ?? true;
  const disableAnimation = !showAnimations;
  const openAnimation = disableAnimation
    ? AnimationInType.NONE
    : AnimationInType.SLIDE_IN_FROM_BOTTOM;
  const closeAnimation = disableAnimation
    ? AnimationOutType.NONE
    : AnimationOutType.SLIDE_OUT_TO_BOTTOM;

  return (
    <OverlayPanel
      className="WAC__overlay--covering"
      onOpenStart={onPanelOpenStart}
      onOpenEnd={onPanelOpenEnd}
      onCloseStart={onPanelCloseStart}
      onCloseEnd={onPanelCloseEnd}
      animationOnOpen={openAnimation}
      animationOnClose={closeAnimation}
      shouldOpen={isOpen}
      serviceManager={serviceManager}
      overlayPanelName={overlayPanelName}
    >
      <BasePanelComponent
        className={cx("WACBodyAndFooterComponent", className)}
        eventName={eventName}
        eventDescription={eventDescription}
        isOpen={isOpen}
        title={title}
        disableAnimation={disableAnimation}
        useAITheme={useAITheme}
        labelBackButton={languagePack.general_returnToAssistant}
        onClickBack={onClickBack}
        onClickClose={onClose}
        onClickRestart={onClickRestart}
        onClickCloseAndRestart={onCloseAndRestart}
        testIdPrefix={testIdPrefix}
      >
        {originalMessage && (
          <BodyWithFooterComponent
            localMessageItem={localMessageItem}
            fullMessage={originalMessage as MessageResponse}
            isMessageForInput={isMessageForInput}
            requestFocus={requestFocus}
          />
        )}
      </BasePanelComponent>
    </OverlayPanel>
  );
}

export { BodyAndFooterPanelComponent };

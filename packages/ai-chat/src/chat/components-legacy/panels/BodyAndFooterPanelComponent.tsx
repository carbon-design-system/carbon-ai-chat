/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import React, { forwardRef, Ref, useRef } from "react";
import { useSelector } from "../../hooks/useSelector";

import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useServiceManager } from "../../hooks/useServiceManager";
import {
  AnimationInType,
  AnimationOutType,
} from "../../../types/utilities/Animation";
import { AppState } from "../../../types/state/AppState";
import { HasClassName } from "../../../types/utilities/HasClassName";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../types/messaging/LocalMessageItem";
import { BasePanelComponent } from "../BasePanelComponent";
import { BodyWithFooterComponent } from "../BodyWithFooterComponent";
import { MessageTypeComponentProps } from "../../../types/messaging/MessageTypeComponentProps";
import { OverlayPanel } from "../OverlayPanel";
import { MessageResponse } from "../../../types/messaging/Messages";
import { PageObjectId } from "../../../testing/PageObjectId";

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
   * The title to give the panel in Carbon AI Chat.
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
   * Unique name for overlay panel - should use a PageObjectId value.
   */
  overlayPanelName: PageObjectId;

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
   * Called when the restart button is clicked.
   */
  onClickRestart?: () => void;

  /**
   * Function to render message components
   */
  renderMessageComponent: (props: MessageTypeComponentProps) => React.ReactNode;

  /**
   * Controls whether to show the AI label in the header. When undefined, falls back to global config.
   */
  showAiLabel?: boolean;

  /**
   * Controls whether to show the restart button in the header. When undefined, falls back to global config.
   */
  showRestartButton?: boolean;
}

/**
 * This component handles rendering a panel with body/footer content.
 */
function BodyAndFooterPanelComponent(
  props: BodyAndFooterPanelComponentProps,
  ref: Ref<HasRequestFocus>,
) {
  const {
    isOpen,
    isMessageForInput,
    localMessageItem,
    eventName,
    eventDescription,
    overlayPanelName,
    className,
    title,
    requestFocus,
    onClickBack,
    onClose,
    onClickRestart,
    onPanelOpenEnd,
    onPanelCloseEnd,
    onPanelOpenStart,
    onPanelCloseStart,
    renderMessageComponent,
    showAiLabel,
    showRestartButton,
  } = props;
  const languagePack = useLanguagePack();
  const serviceManager = useServiceManager();
  const originalMessage = useSelector(
    (state: AppState) => state.allMessagesByID[localMessageItem?.fullMessageID],
  );
  const showAnimations = props.showAnimations ?? true;
  const disableAnimation = !showAnimations;
  const openAnimation = disableAnimation
    ? AnimationInType.NONE
    : AnimationInType.SLIDE_IN_FROM_BOTTOM;
  const closeAnimation = disableAnimation
    ? AnimationOutType.NONE
    : AnimationOutType.SLIDE_OUT_TO_BOTTOM;
  const basePanelRef = useRef<HasRequestFocus>(null);

  // Expose the BasePanelComponent's requestFocus method through the forwarded ref
  React.useImperativeHandle(ref, () => ({
    requestFocus: () => {
      if (basePanelRef.current) {
        return basePanelRef.current.requestFocus();
      }
      return false;
    },
  }));

  return (
    <OverlayPanel
      className="cds-aichat--overlay--covering"
      onOpenStart={onPanelOpenStart}
      onOpenEnd={onPanelOpenEnd}
      onCloseStart={onPanelCloseStart}
      onCloseEnd={onPanelCloseEnd}
      animationOnOpen={openAnimation}
      animationOnClose={closeAnimation}
      shouldOpen={isOpen}
      serviceManager={serviceManager}
      overlayPanelName={overlayPanelName}
      hasBackButton={true}
    >
      <BasePanelComponent
        ref={basePanelRef}
        className={cx("cds-aichat--body-and-footer-component", className)}
        eventName={eventName}
        eventDescription={eventDescription}
        isOpen={isOpen}
        title={title}
        disableAnimation={disableAnimation}
        labelBackButton={languagePack.general_returnToAssistant}
        onClickBack={onClickBack}
        onClickClose={onClose}
        onClickRestart={onClickRestart}
        showAiLabel={showAiLabel}
        showRestartButton={showRestartButton}
      >
        {originalMessage && (
          <BodyWithFooterComponent
            localMessageItem={localMessageItem}
            fullMessage={originalMessage as MessageResponse}
            isMessageForInput={isMessageForInput}
            requestFocus={requestFocus}
            renderMessageComponent={renderMessageComponent}
          />
        )}
      </BasePanelComponent>
    </OverlayPanel>
  );
}

const BodyAndFooterPanelComponentExport = React.memo(
  forwardRef(BodyAndFooterPanelComponent),
);

export { BodyAndFooterPanelComponentExport as BodyAndFooterPanelComponent };

export default BodyAndFooterPanelComponentExport;

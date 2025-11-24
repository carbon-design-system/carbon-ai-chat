/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { forwardRef, Ref, useCallback, useEffect, useRef } from "react";
import cx from "classnames";
import { useSelector } from "../../hooks/useSelector";

import { BusEventType } from "../../../types/events/eventBusTypes";
import { useAriaAnnouncer } from "../../hooks/useAriaAnnouncer";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { usePrevious } from "../../hooks/usePrevious";
import { useServiceManager } from "../../hooks/useServiceManager";
import actions from "../../store/actions";
import { DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS } from "../../store/reducerUtils";
import {
  AnimationInType,
  AnimationOutType,
} from "../../../types/utilities/Animation";
import { AppState } from "../../../types/state/AppState";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { consoleError } from "../../utils/miscUtils";
import { BasePanelComponent } from "../BasePanelComponent";
import { OverlayPanel } from "../OverlayPanel";
import { PageObjectId } from "../../../testing/PageObjectId";
import WriteableElement from "../WriteableElement";

interface CustomPanelProps {
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
}

/**
 * This component is a custom panel that renders external content similar to custom response types.
 */
function CustomPanel(props: CustomPanelProps, ref: Ref<HasRequestFocus>) {
  const {
    onPanelOpenEnd,
    onPanelCloseEnd,
    onPanelOpenStart,
    onPanelCloseStart,
    onClose,
    onClickRestart,
  } = props;
  const languagePack = useLanguagePack();
  const { isOpen, options } = useSelector(
    (state: AppState) => state.customPanelState,
  );
  const {
    title,
    hidePanelHeader,
    disableDefaultCloseAction,
    disableAnimation,
    onClickBack,
    onClickClose,
    hideCloseButton,
  } = options;
  const serviceManager = useServiceManager();
  const ariaAnnouncer = useAriaAnnouncer();
  const prevIsOpen = usePrevious(isOpen);
  const openAnimation = disableAnimation
    ? AnimationInType.NONE
    : AnimationInType.SLIDE_IN_FROM_BOTTOM;
  const closeAnimation = disableAnimation
    ? AnimationOutType.NONE
    : AnimationOutType.SLIDE_OUT_TO_BOTTOM;
  const basePanelRef = useRef<HasRequestFocus>(null);
  const hideCloseOverride = hideCloseButton;
  const hasCustomTitle = title !== undefined && title !== null;
  const enableChatHeaderConfig = !hasCustomTitle;
  const shouldShowBackButton = !options.hideBackButton;
  const panelClassName = cx("cds-aichat--custom-panel", {
    "cds-aichat--custom-panel--no-back-button": !shouldShowBackButton,
  });

  useEffect(() => {
    if (prevIsOpen !== isOpen && isOpen) {
      // Announce the title if it's visible.
      if (!hidePanelHeader && title) {
        ariaAnnouncer(title);
      }
    }
  }, [ariaAnnouncer, hidePanelHeader, isOpen, prevIsOpen, title]);

  // Expose the BasePanelComponent's requestFocus method through the forwarded ref
  React.useImperativeHandle(ref, () => ({
    requestFocus: () => {
      if (basePanelRef.current) {
        return basePanelRef.current.requestFocus();
      }
      return false;
    },
  }));

  const onClickBackLocal = useCallback(() => {
    serviceManager.store.dispatch(actions.setCustomPanelOpen(false));
    onClickBack?.();
  }, [serviceManager, onClickBack]);

  const onClickCloseLocal = useCallback(() => {
    if (!disableDefaultCloseAction) {
      checkAllowClose(serviceManager.store.getState().viewChanging);
      onClose();
    }

    onClickClose?.();
  }, [disableDefaultCloseAction, onClickClose, onClose, serviceManager]);

  return (
    <OverlayPanel
      className="cds-aichat--overlay--covering"
      onOpenStart={() => {
        serviceManager.eventBus.fire(
          { type: BusEventType.CUSTOM_PANEL_PRE_OPEN },
          serviceManager.instance,
        );
        onPanelOpenStart();
      }}
      onOpenEnd={() => {
        serviceManager.eventBus.fire(
          { type: BusEventType.CUSTOM_PANEL_OPEN },
          serviceManager.instance,
        );
        onPanelOpenEnd();
      }}
      onCloseStart={() => {
        serviceManager.eventBus.fire(
          { type: BusEventType.CUSTOM_PANEL_PRE_CLOSE },
          serviceManager.instance,
        );
        onPanelCloseStart();
      }}
      onCloseEnd={() => {
        serviceManager.eventBus.fire(
          { type: BusEventType.CUSTOM_PANEL_CLOSE },
          serviceManager.instance,
        );
        onPanelCloseEnd();
        serviceManager.store.dispatch(
          actions.setCustomPanelConfigOptions(
            DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
          ),
        );
      }}
      animationOnOpen={openAnimation}
      animationOnClose={closeAnimation}
      shouldOpen={isOpen}
      serviceManager={serviceManager}
      overlayPanelName={PageObjectId.CUSTOM_PANEL}
      hasBackButton={shouldShowBackButton}
    >
      <BasePanelComponent
        ref={basePanelRef}
        className={panelClassName}
        eventName="Custom panel opened"
        eventDescription="A user opened a custom panel."
        labelBackButton={languagePack.general_returnToAssistant}
        isOpen={isOpen}
        title={title}
        onClickBack={onClickBackLocal}
        onClickClose={onClickCloseLocal}
        onClickRestart={onClickRestart}
        hidePanelHeader={hidePanelHeader}
        hideBackButton={options.hideBackButton}
        hideCloseButton={hideCloseOverride}
        enableChatHeaderConfig={enableChatHeaderConfig}
      >
        <WriteableElement
          slotName="customPanelElement"
          className="cds-aichat--custom-panel__content-container"
        />
      </BasePanelComponent>
    </OverlayPanel>
  );
}

/**
 * Checks the given flag and throws an error if it is true.
 */
function checkAllowClose(viewChanging: boolean) {
  if (viewChanging) {
    const message =
      "You are attempting to close Carbon AI Chat from a custom panel while Carbon AI Chat is currently running a view" +
      " change event which is not permitted. Please use the disableDefaultCloseAction option to disable" +
      " this behavior for the custom panel and then use onClickClose to resolve your Promise that is handling" +
      " the event; that Promise will allow you to close Carbon AI Chat.";
    consoleError(message);
    throw new Error(message);
  }
}

const CustomPanelExport = React.memo(forwardRef(CustomPanel));

export { CustomPanelExport as CustomPanel };

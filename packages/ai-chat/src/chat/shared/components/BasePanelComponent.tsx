/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import FocusTrap from "focus-trap-react";
import React, { Ref, useImperativeHandle, useRef } from "react";
import { useSelector } from "react-redux";

import {
  AppState,
  CustomPanelConfigOptions,
} from "../../../types/state/AppState";
import { HasChildren } from "../../../types/utilities/HasChildren";
import { HasClassName } from "../../../types/utilities/HasClassName";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { IS_MOBILE } from "../utils/browserUtils";
import { Header } from "./header/Header";
import { OverlayPanelName } from "./OverlayPanel";

interface BasePanelComponentProps
  extends HasClassName,
    HasChildren,
    CustomPanelConfigOptions {
  /**
   * Determines if the base panel should is open and allow us to track the panel opening. This will also make focus
   * trap active.
   */
  isOpen?: boolean;

  /**
   * The aria-label string for the back button.
   */
  labelBackButton?: string;

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
   * The header component is used by multiple panels. This is a prefix for data-testid to keep buttons
   * in the header obviously unique.
   */
  testIdPrefix: OverlayPanelName;
}

/**
 * This component is a custom panel that renders external content similar to custom response types.
 */
function BasePanelComponent(
  {
    className,
    children,
    isOpen,
    hidePanelHeader,
    labelBackButton,
    title,
    hideBackButton,
    useAITheme,
    onClickCloseAndRestart,
    onClickRestart,
    testIdPrefix,
    ...headerProps
  }: BasePanelComponentProps,
  ref: Ref<HasRequestFocus>
) {
  const showRestartButton = useSelector(
    (state: AppState) => state.config.public.headerConfig?.showRestartButton
  );
  const headerRef = useRef<HasRequestFocus>();

  // Reuse the imperative handles from the header.
  useImperativeHandle(ref, () => headerRef.current);

  return (
    <FocusTrap
      active={isOpen}
      focusTrapOptions={{
        clickOutsideDeactivates: true,
        returnFocusOnDeactivate: !IS_MOBILE,
        preventScroll: true,
      }}
    >
      <div className={className}>
        {!hidePanelHeader && (
          <Header
            {...headerProps}
            ref={headerRef}
            showRestartButton={showRestartButton}
            onClickRestart={onClickRestart}
            onCloseAndRestart={onClickCloseAndRestart}
            showBackButton={!hideBackButton}
            labelBackButton={labelBackButton}
            displayName={title}
            useAITheme={useAITheme}
            testIdPrefix={testIdPrefix}
          />
        )}
        <div className="WACPanelContent">{children}</div>
      </div>
    </FocusTrap>
  );
}

const BasePanelComponentExport = React.memo(
  React.forwardRef(BasePanelComponent)
);

export { BasePanelComponentExport as BasePanelComponent };

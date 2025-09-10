/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import FocusTrap from "focus-trap-react";
import React, {
  Ref,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
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
    onClickRestart,
    testIdPrefix,
    ...headerProps
  }: BasePanelComponentProps,
  ref: Ref<HasRequestFocus>,
) {
  const showRestartButton = useSelector(
    (state: AppState) => state.config.public.header?.showRestartButton,
  );
  const headerRef = useRef<HasRequestFocus>();

  // Reuse the imperative handles from the header.
  useImperativeHandle(ref, () => headerRef.current);
  const [focusTrapActive, setFocusTrapActive] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFocusTrapActive(false);
      return undefined;
    }
    setFocusTrapActive(true);
    const timer = setTimeout(() => {
      try {
        const aiChat = document.querySelector("cds-aichat-react");
        const layer = aiChat?.shadowRoot?.querySelector("cds-layer");
        const backButtonHost = layer?.querySelector(".WACHeader__BackButton");
        const innerButton = backButtonHost?.shadowRoot?.querySelector(
          "button",
        ) as HTMLElement;
        if (innerButton && innerButton.offsetParent !== null) {
          innerButton.focus();
        }
      } catch (error) {
        console.warn("Manual focus failed:", error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <FocusTrap
      active={focusTrapActive}
      focusTrapOptions={{
        clickOutsideDeactivates: true,
        returnFocusOnDeactivate: !IS_MOBILE,
        preventScroll: true,
        tabbableOptions: {
          getShadowRoot: true,
        },
        fallbackFocus: () => {
          const aiChat = document.querySelector("cds-aichat-react");
          const layer = aiChat?.shadowRoot?.querySelector("cds-layer");
          const backButtonHost = layer?.querySelector(".WACHeader__BackButton");
          const innerButton =
            backButtonHost?.shadowRoot?.querySelector("button");
          return innerButton;
        },
      }}
    >
      <div className={className}>
        {!hidePanelHeader && (
          <Header
            {...headerProps}
            ref={headerRef}
            showRestartButton={showRestartButton}
            onClickRestart={onClickRestart}
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
  React.forwardRef(BasePanelComponent),
);

export { BasePanelComponentExport as BasePanelComponent };

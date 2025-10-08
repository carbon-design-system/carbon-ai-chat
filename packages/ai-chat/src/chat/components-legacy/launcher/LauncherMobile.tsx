/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import CDSButton from "@carbon/web-components/es/components/button/button.js";
import cx from "classnames";
import React, { ReactNode, RefObject } from "react";
import { IntlShape } from "react-intl";

import { LauncherButton, LauncherHandle } from "./LauncherButton";

interface LauncherMobileProps {
  buttonRef: RefObject<CDSButton | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  greetingRef: RefObject<HTMLDivElement | null>;
  icon: ReactNode;
  intl: IntlShape;
  isExtended: boolean;
  launcherClosedLabel: string;
  launcherOpenLabel: string;
  launcherHidden: boolean;
  nameplateRef: RefObject<HTMLDivElement | null>;
  onToggleOpen: () => void;
  refHandle: RefObject<LauncherHandle | null>;
  showGreeting: boolean;
  showUnreadIndicator: boolean;
  textHolderRef: RefObject<HTMLDivElement | null>;
  unreadHumanAgentCount: number;
  className?: string;
  greetingText: ReactNode;
}

const LauncherMobile = (props: LauncherMobileProps) => {
  const {
    buttonRef,
    containerRef,
    greetingRef,
    icon,
    intl,
    isExtended,
    launcherClosedLabel,
    launcherOpenLabel,
    launcherHidden,
    nameplateRef,
    onToggleOpen,
    refHandle,
    showGreeting,
    showUnreadIndicator,
    textHolderRef,
    unreadHumanAgentCount,
    className,
    greetingText,
  } = props;

  return (
    <LauncherButton
      className="cds-aichat--launcher-extended__button"
      buttonRef={buttonRef}
      containerClassName={className}
      containerRef={containerRef}
      closedLabel={launcherClosedLabel}
      intl={intl}
      openLabel={launcherOpenLabel}
      launcherHidden={launcherHidden}
      onToggleOpen={onToggleOpen}
      ref={refHandle}
      showUnreadIndicator={showUnreadIndicator}
      unreadHumanAgentCount={unreadHumanAgentCount}
    >
      <div className="cds-aichat--launcher-extended__wrapper-container">
        <div className="cds-aichat--launcher-extended__wrapper">
          <div
            className="cds-aichat--launcher-extended__text-holder"
            ref={textHolderRef}
          >
            <div
              className={cx("cds-aichat--launcher-extended__greeting", {
                "cds-aichat--launcher-extended__element--hidden": !showGreeting,
              })}
              ref={greetingRef}
            >
              <div
                className="cds-aichat--launcher-extended__greeting-text"
                aria-hidden={!isExtended}
                ref={nameplateRef}
              >
                {greetingText}
              </div>
            </div>
          </div>
          <div className="cds-aichat--launcher__icon-holder">{icon}</div>
        </div>
      </div>
    </LauncherButton>
  );
};

export { LauncherMobile };

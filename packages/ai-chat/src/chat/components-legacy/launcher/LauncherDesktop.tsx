/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { ReactNode, RefObject } from "react";
import Tag from "../../components/carbon/Tag";
import cx from "classnames";

import { LauncherButton, LauncherHandle } from "./LauncherButton";
import HasIntl from "../../../types/utilities/HasIntl";
import { PageObjectId } from "../../utils/PageObjectId";

interface LauncherDesktopProps extends HasIntl {
  launcherAvatar: ReactNode;
  launcherContent: ReactNode;
  launcherCloseButtonLabel: string;
  launcherCloseButtonAriaLabel: string;
  launcherClosedLabel: string;
  launcherOpenLabel: string;
  launcherHidden: boolean;
  launcherRef: RefObject<LauncherHandle | null>;
  onMinimize: () => void;
  onOpen: () => void;
  showUnreadIndicator: boolean;
  unreadHumanAgentCount: number;
  className?: string;
}

const LauncherDesktop = (props: LauncherDesktopProps) => {
  const {
    launcherAvatar,
    launcherContent,
    launcherCloseButtonLabel,
    launcherCloseButtonAriaLabel,
    launcherClosedLabel,
    launcherOpenLabel,
    launcherHidden,
    launcherRef,
    onMinimize,
    onOpen,
    showUnreadIndicator,
    unreadHumanAgentCount,
    intl,
    className,
  } = props;

  return (
    <div
      className={cx(
        "cds-aichat--launcher__button-container",
        "cds-aichat--launcher-complex__container",
        className,
        {
          "cds-aichat--launcher__button-container--hidden": launcherHidden,
        },
      )}
    >
      <button
        className="cds-aichat--launcher-complex__content-button"
        type="button"
        onClick={onOpen}
        disabled={false}
      >
        <div
          className={cx("cds-aichat--widget__text-ellipsis", {
            "cds-aichat--launcher-complex__text": !launcherHidden,
          })}
        >
          {launcherContent}
        </div>
      </button>
      <LauncherButton
        containerClassName="cds-aichat--launcher-complex__small-launcher-container"
        dataTestId={PageObjectId.LAUNCHER}
        closedLabel={launcherClosedLabel}
        intl={intl}
        openLabel={launcherOpenLabel}
        launcherHidden={launcherHidden}
        onToggleOpen={onOpen}
        ref={launcherRef}
        showUnreadIndicator={showUnreadIndicator}
        unreadHumanAgentCount={unreadHumanAgentCount}
      >
        {launcherAvatar}
      </LauncherButton>
      <Tag
        className="cds-aichat--launcher__close-button"
        aria-label={launcherCloseButtonAriaLabel}
        onClick={onMinimize}
        tabIndex={0}
      >
        {launcherCloseButtonLabel}
      </Tag>
    </div>
  );
};

export { LauncherDesktop };

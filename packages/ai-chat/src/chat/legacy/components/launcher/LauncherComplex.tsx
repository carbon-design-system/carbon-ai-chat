/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Close16 from "@carbon/icons/es/close/16.js";
import { carbonIconToReact } from "../../../utils/carbonIcon";
import Tag from "../../../components/carbon/Tag";
import cx from "classnames";
import React, { RefObject } from "react";

import { HasClassName } from "../../../../types/utilities/HasClassName";
import HasIntl from "../../../../types/utilities/HasIntl";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { LauncherConfig } from "../../../../types/config/LauncherConfig";
import { Launcher } from "./Launcher";
import { LanguagePack } from "../../../../types/config/PublicConfig";

const CloseIcon = carbonIconToReact(Close16);

interface LauncherComplexProps extends HasIntl, HasClassName {
  languagePack: LanguagePack;
  launcher: LauncherConfig;
  onOpen: () => void;
  onMinimize: () => void;

  /**
   * Used by the launcherDesktopContainer to determine the current height of this component.
   */
  launcherComplexRef: RefObject<HTMLDivElement>;

  /**
   * Necessary to get access to the ref created within App.tsx.
   */
  launcherRef: RefObject<HasRequestFocus>;

  /**
   * The number of unread messages from a human agent that should be displayed on the launcher. If this is 0, no
   * agent indicator will be shown unless showUnreadIndicator is set.
   */
  unreadHumanAgentCount: number;

  /**
   * Indicates if we should show an empty (no number) unread indicator on the launcher. This only applies the first time
   * in the session before the user has opened the Carbon AI Chat and is superseded by the agent unread indicator if there
   * is one.
   */
  showUnreadIndicator: boolean;

  /**
   * Indicates the desktop launcher is in its expanded state.
   */
  desktopLauncherIsExpanded: boolean;

  /**
   * If the main Carbon AI Chat window is open is visible the launcher should be hidden.
   */
  launcherHidden: boolean;
}

function LauncherComplex(props: LauncherComplexProps) {
  const {
    languagePack,
    intl,
    launcher,
    launcherComplexRef,
    launcherRef,
    onOpen,
    onMinimize,
    unreadHumanAgentCount,
    showUnreadIndicator,
    desktopLauncherIsExpanded,
    launcherHidden,
    className,
  } = props;
  const {
    launcher_desktopGreeting,
    launcher_closeButton,
    launcher_ariaIsExpanded,
  } = languagePack;

  function getLauncherContent() {
    // Use the title from the launcher config.
    if (launcher.desktop.title) {
      return launcher.desktop.title;
    }

    // If there is nothing set in the launcher config then use our own default.
    return launcher_desktopGreeting;
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onMinimize();
    }
  };

  /**
   * Renders the complex variation of the launcher.
   */
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
      ref={launcherComplexRef}
    >
      <button
        className="cds-aichat--launcher-complex__content-button"
        type="button"
        onClick={onOpen}
        disabled={!desktopLauncherIsExpanded}
      >
        <div
          className={cx("cds-aichat--widget__text-ellipsis", {
            "cds-aichat--launcher-complex__text": !launcherHidden,
          })}
        >
          {getLauncherContent()}
        </div>
      </button>
      <Launcher
        languagePack={languagePack}
        intl={intl}
        ref={launcherRef}
        onToggleOpen={onOpen}
        className="cds-aichat--launcher-complex__small-launcher-container"
        unreadHumanAgentCount={unreadHumanAgentCount}
        showUnreadIndicator={showUnreadIndicator}
        launcherHidden={launcherHidden}
      />
      {/* Potential close button changes - possibly match the accent color, or change/animate on hover of container */}
      <Tag
        className="cds-aichat--launcher__close-button"
        aria-label={launcher_ariaIsExpanded}
        onClick={onMinimize}
        onKeyDown={handleTagKeyDown}
        tabIndex={desktopLauncherIsExpanded ? 0 : -1}
      >
        <CloseIcon
          slot="icon"
          className="cds-aichat--launcher__close-button-icon"
        />
        {launcher_closeButton}
      </Tag>
    </div>
  );
}

export { LauncherComplex };

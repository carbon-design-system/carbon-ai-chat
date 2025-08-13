/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/* eslint-disable react/no-danger */

import CDSButton from "@carbon/web-components/es-custom/components/button/button.js";
import ArrowUpLeft24 from "@carbon/icons/es/arrow--up-left/24.js";
import AiLaunch from "@carbon/icons-react/es/AiLaunch.js";
// import ArrowUpLeft from "@carbon/icons-react/es/ArrowUpLeft.js";
import ChatLaunch from "@carbon/icons-react/es/ChatLaunch.js";
import { carbonIconToReact } from "../../utils/carbonIcon";
// import { Button } from "@carbon/react";
import Button, { BUTTON_KIND, BUTTON_TYPE } from "../../../react/carbon/Button";
import cx from "classnames";
import React, { forwardRef, Ref, RefObject, useImperativeHandle } from "react";
import { useSelector } from "react-redux";

import { AppState } from "../../../../types/state/AppState";
import { HasClassName } from "../../../../types/utilities/HasClassName";
import HasIntl from "../../../../types/utilities/HasIntl";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { doFocusRef } from "../../utils/domUtils";
import { getLauncherButtonAriaLabel } from "./launcherUtils";
import { LanguagePack } from "../../../../types/instance/apiTypes";
import { PageObjectId } from "../../utils/PageObjectId";

const ArrowUpLeft = carbonIconToReact(ArrowUpLeft24);
interface LauncherProps extends HasClassName, HasIntl {
  languagePack: LanguagePack;
  onToggleOpen: () => void;

  /**
   * The number of unread messages from a human agent that should be displayed on the launcher. If this is 0, no
   * agent indicator will be shown unless showUnreadIndicator is set.
   */
  unreadAgentCount: number;

  /**
   * Indicates if we should show an empty (no number) unread indicator on the launcher. This only applies the first time
   * in the session before the user has opened the Carbon AI chat and is superseded by the agent unread indicator if there
   * is one.
   */
  showUnreadIndicator: boolean;

  /**
   * https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
   */
  tabIndex?: number;

  /**
   * If the main Carbon AI chat window is open or a tour is visible the launcher should be hidden.
   */
  launcherHidden: boolean;

  /**
   * If there's an active tour a different launcher icon needs to be shown to communicate that clicking on the launcher
   * will open a tour.
   */
  activeTour: boolean;
}

function Launcher(props: LauncherProps, ref: Ref<HasRequestFocus>) {
  const {
    onToggleOpen,
    languagePack,
    unreadAgentCount,
    intl,
    showUnreadIndicator,
    className,
    tabIndex,
    launcherHidden,
    activeTour,
  } = props;
  const launcherAvatarURL = useSelector((state: AppState) =>
    state.theme.useAITheme
      ? undefined
      : state.launcher.config.desktop.avatar_url_override
  );
  const useAITheme = useSelector((state: AppState) => state.theme.useAITheme);

  /**
   * A React ref to the button in this component.
   */
  const buttonRef: RefObject<CDSButton> = React.createRef();

  useImperativeHandle(ref, () => ({
    /**
     * This is a function that will request that focus be moved to the button. This request for focus is normally
     * triggered within App.tsx.
     */
    requestFocus: () => {
      doFocusRef(buttonRef);
    },
  }));

  let ariaLabel = getLauncherButtonAriaLabel(
    languagePack,
    launcherHidden,
    activeTour
  );

  if (unreadAgentCount !== 0) {
    ariaLabel += `. ${intl.formatMessage(
      { id: "icon_ariaUnreadMessages" },
      { count: unreadAgentCount }
    )}`;
  }

  let launcherAvatar = useAITheme ? (
    <AiLaunch size={24} className="WACLauncher_svg" />
  ) : (
    <ChatLaunch size={24} className="WACLauncher__svg" />
  );

  if (launcherAvatarURL) {
    launcherAvatar = (
      <img
        className="WACLauncher__Avatar"
        src={launcherAvatarURL}
        alt=""
        aria-hidden
      />
    );
  }

  /**
   * Renders the corresponding variation of the launcher button.
   */
  return (
    <div
      className={cx(
        "WACLauncher__ButtonContainer",
        "WACLauncher__ButtonContainer--round",
        className,
        {
          "WACLauncher__ButtonContainer--hidden": launcherHidden,
        }
      )}
    >
      <Button
        aria-label={ariaLabel}
        className={cx("WACLauncher__Button", {
          WACLauncher__TourButton: activeTour,
        })}
        data-testid={PageObjectId.LAUNCHER}
        kind={BUTTON_KIND.PRIMARY}
        type={"button" as BUTTON_TYPE}
        onClick={onToggleOpen}
        ref={buttonRef}
        tabIndex={tabIndex}
      >
        {activeTour ? (
          <ArrowUpLeft className="WACLauncher__svg" slot="icon" />
        ) : (
          launcherAvatar
        )}

        {(unreadAgentCount !== 0 || showUnreadIndicator) && (
          <div className="WAC__countIndicator">
            {unreadAgentCount !== 0 ? unreadAgentCount : ""}
          </div>
        )}
      </Button>
    </div>
  );
}

const LauncherExport = forwardRef(Launcher);
export { LauncherExport as Launcher };

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/* eslint-disable react/no-danger */

import AiLaunch from "@carbon/icons-react/es/AiLaunch.js";
import ChatLaunch from "@carbon/icons-react/es/ChatLaunch.js";
import { Button } from "@carbon/react";
import cx from "classnames";
import React, { forwardRef, Ref, RefObject, useImperativeHandle } from "react";
import { useSelector } from "react-redux";

import { AppState } from "../../../../types/state/AppState";
import { HasClassName } from "../../../../types/utilities/HasClassName";
import HasIntl from "../../../../types/utilities/HasIntl";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { doFocusRef } from "../../utils/domUtils";
import { getLauncherButtonAriaLabel } from "./launcherUtils";
import { ButtonKindEnum } from "../../../../types/utilities/carbonTypes";
import { LanguagePack } from "../../../../types/instance/apiTypes";
import { PageObjectId } from "../../utils/PageObjectId";

interface LauncherProps extends HasClassName, HasIntl {
  languagePack: LanguagePack;
  onToggleOpen: () => void;

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
   * https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
   */
  tabIndex?: number;

  /**
   * If the main Carbon AI Chat window is open is visible the launcher should be hidden.
   */
  launcherHidden: boolean;
}

function Launcher(props: LauncherProps, ref: Ref<HasRequestFocus>) {
  const {
    onToggleOpen,
    languagePack,
    unreadHumanAgentCount,
    intl,
    showUnreadIndicator,
    className,
    tabIndex,
    launcherHidden,
  } = props;
  const launcherAvatarURL = useSelector((state: AppState) =>
    state.theme.useAITheme
      ? undefined
      : state.launcher.config.desktop.avatar_url_override,
  );
  const useAITheme = useSelector((state: AppState) => state.theme.useAITheme);

  /**
   * A React ref to the button in this component.
   */
  const buttonRef: RefObject<HTMLButtonElement> = React.createRef();

  useImperativeHandle(ref, () => ({
    /**
     * This is a function that will request that focus be moved to the button. This request for focus is normally
     * triggered within App.tsx.
     */
    requestFocus: () => {
      doFocusRef(buttonRef);
    },
  }));

  let ariaLabel = getLauncherButtonAriaLabel(languagePack, launcherHidden);

  if (unreadHumanAgentCount !== 0) {
    ariaLabel += `. ${intl.formatMessage(
      { id: "icon_ariaUnreadMessages" },
      { count: unreadHumanAgentCount },
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
        },
      )}
    >
      <Button
        aria-label={ariaLabel}
        className="WACLauncher__Button"
        data-testid={PageObjectId.LAUNCHER}
        kind={ButtonKindEnum.PRIMARY}
        type="button"
        onClick={onToggleOpen}
        ref={buttonRef}
        tabIndex={tabIndex}
      >
        {launcherAvatar}

        {(unreadHumanAgentCount !== 0 || showUnreadIndicator) && (
          <div className="WAC__countIndicator">
            {unreadHumanAgentCount !== 0 ? unreadHumanAgentCount : ""}
          </div>
        )}
      </Button>
    </div>
  );
}

const LauncherExport = forwardRef(Launcher);
export { LauncherExport as Launcher };

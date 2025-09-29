/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import CDSButton from "@carbon/web-components/es/components/button/button.js";
import AiLaunch24 from "@carbon/icons/es/ai-launch/24.js";
import ChatLaunch24 from "@carbon/icons/es/chat--launch/24.js";
import { carbonIconToReact } from "../../utils/carbonIcon";
import Button, {
  BUTTON_KIND,
  BUTTON_TYPE,
} from "../../components/carbon/Button";
import cx from "classnames";
import React, { forwardRef, Ref, RefObject, useImperativeHandle } from "react";
import { useSelector } from "../../hooks/useSelector";

import { AppState } from "../../../types/state/AppState";
import { HasClassName } from "../../../types/utilities/HasClassName";
import HasIntl from "../../../types/utilities/HasIntl";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { doFocusRef } from "../../utils/domUtils";
import { getLauncherButtonAriaLabel } from "./launcherUtils";
import { LanguagePack } from "../../../types/config/PublicConfig";
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
  const launcherAvatarURL = useSelector(
    (state: AppState) =>
      state.config.derived.launcher.desktop.avatarUrlOverride,
  );
  const useAITheme = useSelector(
    (state: AppState) => state.config.derived.themeWithDefaults.aiEnabled,
  );

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

  let ariaLabel = getLauncherButtonAriaLabel(languagePack, launcherHidden);

  if (unreadHumanAgentCount !== 0) {
    ariaLabel += `. ${intl.formatMessage(
      { id: "icon_ariaUnreadMessages" },
      { count: unreadHumanAgentCount },
    )}`;
  }

  const AiLaunch = carbonIconToReact(AiLaunch24);
  const ChatLaunch = carbonIconToReact(ChatLaunch24);
  let launcherAvatar = useAITheme ? (
    <AiLaunch className="cds-aichat--launcher-svg" />
  ) : (
    <ChatLaunch className="cds-aichat--launcher__svg" />
  );

  if (launcherAvatarURL) {
    launcherAvatar = (
      <img
        className="cds-aichat--launcher__avatar"
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
        "cds-aichat--launcher__button-container",
        "cds-aichat--launcher__button-container--round",
        className,
        {
          "cds-aichat--launcher__button-container--hidden": launcherHidden,
        },
      )}
    >
      <Button
        aria-label={ariaLabel}
        className="cds-aichat--launcher__button"
        data-testid={PageObjectId.LAUNCHER}
        kind={BUTTON_KIND.PRIMARY}
        type={BUTTON_TYPE.BUTTON}
        onClick={onToggleOpen}
        ref={buttonRef}
        tabIndex={tabIndex}
      >
        {launcherAvatar}

        {(unreadHumanAgentCount !== 0 || showUnreadIndicator) && (
          <div className="cds-aichat--count-indicator">
            {unreadHumanAgentCount !== 0 ? unreadHumanAgentCount : ""}
          </div>
        )}
      </Button>
    </div>
  );
}

const LauncherExport = forwardRef(Launcher);
export { LauncherExport as Launcher };

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useMemo } from "react";
import Restart16 from "@carbon/icons/es/restart/16.js";
import cx from "classnames";

import ChatButton, {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_SIZE,
} from "../carbon/ChatButton";
import { ErrorMessage } from "./ErrorMessage";
import { MarkdownWithDefaults } from "../helpers/MarkdownWithDefaults/MarkdownWithDefaults";
import { useCarbonTheme } from "../../hooks/useCarbonTheme";
import { carbonIconToReact } from "../../utils/carbonIcon";
import { LanguagePack } from "../../../types/config/LanguagePack";
import { AppState } from "../../../types/state/AppState";
import { useIntl } from "../../hooks/useIntl";
import { useSelector } from "../../hooks/useSelector";
import { shallowEqual } from "../../store/appStore";

interface CatastrophicErrorPanelProps {
  title?: string;
  bodyText?: string;
  onRestart: () => void;
  hideRetryButton?: boolean;
}

const CatastrophicErrorPanel: React.FC<CatastrophicErrorPanelProps> = ({
  title,
  bodyText,
  onRestart,
  hideRetryButton,
}) => {
  const intl = useIntl();
  const { isDarkTheme } = useCarbonTheme();
  const languagePack = useSelector(
    (state: AppState) => ({
      errors_somethingWrong: state.languagePack.errors_somethingWrong,
      buttons_restart: state.languagePack.buttons_restart,
      buttons_retry: state.languagePack.buttons_retry,
    }),
    shallowEqual,
  );
  const assistantName = useSelector(
    (state: AppState) => state.config.public.assistantName,
  );

  const errorTitle = useMemo(
    () => title ?? languagePack.errors_somethingWrong,
    [title, languagePack],
  );

  const errorBodyText = useMemo(
    () =>
      bodyText ??
      intl.formatMessage(
        { id: "errors_communicating" as keyof LanguagePack },
        { assistantName },
      ),
    [bodyText, intl, assistantName],
  );

  const Restart = carbonIconToReact(Restart16);

  return (
    <div
      className={cx(
        "cds-aichat--catastrophic-error",
        "cds-aichat--panel-content",
      )}
    >
      <div className="cds-aichat--catastrophic-error__error-text-container">
        <ErrorMessage theme={isDarkTheme ? "dark" : "light"} />
        <div className="cds-aichat--catastrophic-error__error-heading">
          {errorTitle}
        </div>
        <div className="cds-aichat--catastrophic-error__error-body">
          <MarkdownWithDefaults text={errorBodyText} highlight={true} />
        </div>
        {!hideRetryButton && onRestart && (
          <ChatButton
            className="cds-aichat--catastrophic-error__restart-button"
            kind={CHAT_BUTTON_KIND.TERTIARY}
            size={CHAT_BUTTON_SIZE.SMALL}
            aria-label={languagePack.buttons_restart}
            onClick={onRestart}
          >
            <Restart slot="icon" />
            {languagePack.buttons_retry}
          </ChatButton>
        )}
      </div>
    </div>
  );
};

export default CatastrophicErrorPanel;

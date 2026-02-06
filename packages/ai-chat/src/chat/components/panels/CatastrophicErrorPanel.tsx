/*
 *  Copyright IBM Corp. 2025
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
import { ErrorMessage } from "../../components-legacy/ErrorMessage";
import RichText from "../../components-legacy/responseTypes/util/RichText";
import { useCarbonTheme } from "../../hooks/useCarbonTheme";
import { carbonIconToReact } from "../../utils/carbonIcon";
import { LanguagePack } from "../../../types/config/PublicConfig";
import { useIntl } from "../../hooks/useIntl";

interface CatastrophicErrorPanelProps {
  assistantName: string;
  languagePack: LanguagePack;
  onRestart: () => void;
}

const CatastrophicErrorPanel: React.FC<CatastrophicErrorPanelProps> = ({
  assistantName,
  languagePack,
  onRestart,
}) => {
  const intl = useIntl();
  const { isDarkTheme } = useCarbonTheme();

  const errorBodyText = useMemo(
    () =>
      intl.formatMessage(
        { id: "errors_communicating" as keyof LanguagePack },
        { assistantName },
      ),
    [intl, assistantName],
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
          {languagePack.errors_somethingWrong}
        </div>
        <div className="cds-aichat--catastrophic-error__error-body">
          <RichText text={errorBodyText} highlight={true} />
        </div>
        {onRestart && (
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

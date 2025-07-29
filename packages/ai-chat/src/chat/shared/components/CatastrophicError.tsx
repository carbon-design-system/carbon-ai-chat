/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Restart from "@carbon/icons-react/es/Restart.js";
import { unstable__ChatButton as ChatButton } from "@carbon/react";
import cx from "classnames";
import React from "react";
import { useIntl } from "react-intl";
import { useSelector } from "react-redux";

import { AppState } from "../../../types/state/AppState";
import HasLanguagePack from "../../../types/utilities/HasLanguagePack";
import { ErrorMessageDark } from "./ErrorMessageDark";
import { ErrorMessageLight } from "./ErrorMessageLight";
import { BotHeader } from "./header/BotHeader";
import RichText from "./responseTypes/util/RichText";
import {
  ButtonKindEnum,
  ButtonSizeEnum,
  CarbonTheme,
} from "../../../types/utilities/carbonTypes";
import { EnglishLanguagePack } from "../../../types/instance/apiTypes";
import { OverlayPanelName } from "./OverlayPanel";

interface CatastrophicErrorProps extends HasLanguagePack {
  /**
   * Whether to render the header or just the content.
   */
  showHeader: boolean;

  /**
   * If defined, will show a button to restart the Carbon AI chat by calling this method.
   */
  onRestart?: () => void;

  /**
   * Method to call if close button is pressed.
   */
  onClose?: () => void;

  /**
   * Name of the bot!
   */
  botName: string;

  /**
   * Name to show in header.
   */
  headerDisplayName: string;
}

/**
 * This component is rendered while the Carbon AI chat is hydrating.
 */

function CatastrophicError({
  onClose,
  languagePack,
  onRestart,
  showHeader,
  botName,
  headerDisplayName,
}: CatastrophicErrorProps) {
  const intl = useIntl();
  const carbonTheme = useSelector((state: AppState) => state.theme.carbonTheme);
  const isDarkTheme =
    carbonTheme === CarbonTheme.G90 || carbonTheme === CarbonTheme.G100;

  const errorKey: keyof EnglishLanguagePack = "errors_communicating";

  const errorBodyText = intl.formatMessage({ id: errorKey }, { botName });
  return (
    <div className="WAC">
      {showHeader && (
        <BotHeader
          headerDisplayName={headerDisplayName}
          onClose={onClose}
          onToggleHomeScreen={null}
          includeWriteableElement={false}
          testIdPrefix={OverlayPanelName.CATASTROPHIC}
        />
      )}
      <div
        className={cx("WACCatastrophicError", "WACPanelContent", {
          "WACCatastrophicError--withHeader": showHeader,
        })}
      >
        <div className="WACCatastrophicError__ErrorTextContainer">
          {isDarkTheme && <ErrorMessageDark />}
          {!isDarkTheme && <ErrorMessageLight />}
          <div className="WACCatastrophicError__ErrorHeading">
            {languagePack.errors_somethingWrong}
          </div>
          <div className="WACCatastrophicError__ErrorBody">
            <RichText text={errorBodyText} />
          </div>
          {onRestart && (
            <ChatButton
              className="WACCatastrophicError__RestartButton"
              kind={ButtonKindEnum.TERTIARY}
              size={ButtonSizeEnum.SMALL}
              aria-label={languagePack.buttons_restart}
              onClick={onRestart}
              renderIcon={Restart}
              type="button"
            >
              {languagePack.buttons_retry}
            </ChatButton>
          )}
        </div>
      </div>
    </div>
  );
}

const CatastrophicErrorExport = React.memo(CatastrophicError);

export { CatastrophicErrorExport as CatastrophicError };

export type { CatastrophicErrorProps };

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/* eslint-disable react/no-danger */

/**
 * When someone views the Web Chat they must respond to the disclaimer before continuing to the main Web Chat if this
 * is enabled. We drop an item in SESSION storage to not ask them again as they go from page to page.
 */
import Button from "../components/carbon/Button";
import CDSButton from "@carbon/web-components/es/components/button/button.js";
import React, { RefObject, useRef, useState } from "react";
import { useSelector } from "../hooks/useSelector";
import { PageObjectId } from "../utils/PageObjectId";

import { useLanguagePack } from "../hooks/useLanguagePack";
import { useOnMount } from "../hooks/useOnMount";
import { AppState, ChatWidthBreakpoint } from "../../types/state/AppState";
import { ChatBubbleDark } from "./ChatBubbleDark";
import { ChatBubbleLight } from "./ChatBubbleLight";
import { Header } from "./header/Header";
import { MinimizeButtonIconType } from "../../types/config/PublicConfig";
import { CarbonTheme } from "../../types/config/PublicConfig";

interface DisclaimerProps {
  onAcceptDisclaimer: () => void;
  disclaimerHTML: string;
  onClose: () => void;
  disclaimerAcceptButtonRef: RefObject<CDSButton | null>;
}

function Disclaimer({
  onAcceptDisclaimer,
  onClose,
  disclaimerHTML,
  disclaimerAcceptButtonRef,
}: DisclaimerProps) {
  const languagePack = useLanguagePack();
  const chatWidthBreakpoint = useSelector(
    (state: AppState) => state.chatWidthBreakpoint,
  );
  const { derivedCarbonTheme } = useSelector(
    (state: AppState) => state.config.derived.themeWithDefaults,
  );
  const isDarkTheme =
    derivedCarbonTheme === CarbonTheme.G90 ||
    derivedCarbonTheme === CarbonTheme.G100;
  const [hasReadDisclaimer, setHasReadDisclaimer] = useState(false);
  const disclaimerContent = useRef<HTMLDivElement>(undefined);

  const onScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = disclaimerContent.current;
    const scrollBottom = clientHeight - scrollHeight + scrollTop;
    if (scrollBottom >= 0) {
      setHasReadDisclaimer(true);
    }
  };

  // Make sure that we don't enable the Accept button until the user reads the whole disclaimer.
  useOnMount(() => {
    onScroll();
  });

  function renderChatBubble() {
    return isDarkTheme ? <ChatBubbleDark /> : <ChatBubbleLight />;
  }

  return (
    <div className="cds-aichat--disclaimer-container">
      <div className="cds-aichat--disclaimer">
        <Header
          onClickClose={onClose}
          showRestartButton={false}
          showAiLabel={false}
          closeButtonLabel={languagePack.launcher_isOpen}
          restartButtonLabel={languagePack.buttons_restart}
          overflowMenuTooltip={languagePack.header_overflowMenu_options}
          overflowMenuAriaLabel={languagePack.components_overflow_ariaLabel}
          aiSlugLabel={languagePack.ai_slug_label}
          aiSlugTitle={languagePack.ai_slug_title}
          aiSlugDescription={languagePack.ai_slug_description}
          minimizeButtonIconType={MinimizeButtonIconType.MINIMIZE}
          isRestarting={false}
        />
        <div
          className="cds-aichat--panel-content cds-aichat--disclaimer__content"
          onScroll={onScroll}
          ref={disclaimerContent}
        >
          <div className="cds-aichat--disclaimer__icon">
            {renderChatBubble()}
          </div>
          <h1 className="cds-aichat--disclaimer__title">
            {languagePack.disclaimer_title}
          </h1>
          <div
            dangerouslySetInnerHTML={{ __html: disclaimerHTML }}
            className="cds-aichat--disclaimer__description"
          />
        </div>
        <div className="cds-aichat--disclaimer__buttons">
          <div className="cds-aichat--disclaimer__buttons-padding">
            <Button
              className="cds-aichat--disclaimer__accept-button"
              data-testid={PageObjectId.DISCLAIMER_ACCEPT_BUTTON}
              ref={disclaimerAcceptButtonRef}
              onClick={onAcceptDisclaimer}
              size={
                chatWidthBreakpoint === ChatWidthBreakpoint.WIDE ? "2xl" : "lg"
              }
              disabled={!hasReadDisclaimer}
            >
              {languagePack.disclaimer_accept}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Disclaimer };

export default Disclaimer;

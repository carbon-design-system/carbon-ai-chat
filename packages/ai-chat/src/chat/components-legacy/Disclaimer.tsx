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

import { useLanguagePack } from "../hooks/useLanguagePack";
import { useOnMount } from "../hooks/useOnMount";
import { AppState, ChatWidthBreakpoint } from "../../types/state/AppState";
import { ChatBubbleDark } from "./ChatBubbleDark";
import { ChatBubbleLight } from "./ChatBubbleLight";
import { SimpleHeader } from "./header/SimpleHeader";
import { OverlayPanelName } from "./OverlayPanel";
import { CarbonTheme } from "../../types/config/PublicConfig";

interface DisclaimerProps {
  onAcceptDisclaimer: () => void;
  disclaimerHTML: string;
  onClose: () => void;
  disclaimerAcceptButtonRef: RefObject<CDSButton>;
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
  const { derivedCarbonTheme, aiEnabled } = useSelector(
    (state: AppState) => state.config.derived.themeWithDefaults,
  );
  const isDarkTheme =
    derivedCarbonTheme === CarbonTheme.G90 ||
    derivedCarbonTheme === CarbonTheme.G100;
  const [hasReadDisclaimer, setHasReadDisclaimer] = useState(false);
  const disclaimerContent = useRef<HTMLDivElement>();

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
        <SimpleHeader
          useAITheme={aiEnabled}
          onClose={onClose}
          testIdPrefix={OverlayPanelName.DISCLAIMER}
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

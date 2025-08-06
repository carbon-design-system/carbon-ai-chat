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

import { Button } from "@carbon/react";
import React, { RefObject, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { useLanguagePack } from "../hooks/useLanguagePack";
import { useOnMount } from "../hooks/useOnMount";
import { AppState, ChatWidthBreakpoint } from "../../../types/state/AppState";
import { ChatBubbleDark } from "./ChatBubbleDark";
import { ChatBubbleLight } from "./ChatBubbleLight";
import { SimpleHeader } from "./header/SimpleHeader";
import { CarbonTheme } from "../../../types/utilities/carbonTypes";
import { OverlayPanelName } from "./OverlayPanel";

interface DisclaimerProps {
  onAcceptDisclaimer: () => void;
  disclaimerHTML: string;
  onClose: () => void;
  disclaimerAcceptButtonRef: RefObject<HTMLButtonElement>;
}

function Disclaimer({
  onAcceptDisclaimer,
  onClose,
  disclaimerHTML,
  disclaimerAcceptButtonRef,
}: DisclaimerProps) {
  const languagePack = useLanguagePack();
  const chatWidthBreakpoint = useSelector(
    (state: AppState) => state.chatWidthBreakpoint
  );
  const { carbonTheme, useAITheme } = useSelector(
    (state: AppState) => state.theme
  );
  const isDarkTheme =
    carbonTheme === CarbonTheme.G90 || carbonTheme === CarbonTheme.G100;
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
    <div className="WACDisclaimerContainer">
      <div className="WAC__disclaimer">
        <SimpleHeader
          useAITheme={useAITheme}
          onClose={onClose}
          testIdPrefix={OverlayPanelName.DISCLAIMER}
        />
        <div
          className="WACPanelContent WAC__disclaimer-content"
          onScroll={onScroll}
          ref={disclaimerContent}
        >
          <div className="WAC__disclaimer-icon">{renderChatBubble()}</div>
          <h1 className="WAC__disclaimer-title">
            {languagePack.disclaimer_title}
          </h1>
          <div
            dangerouslySetInnerHTML={{ __html: disclaimerHTML }}
            className="WAC__disclaimer-description"
          />
        </div>
        <div className="WAC__disclaimer-buttons">
          <div className="WAC__disclaimer-buttonsPadding">
            <Button
              className="WAC__disclaimer-acceptButton"
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

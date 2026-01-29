/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useMemo } from "react";
import type CDSButton from "@carbon/web-components/es/components/button/button.js";

import Button from "../carbon/Button";
import { ChatBubble } from "../../components-legacy/ChatBubble";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useSelector } from "../../hooks/useSelector";
import { PageObjectId } from "../../../testing/PageObjectId";
import { AppState, ChatWidthBreakpoint } from "../../../types/state/AppState";
import { CarbonTheme } from "../../../types/config/PublicConfig";

interface DisclaimerPanelProps {
  disclaimerHTML?: string;
  disclaimerAcceptButtonRef: React.RefObject<CDSButton | null>;
  onAcceptDisclaimer: () => void;
}

interface DisclaimerPanelContent {
  body: React.ReactElement;
  footer: React.ReactElement;
  onBodyScroll: (event: CustomEvent) => void;
}

const DisclaimerPanel = ({
  disclaimerHTML,
  disclaimerAcceptButtonRef,
  onAcceptDisclaimer,
}: DisclaimerPanelProps): DisclaimerPanelContent => {
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

  const [hasReadDisclaimer, setHasReadDisclaimer] = React.useState(false);
  const disclaimerContent = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const panelElement = disclaimerContent.current?.closest("cds-aichat-panel");
    if (!panelElement) {
      return undefined;
    }

    // Trigger initial check by dispatching a fake scroll event
    // This will be picked up by the panel's scroll listener
    const checkInitialState = () => {
      const panelBody = panelElement.shadowRoot?.querySelector(".panel-body");
      if (panelBody) {
        const scrollEvent = new Event("scroll", { bubbles: true });
        panelBody.dispatchEvent(scrollEvent);
      }
    };

    // Check multiple times to ensure content is rendered and measured
    const timeoutId1 = setTimeout(checkInitialState, 100);
    const timeoutId2 = setTimeout(checkInitialState, 300);
    const timeoutId3 = setTimeout(checkInitialState, 500);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
    };
  }, []);

  const handleBodyScroll = React.useCallback((event: CustomEvent) => {
    const { isScrollable, isAtBottom } = event.detail;

    // Enable button if content is not scrollable OR user has scrolled to bottom
    if (!isScrollable || isAtBottom) {
      setHasReadDisclaimer(true);
    }
  }, []);

  // Memoize the returned object to prevent infinite re-renders
  return useMemo(
    () => ({
      body: (
        <div
          className="cds-aichat--panel-content cds-aichat--disclaimer__content"
          ref={disclaimerContent}
        >
          <div className="cds-aichat--disclaimer__icon">
            <ChatBubble
              theme={isDarkTheme ? "dark" : "light"}
              label={languagePack.disclaimer_icon_label}
            />
          </div>
          <h1 className="cds-aichat--disclaimer__title">
            {languagePack.disclaimer_title}
          </h1>
          <div
            dangerouslySetInnerHTML={{ __html: disclaimerHTML }}
            className="cds-aichat--disclaimer__description"
          />
        </div>
      ),
      footer: (
        <Button
          className="cds-aichat--disclaimer__accept-button"
          data-testid={PageObjectId.DISCLAIMER_ACCEPT_BUTTON}
          ref={disclaimerAcceptButtonRef}
          onClick={onAcceptDisclaimer}
          size={chatWidthBreakpoint === ChatWidthBreakpoint.WIDE ? "2xl" : "lg"}
          disabled={!hasReadDisclaimer}
        >
          {languagePack.disclaimer_accept}
        </Button>
      ),
      onBodyScroll: handleBodyScroll,
    }),
    [
      isDarkTheme,
      languagePack,
      disclaimerHTML,
      disclaimerAcceptButtonRef,
      onAcceptDisclaimer,
      chatWidthBreakpoint,
      hasReadDisclaimer,
      handleBodyScroll,
    ],
  );
};

export default DisclaimerPanel;

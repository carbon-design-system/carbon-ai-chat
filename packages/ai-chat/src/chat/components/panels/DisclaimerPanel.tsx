/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createComponent } from '@lit/react';
import type CDSButton from '@carbon/web-components/es/components/button/button.js';
import Button from '../carbon/Button';
import { useSelector } from '../../hooks/useSelector';
import { shallowEqual } from '../../store/appStore';
import { PageObjectId } from '../../../testing/PageObjectId';
import { AppState, ChatWidthBreakpoint } from '../../../types/state/AppState';
import DisclaimerBody from './native/DisclaimerBody';

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

const NativeDisclaimerBody = createComponent({
  tagName: 'cds-aichat-disclaimer-body',
  elementClass: DisclaimerBody,
  react: React,
});

const DisclaimerPanel = ({
  disclaimerHTML,
  disclaimerAcceptButtonRef,
  onAcceptDisclaimer,
}: DisclaimerPanelProps): DisclaimerPanelContent => {
  const languagePack = useSelector(
    (state: AppState) => ({
      disclaimer_acceptance_label:
        state.languagePack.disclaimer_acceptance_label,
      disclaimer_accept: state.languagePack.disclaimer_accept,
    }),
    shallowEqual
  );
  const chatWidthBreakpoint = useSelector(
    (state: AppState) => state.chatWidthBreakpoint
  );
  const [hasReadDisclaimer, setHasReadDisclaimer] = useState(false);
  const bodyRef = useRef<DisclaimerBody>(null);
  const handleBodyScroll = useCallback((event: CustomEvent) => {
    bodyRef.current?.observeScroll(event.detail);
  }, []);

  return useMemo(
    () => ({
      body: (
        <NativeDisclaimerBody
          ref={bodyRef}
          disclaimerHTML={disclaimerHTML}
          onReadChange={setHasReadDisclaimer}
        />
      ),
      footer: (
        <Button
          className="cds-aichat--disclaimer__accept-button"
          data-testid={PageObjectId.DISCLAIMER_ACCEPT_BUTTON}
          ref={disclaimerAcceptButtonRef}
          onClick={onAcceptDisclaimer}
          size={chatWidthBreakpoint === ChatWidthBreakpoint.WIDE ? '2xl' : 'lg'}
          disabled={!hasReadDisclaimer}
          role="button"
          aria-label={languagePack.disclaimer_acceptance_label}>
          {languagePack.disclaimer_accept}
        </Button>
      ),
      onBodyScroll: handleBodyScroll,
    }),
    [
      disclaimerHTML,
      disclaimerAcceptButtonRef,
      onAcceptDisclaimer,
      chatWidthBreakpoint,
      hasReadDisclaimer,
      languagePack,
      handleBodyScroll,
    ]
  );
};

export default DisclaimerPanel;

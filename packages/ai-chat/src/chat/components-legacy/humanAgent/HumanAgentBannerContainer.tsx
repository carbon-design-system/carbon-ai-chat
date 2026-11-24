/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';

import { humanAgentDisplayStateOf } from '../../../shared/store/selectors';
import { usePublicChatState } from '../../hooks/usePublicChatState';
import { HasRequestFocus } from '../../../types/utilities/HasRequestFocus';
import { HumanAgentBanner } from './HumanAgentBanner';

interface HumanAgentBannerContainerProps {
  /**
   * A ref to the banner.
   */
  bannerRef: React.RefObject<HasRequestFocus | null>;

  /**
   * The callback that is called when the user clicks the "end chat" or "cancel" button.
   */
  onButtonClick: () => void;
}

/**
 * A simple container for the agent banner that avoids rendering it if it is hidden.
 */
function HumanAgentBannerContainer({
  onButtonClick,
  bannerRef,
}: HumanAgentBannerContainerProps) {
  const humanAgent = usePublicChatState((state) => state.humanAgent);
  const displayState = humanAgentDisplayStateOf(humanAgent);
  if (displayState.isConnectingOrConnected || humanAgent.isScreenSharing) {
    return <HumanAgentBanner ref={bannerRef} onButtonClick={onButtonClick} />;
  }
  return null;
}

export { HumanAgentBannerContainer };

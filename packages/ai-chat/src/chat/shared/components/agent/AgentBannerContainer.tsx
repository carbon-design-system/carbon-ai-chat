/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { shallowEqual, useSelector } from "react-redux";

import { selectAgentDisplayState } from "../../store/selectors";
import { AppState } from "../../../../types/state/AppState";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { AgentBanner } from "./AgentBanner";

interface AgentBannerContainerProps {
  /**
   * A ref to the banner.
   */
  bannerRef: React.RefObject<HasRequestFocus>;

  /**
   * The callback that is called when the user clicks the "end chat" or "cancel" button.
   */
  onButtonClick: () => void;
}

/**
 * A simple container for the agent banner that avoids rendering it if it is hidden.
 */
function AgentBannerContainer({
  onButtonClick,
  bannerRef,
}: AgentBannerContainerProps) {
  const agentState = useSelector((state: AppState) => state.agentState);
  const displayState = useSelector(selectAgentDisplayState, shallowEqual);
  if (displayState.isConnectingOrConnected || agentState.isScreenSharing) {
    return <AgentBanner ref={bannerRef} onButtonClick={onButtonClick} />;
  }
  return null;
}

export { AgentBannerContainer };

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

import { selectHumanAgentDisplayState } from "../../../store/selectors";
import { AppState } from "../../../../types/state/AppState";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { HumanAgentBanner } from "./HumanAgentBanner";

interface HumanAgentBannerContainerProps {
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
function HumanAgentBannerContainer({
  onButtonClick,
  bannerRef,
}: HumanAgentBannerContainerProps) {
  const humanAgentState = useSelector(
    (state: AppState) => state.humanAgentState,
  );
  const displayState = useSelector(selectHumanAgentDisplayState, shallowEqual);
  if (displayState.isConnectingOrConnected || humanAgentState.isScreenSharing) {
    return <HumanAgentBanner ref={bannerRef} onButtonClick={onButtonClick} />;
  }
  return null;
}

export { HumanAgentBannerContainer };

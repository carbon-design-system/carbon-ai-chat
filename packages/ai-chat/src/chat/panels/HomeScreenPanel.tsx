/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import HomeScreenContainer from "../components-legacy/homeScreen/HomeScreenContainer";
import type { SingleOption } from "../../types/messaging/Messages";
import type { InputFunctions } from "../components-legacy/input/Input";

interface HomeScreenPanelProps {
  onPanelOpenStart: () => void;
  onPanelOpenEnd: () => void;
  onPanelCloseStart: () => void;
  onPanelCloseEnd: () => void;
  onClose: () => void;
  onSendBotInput: (text: string) => void;
  onSendButtonInput: (input: SingleOption) => void;
  onRestart: () => void;
  showHomeScreen: boolean;
  isHydrationAnimationComplete: boolean;
  homeScreenInputRef: React.RefObject<InputFunctions | null>;
  onToggleHomeScreen: () => void;
  requestFocus: () => void;
}

const HomeScreenPanel: React.FC<HomeScreenPanelProps> = ({
  onPanelOpenStart,
  onPanelOpenEnd,
  onPanelCloseStart,
  onPanelCloseEnd,
  onClose,
  onSendBotInput,
  onSendButtonInput,
  onRestart,
  showHomeScreen,
  isHydrationAnimationComplete,
  homeScreenInputRef,
  onToggleHomeScreen,
  requestFocus,
}) => (
  <HomeScreenContainer
    onPanelOpenStart={onPanelOpenStart}
    onPanelOpenEnd={onPanelOpenEnd}
    onPanelCloseStart={onPanelCloseStart}
    onPanelCloseEnd={onPanelCloseEnd}
    onClose={onClose}
    onSendBotInput={onSendBotInput}
    onSendButtonInput={onSendButtonInput}
    onRestart={onRestart}
    showHomeScreen={showHomeScreen}
    isHydrationAnimationComplete={isHydrationAnimationComplete}
    homeScreenInputRef={homeScreenInputRef}
    onToggleHomeScreen={onToggleHomeScreen}
    requestFocus={requestFocus}
  />
);

export default HomeScreenPanel;

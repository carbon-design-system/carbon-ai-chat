/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { RefObject, useCallback } from "react";
import { useSelector } from "react-redux";

import { usePrevious } from "../../hooks/usePrevious";
import { useServiceManager } from "../../hooks/useServiceManager";
import {
  AnimationInType,
  AnimationOutType,
} from "../../../../types/utilities/Animation";
import { AppState } from "../../../../types/state/AppState";
import { InputFunctions } from "../input/Input";
import { OverlayPanel, OverlayPanelName } from "../OverlayPanel";
import { HomeScreen } from "./HomeScreen";
import { HomeScreenStarterButton } from "../../../../types/config/HomeScreenConfig";
import { SingleOption } from "../../../../types/messaging/Messages";
import { SendOptions } from "../../../../types/instance/ChatInstance";
import { THREAD_ID_MAIN } from "../../utils/messageUtils";

interface HomeScreenContainerProps {
  onClose: () => void;

  /**
   * This callback is called when the user clicks the close-and-restart button and confirms the action.
   */
  onCloseAndRestart?: () => void;

  /**
   * Update the panel counter to show a panel has opened, and add any proper focus.
   */
  onPanelOpenStart: () => void;

  /**
   * Called when the panel his finished opening.
   */
  onPanelOpenEnd: () => void;

  /**
   * Update the panel counter to show a panel has started to close.
   */
  onPanelCloseStart: () => void;

  /**
   * Called when the panel has finished closing.
   */
  onPanelCloseEnd: () => void;

  /**
   * Handling sending information from the text input.
   */
  onSendBotInput: (text: string, options?: SendOptions) => void;

  /**
   * Handling sending information from the home screen conversation starter buttons.
   */
  onSendButtonInput: (input: SingleOption, threadID: string) => void;

  /**
   * Method to call when restart button is pressed.
   */
  onRestart: () => void;

  /**
   * The callback that can be called to toggle between the home screen and the bot view.
   */
  onToggleHomeScreen: () => void;

  /**
   * Indicates if the home screen panel should be open.
   */
  showHomeScreen: boolean;

  /**
   * Determines if the hydration panel has closed.
   */
  isHydrationAnimationComplete: boolean;

  /**
   * A React ref to the bot {@link Disclaimer} component.
   */
  homeScreenInputRef: RefObject<InputFunctions>;

  /**
   * The callback that can be called when this component wants the Carbon AI chat to regain focus after a homescreen overflow
   * menu item is clicked.
   */
  requestFocus?: () => void;
}

/**
 * This home screen container is for experimental purposes that renders a home screen variation provided by launch
 * darkly.
 */
function HomeScreenContainer({
  onClose,
  onCloseAndRestart,
  onPanelCloseStart,
  onPanelOpenStart,
  onPanelCloseEnd,
  onPanelOpenEnd,
  onSendBotInput,
  onSendButtonInput,
  onRestart,
  showHomeScreen,
  isHydrationAnimationComplete,
  homeScreenInputRef,
  onToggleHomeScreen,
}: HomeScreenContainerProps) {
  const serviceManager = useServiceManager();
  const homeScreenConfig = useSelector(
    (state: AppState) => state.homeScreenConfig
  );
  const botAvatarURL = useSelector((state: AppState) => state.botAvatarURL);
  const botName = useSelector((state: AppState) => state.botName);

  const isCustomPanelOpen = useSelector(
    (state: AppState) => state.customPanelState.isOpen
  );
  const prevIsHydrationAnimationComplete = usePrevious(
    isHydrationAnimationComplete
  );
  const shouldHide = isCustomPanelOpen;

  // If we're showing the home screen, hydration has completed, and hydration was complete on the previous render, then
  // this is a subsequent render.
  const subsequentRender =
    showHomeScreen &&
    isHydrationAnimationComplete &&
    prevIsHydrationAnimationComplete;

  const handleSendInput = useCallback(
    (text: string) => {
      onSendBotInput(text);
    },
    [onSendBotInput]
  );

  const handlerStarterClick = useCallback(
    (starter: HomeScreenStarterButton) => {
      onSendButtonInput(
        {
          label: starter.label,
          value: {
            input: {
              text: starter.label,
            },
          },
        },
        THREAD_ID_MAIN
      );
    },
    [onSendButtonInput]
  );

  return (
    <OverlayPanel
      onOpenStart={onPanelOpenStart}
      onOpenEnd={onPanelOpenEnd}
      onCloseStart={onPanelCloseStart}
      onCloseEnd={onPanelCloseEnd}
      // If this is a subsequent render lets fade the panel in. On first render don't animate the panel otherwise the
      // message container will be briefly visible.
      animationOnOpen={
        subsequentRender ? AnimationInType.FADE_IN : AnimationInType.NONE
      }
      animationOnClose={AnimationOutType.FADE_OUT}
      shouldOpen={showHomeScreen}
      shouldHide={shouldHide}
      serviceManager={serviceManager}
      overlayPanelName={OverlayPanelName.HOME_SCREEN}
    >
      <HomeScreen
        botName={botName}
        botAvatarURL={botAvatarURL}
        isHydrated={isHydrationAnimationComplete}
        homeScreenMessageInputRef={homeScreenInputRef}
        homeScreenConfig={homeScreenConfig}
        onSendInput={handleSendInput}
        onStarterClick={handlerStarterClick}
        onClose={onClose}
        onCloseAndRestart={onCloseAndRestart}
        onRestart={onRestart}
        onToggleHomeScreen={onToggleHomeScreen}
      />
    </OverlayPanel>
  );
}

export { HomeScreenContainer };

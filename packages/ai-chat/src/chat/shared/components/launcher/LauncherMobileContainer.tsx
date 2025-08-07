/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import React, {
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";

import { useOnMount } from "../../hooks/useOnMount";
import { usePrevious } from "../../hooks/usePrevious";
import { useServiceManager } from "../../hooks/useServiceManager";
import actions from "../../store/actions";
import { AppState } from "../../../../types/state/AppState";
import { BOUNCING_ANIMATION_TIMEOUTS } from "../../../../types/config/LauncherConfig";
import { setAnimationTimeouts } from "../../utils/animationUtils";
import {
  LauncherExtended,
  LauncherExtendedFunctions,
} from "./LauncherExtended";
import { LauncherType } from "../../../../types/instance/apiTypes";

interface LauncherMobileContainerProps {
  onToggleOpen: () => void;

  /**
   * Necessary to get access to the ref created within App.tsx.
   */
  launcherRef: RefObject<LauncherExtendedFunctions>;

  /**
   * If the main Carbon AI chat window is open or a tour is visible the launcher should be hidden.
   */
  launcherHidden: boolean;

  /**
   * If there's an active tour a different launcher icon needs to be shown to communicate that clicking on the launcher
   * will open a tour.
   */
  activeTour: boolean;
}

function LauncherMobileContainer(props: LauncherMobileContainerProps) {
  const { launcherRef, onToggleOpen, launcherHidden, activeTour } = props;
  const serviceManager = useServiceManager();
  const { config: launcherConfig } = useSelector(
    (state: AppState) => state.launcher
  );
  const unreadHumanAgentCount = useSelector(
    (state: AppState) => state.humanAgentState.numUnreadMessages
  );
  const {
    mobileLauncherIsExtended: isExtended,
    mobileLauncherWasReduced: wasReduced,
    mobileLauncherDisableBounce: disableBounce,
    bounceTurn,
    showUnreadIndicator,
    viewState,
  } = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.launcherState
  );

  const [isStartingBounceAnimation, setIsStartingBounceAnimation] =
    useState(false);
  const prevIsExtended = usePrevious(isExtended);
  const prevWasReduced = usePrevious(wasReduced);
  // The bounce turn start off on in the recurring animation flow. We only care about the initial value and not its
  // subsequent values as the user goes through the flow. This will allow the user to continue where they left off in
  // the flow.
  const initialBounceTurn = useRef(bounceTurn).current;
  const previouslyPlayedExtendAnimation = useRef(wasReduced).current;
  const extendLauncherTimeoutIDRef = useRef(null);
  const reduceLauncherTimeoutIDRef = useRef(null);
  const endBounceAnimationRef = useRef(null);
  const shouldBounceRef = useRef(
    previouslyPlayedExtendAnimation && !disableBounce
  );

  const { time_to_expand, new_expand_time, time_to_reduce } =
    launcherConfig.mobile;
  const isExpandedLauncherEnabled = launcherConfig.mobile.is_on;

  // If the launcher container mounted with the mobile launcher not in the extended state, and it's previous value is
  // undefined, this means the launcher should be in the extended state playing the extended animation if not in the
  // tooling preview.
  const playExtendAnimation = prevIsExtended === undefined && !isExtended;
  // Indicates if the launcher is playing the "extend" animation.
  const isExtending =
    prevIsExtended !== undefined && !prevIsExtended && isExtended;
  // Indicates if the launcher has completed the "reduce" animation.
  const hasReduced =
    prevWasReduced !== undefined && !prevWasReduced && wasReduced;
  // Prevents the launcher from playing the fade in animation after a rerender.
  const disableIntroAnimation =
    isExtending || hasReduced || isStartingBounceAnimation;

  const setLauncherStateAsReduced = useCallback(() => {
    if (!wasReduced) {
      serviceManager.store.dispatch(
        actions.setLauncherProperty("mobileLauncherWasReduced", true)
      );
    }
  }, [wasReduced, serviceManager]);

  // This function kicks off the process of reducing the extended launcher, such as when the user scrolls the page, by
  // setting mobileLauncherIsExtended in launcher state to false. If the user does scroll the page, it will be tracked.
  const reduceLauncher = useCallback(() => {
    clearTimeouts();

    if (isExtended) {
      document.removeEventListener("scroll", reduceLauncher);

      serviceManager.store.dispatch(
        actions.setLauncherProperty("mobileLauncherIsExtended", false)
      );
    }
  }, [isExtended, serviceManager]);

  const setExpandAnimationTimeout = useCallback(() => {
    // Begin timeout to set launcher in the extended state.
    extendLauncherTimeoutIDRef.current = setTimeout(() => {
      if (!isExtended && !isExtending) {
        // Since the launcher is going to expand, set the reduced flag to false.
        serviceManager.store.dispatch(
          actions.setLauncherProperty("mobileLauncherWasReduced", false)
        );
        serviceManager.store.dispatch(
          actions.setLauncherProperty("mobileLauncherIsExtended", true)
        );
      }
    }, time_to_expand);
  }, [isExtended, isExtending, serviceManager.store, time_to_expand]);

  // Clear the expand and bounce timers and set the launcher state to reduced and bounce disabled. This way if the page
  // is reloaded the launcher will behave as if it has already been opened and won't try and show a greeting.
  const setDefaultLauncherState = useCallback(() => {
    const endBounceAnimation = endBounceAnimationRef.current;
    if (endBounceAnimation) {
      endBounceAnimation();
      endBounceAnimationRef.current = null;
    }

    // Prevent the launcher from bouncing if it was toggled and allowed to play the bounce animation.
    serviceManager.store.dispatch(
      actions.setLauncherProperty("mobileLauncherDisableBounce", true)
    );

    reduceLauncher();

    // The launcher should be set as reduced to prevent it from extending on the next page load.
    setLauncherStateAsReduced();
  }, [reduceLauncher, serviceManager.store, setLauncherStateAsReduced]);

  // When the launcher mounts, we should determine if it should prepare to play the "extend" animation, or kickoff the
  // bounce animation. We should kick off the bounce animation early if we have to so that we can easily determine
  // later on if it should be canceled.
  useOnMount(() => {
    // Determine if the mobile launcher wasn't reduced and can play the "extend" animation.
    if (!wasReduced && playExtendAnimation && isExpandedLauncherEnabled) {
      setExpandAnimationTimeout();
    } else if (shouldBounceRef.current) {
      const launcherContainerElement =
        launcherRef?.current?.launcherContainerElement();

      if (launcherContainerElement) {
        const startRecurringBounceAnimation = () => {
          // This function is added as an event listener to the container, however the function isn't actually run until
          // the event listener is triggered. Because of this it's possible that the state has since changed, and we
          // actually don't want to bounce the launcher after all, so we need to check that we still want to bounce.
          if (shouldBounceRef.current) {
            // Track the bounce turn the user is currently on in the recurring animation flow.
            let turnCounter = initialBounceTurn;

            launcherContainerElement.removeEventListener(
              "animationend",
              startRecurringBounceAnimation
            );
            setIsStartingBounceAnimation(true);

            endBounceAnimationRef.current = setAnimationTimeouts(
              launcherContainerElement,
              "WACLauncher__ButtonContainer--bounceAnimation",
              BOUNCING_ANIMATION_TIMEOUTS,
              {
                startingIndex: initialBounceTurn - 1,
                afterEach: () => {
                  // Increase the turn counter and have Carbon AI chat remember where the user left off in the flow.
                  turnCounter++;
                  serviceManager.store.dispatch(
                    actions.setLauncherProperty("bounceTurn", turnCounter)
                  );
                },
                afterAll: () => {
                  serviceManager.store.dispatch(
                    actions.setLauncherProperty(
                      "mobileLauncherDisableBounce",
                      true
                    )
                  );
                },
              }
            );
          }
        };

        // Once the launcher container has completed fading in, kick off the recurring bounce animation.
        launcherContainerElement.addEventListener(
          "animationend",
          startRecurringBounceAnimation
        );
      }
    }
  });

  // If the main window or tour have been opened then clear all timers and set the launcher state as if it had been
  // clicked open. This is to protect against scenarios where the main window or tour are opened using other methods
  // besides clicking on the launcher.
  useEffect(() => {
    if (viewState.mainWindow || viewState.tour) {
      // Clear timers and update launcher state so that no more greeting messages or bounces occur.
      setDefaultLauncherState();
    }
  }, [viewState, setDefaultLauncherState]);

  // If the launcher time_to_expand changes then we need to clear the existing timers and start new ones with the new time.
  useEffect(() => {
    if (new_expand_time) {
      // If the launcher was supposed to bounce make sure it doesn't.
      if (shouldBounceRef.current) {
        shouldBounceRef.current = false;
      }
      // If there was an existing bounce timer going then clear the timeout so the bounce animation doesn't show.
      const endBounceAnimation = endBounceAnimationRef.current;
      if (endBounceAnimation) {
        endBounceAnimation();
        endBounceAnimationRef.current = null;
      }
      // If there was an existing "extend" timer going then clear the timeout so the original extend doesn't occur.
      if (extendLauncherTimeoutIDRef.current) {
        clearTimeout(extendLauncherTimeoutIDRef.current);
      }
      // Set the "expand" timers again with the new timeout that's been provided.
      setExpandAnimationTimeout();
      serviceManager.store.dispatch(
        actions.setLauncherConfigProperty(
          "new_expand_time",
          false,
          LauncherType.MOBILE
        )
      );
    }
  }, [
    setExpandAnimationTimeout,
    new_expand_time,
    serviceManager.store,
    shouldBounceRef,
  ]);

  function clearTimeouts() {
    const extendLauncherTimeoutID = extendLauncherTimeoutIDRef.current;
    const reduceLauncherTimeoutID = reduceLauncherTimeoutIDRef.current;

    // Clears all the existing timeouts that were set.
    if (reduceLauncherTimeoutID) {
      clearTimeout(reduceLauncherTimeoutID);
      reduceLauncherTimeoutIDRef.current = null;
    }
    if (extendLauncherTimeoutID) {
      clearTimeout(extendLauncherTimeoutID);
      extendLauncherTimeoutIDRef.current = null;
    }
  }

  // When the launcher is toggled, reduce the launcher if it's extended and open the widget.
  const handleToggleOpen = useCallback(() => {
    setDefaultLauncherState();
    onToggleOpen();
  }, [onToggleOpen, setDefaultLauncherState]);

  // Track the user swiping to the right over the launcher and reduce the launcher.
  const handleSwipeRight = useCallback(() => {
    reduceLauncher();
  }, [reduceLauncher]);

  // When the launcher extends and a proper reduce timeout is set, we should kick off the timeout that will reduce the
  // launcher.
  useEffect(() => {
    if (isExtended) {
      // Begin timeout to reduce extended launcher.
      reduceLauncherTimeoutIDRef.current = setTimeout(() => {
        reduceLauncher();
      }, time_to_reduce);

      // Detect the user scrolling the page to begin reducing the launcher.
      document.addEventListener("scroll", reduceLauncher);
    }
  }, [isExtended, reduceLauncher, time_to_reduce, serviceManager]);

  return (
    <LauncherExtended
      className={cx({
        "WACLauncher__ButtonContainer--noAnimation": disableIntroAnimation,
      })}
      ref={launcherRef}
      launcherConfig={launcherConfig}
      showUnreadIndicator={showUnreadIndicator}
      unreadHumanAgentCount={unreadHumanAgentCount}
      isExtended={isExtended}
      playExtendAnimation={playExtendAnimation}
      onToggleOpen={handleToggleOpen}
      onSwipeRight={handleSwipeRight}
      onReduceEnd={setLauncherStateAsReduced}
      launcherHidden={launcherHidden}
      activeTour={activeTour}
    />
  );
}

export { LauncherMobileContainer };

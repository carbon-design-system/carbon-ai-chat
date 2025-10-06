/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import CDSButton from "@carbon/web-components/es/components/button/button.js";
import ChatLaunch24 from "@carbon/icons/es/chat--launch/24.js";
import { carbonIconToReact } from "../../utils/carbonIcon";
import cx from "classnames";
import React, {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useIntl } from "react-intl";
import { useSelector } from "../../hooks/useSelector";

import { useAriaAnnouncer } from "../../hooks/useAriaAnnouncer";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useOnMount } from "../../hooks/useOnMount";
import { usePrevious } from "../../hooks/usePrevious";
import { useServiceManager } from "../../hooks/useServiceManager";
import actions from "../../store/actions";
import { AppState } from "../../../types/state/AppState";
import { BOUNCING_ANIMATION_TIMEOUTS } from "../../../types/config/LauncherConfig";
import { setAnimationTimeouts } from "../../utils/animationUtils";
import { LauncherButton, LauncherHandle } from "./LauncherButton";
import {
  calculateAndSetMaxExtendedLauncherWidth,
  checkIfUserSwipedRight,
  doFadeAnimationForElements,
} from "./launcherUtils";
import type { LauncherTouchStartCoordinates } from "./launcherUtils";

interface LauncherMobileContainerProps {
  onToggleOpen: () => void;

  /**
   * Necessary to get access to the ref created within App.tsx.
   */
  launcherRef: MutableRefObject<LauncherHandle | null>;

  /**
   * If the main Carbon AI Chat window is open the launcher should be hidden.
   */
  launcherHidden: boolean;
}

function LauncherMobileContainer(props: LauncherMobileContainerProps) {
  const { launcherRef, onToggleOpen, launcherHidden } = props;
  const serviceManager = useServiceManager();
  const languagePack = useLanguagePack();
  const intl = useIntl();
  const ariaAnnouncer = useAriaAnnouncer();
  const { launcher } = useSelector((state: AppState) => state.config.derived);
  const launcherAvatarURL = useSelector((state: AppState) =>
    state.config.derived.themeWithDefaults.aiEnabled
      ? undefined
      : state.config.derived.launcher.mobile.avatarUrlOverride,
  );
  const unreadHumanAgentCount = useSelector(
    (state: AppState) => state.humanAgentState.numUnreadMessages,
  );
  const {
    mobileLauncherIsExtended: isExtended,
    mobileLauncherWasReduced: wasReduced,
    mobileLauncherDisableBounce: disableBounce,
    bounceTurn,
    showUnreadIndicator,
    viewState,
  } = useSelector((state: AppState) => state.persistedToBrowserStorage);

  const [isStartingBounceAnimation, setIsStartingBounceAnimation] =
    useState(false);
  const [animateExtendedState, setAnimateExtendedState] = useState(false);
  const [showGreetingMessage, setShowGreetingMessage] = useState(false);
  const prevIsExtended = usePrevious(isExtended);
  const prevWasReduced = usePrevious(wasReduced);
  // The bounce turn start off on in the recurring animation flow. We only care about the initial value and not its
  // subsequent values as the user goes through the flow. This will allow the user to continue where they left off in
  // the flow.
  const initialBounceTurn = useRef(bounceTurn).current;
  const previouslyPlayedExtendAnimation = useRef(wasReduced).current;
  const extendLauncherTimeoutIDRef = useRef<NodeJS.Timeout>();
  const endBounceAnimationRef = useRef<() => void>();
  const shouldBounceRef = useRef(
    previouslyPlayedExtendAnimation && !disableBounce,
  );

  const textHolderRef = useRef<HTMLDivElement>();
  const greetingMessageRef = useRef<HTMLDivElement>();
  const extendedContainerRef = useRef<HTMLDivElement>();
  const buttonRef = useRef<CDSButton>();
  const touchStartRef = useRef<LauncherTouchStartCoordinates>({
    touchStartX: null,
    touchStartY: null,
  });

  const { timeToExpand } = launcher.mobile;
  const isExpandedLauncherEnabled = launcher.mobile.isOn;

  // If the launcher container mounted with the mobile launcher not in the extended state, and its previous value is
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

  const shouldReduceExtendedLauncher = !isExtended && prevIsExtended;
  const extendWithAnimation = isExtended && animateExtendedState;
  const extendWithoutAnimation = isExtended && !animateExtendedState;
  const launcherGreetingMessage =
    launcher.mobile.title || languagePack.launcher_mobileGreeting;

  const ChatLaunch = carbonIconToReact(ChatLaunch24);
  const launcherAvatar = launcherAvatarURL ? (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      className="cds-aichat--launcher__avatar"
      src={launcherAvatarURL}
      aria-hidden
      alt=""
    />
  ) : (
    <ChatLaunch className="cds-aichat--launcher__svg" />
  );

  useEffect(() => {
    setAnimateExtendedState(playExtendAnimation);
  }, [playExtendAnimation]);

  const setLauncherStateAsReduced = useCallback(() => {
    if (!wasReduced) {
      serviceManager.store.dispatch(
        actions.setLauncherProperty("mobileLauncherWasReduced", true),
      );
    }
  }, [serviceManager.store, wasReduced]);

  // This function kicks off the process of reducing the extended launcher, such as when the user scrolls the page, by
  // setting mobileLauncherIsExtended in launcher state to false. If the user does scroll the page, it will be tracked.
  const reduceLauncher = useCallback(() => {
    clearTimeouts();

    if (isExtended) {
      document.removeEventListener("scroll", reduceLauncher);

      serviceManager.store.dispatch(
        actions.setLauncherProperty("mobileLauncherIsExtended", false),
      );
    }
  }, [isExtended, serviceManager.store]);

  const setExpandAnimationTimeout = useCallback(() => {
    // Begin timeout to set launcher in the extended state.
    extendLauncherTimeoutIDRef.current = setTimeout(() => {
      if (!isExtended && !isExtending) {
        // Since the launcher is going to expand, set the reduced flag to false.
        serviceManager.store.dispatch(
          actions.setLauncherProperty("mobileLauncherWasReduced", false),
        );
        serviceManager.store.dispatch(
          actions.setLauncherProperty("mobileLauncherIsExtended", true),
        );
      }
    }, timeToExpand);
  }, [isExtended, isExtending, serviceManager.store, timeToExpand]);

  // Clear the expand and bounce timers and set the launcher state to reduced and bounce disabled. This way if the page
  // is reloaded the launcher will behave as if it has already been opened and won't try and show a greeting.
  const setDefaultLauncherState = useCallback(() => {
    const endBounceAnimation = endBounceAnimationRef.current;
    if (endBounceAnimation) {
      endBounceAnimation();
      endBounceAnimationRef.current = undefined;
    }

    // Prevent the launcher from bouncing if it was toggled and allowed to play the bounce animation.
    serviceManager.store.dispatch(
      actions.setLauncherProperty("mobileLauncherDisableBounce", true),
    );

    reduceLauncher();

    // The launcher should be set as reduced to prevent it from extending on the next page load.
    setLauncherStateAsReduced();
  }, [reduceLauncher, serviceManager.store, setLauncherStateAsReduced]);

  // When the launcher mounts, we should determine if it should prepare to play the "extend" animation, or kick off the
  // bounce animation. We should kick off the bounce animation early if we have to so that we can easily determine later
  // on if it should be canceled.
  useOnMount(() => {
    // Determine if the mobile launcher wasn't reduced and can play the "extend" animation.
    if (!wasReduced && playExtendAnimation && isExpandedLauncherEnabled) {
      setExpandAnimationTimeout();
    } else if (shouldBounceRef.current) {
      const launcherContainerElement =
        launcherRef.current?.launcherContainerElement?.() ??
        extendedContainerRef.current;

      if (launcherContainerElement) {
        const startRecurringBounceAnimation = () => {
          // This function is added as an event listener to the container; however, the function isn't actually run until
          // the event listener is triggered. Because of this it's possible that the state has since changed, and we
          // actually don't want to bounce the launcher after all, so we need to check that we still want to bounce.
          if (shouldBounceRef.current) {
            // Track the bounce turn the user is currently on in the recurring animation flow.
            let turnCounter = initialBounceTurn;

            launcherContainerElement.removeEventListener(
              "animationend",
              startRecurringBounceAnimation,
            );
            setIsStartingBounceAnimation(true);

            endBounceAnimationRef.current = setAnimationTimeouts(
              launcherContainerElement,
              "cds-aichat--launcher__button-container--bounce-animation",
              BOUNCING_ANIMATION_TIMEOUTS,
              {
                startingIndex: initialBounceTurn - 1,
                afterEach: () => {
                  // Increase the turn counter and have Carbon AI Chat remember where the user left off in the flow.
                  turnCounter++;
                  serviceManager.store.dispatch(
                    actions.setLauncherProperty("bounceTurn", turnCounter),
                  );
                },
                afterAll: () => {
                  serviceManager.store.dispatch(
                    actions.setLauncherProperty(
                      "mobileLauncherDisableBounce",
                      true,
                    ),
                  );
                },
              },
            );
          }
        };

        // Once the launcher container has completed fading in, kick off the recurring bounce animation.
        launcherContainerElement.addEventListener(
          "animationend",
          startRecurringBounceAnimation,
        );
      }
    }
  });

  // If the main window has been opened then clear all timers and set the launcher state as if it had been
  // clicked open. This is to protect against scenarios where the main window is opened using other methods besides
  // clicking on the launcher.
  useEffect(() => {
    if (viewState.mainWindow) {
      // Clear timers and update launcher state so that no more greeting messages or bounces occur.
      setDefaultLauncherState();
    }
  }, [setDefaultLauncherState, viewState]);

  function clearTimeouts() {
    const extendLauncherTimeoutID = extendLauncherTimeoutIDRef.current;

    if (extendLauncherTimeoutID) {
      clearTimeout(extendLauncherTimeoutID);
      extendLauncherTimeoutIDRef.current = undefined;
    }
  }

  const handleToggleOpen = useCallback(() => {
    setDefaultLauncherState();
    onToggleOpen();
  }, [onToggleOpen, setDefaultLauncherState]);

  const containerClassName = cx("cds-aichat--launcher-extended__container", {
    "cds-aichat--launcher__button-container--mobile": true,
    "cds-aichat--launcher-extended__button--extended": extendWithoutAnimation,
    "cds-aichat--launcher-extended__button--extended-animation":
      extendWithAnimation,
    "cds-aichat--launcher-extended__button--reduced-animation":
      shouldReduceExtendedLauncher,
    "cds-aichat--launcher__button-container--no-animation":
      disableIntroAnimation,
  });

  useEffect(() => {
    const textHolderElement = textHolderRef.current;
    const greetingMessageElement = greetingMessageRef.current;
    const extendedContainerElement = extendedContainerRef.current;

    if (
      !textHolderElement ||
      !greetingMessageElement ||
      !extendedContainerElement
    ) {
      return;
    }

    calculateAndSetMaxExtendedLauncherWidth(
      textHolderElement,
      greetingMessageElement,
      extendedContainerElement,
    );
  }, [ariaAnnouncer, extendWithoutAnimation, launcherGreetingMessage]);

  useEffect(() => {
    const buttonElement = buttonRef.current;
    const containerElement = extendedContainerRef.current;

    if (isExtended && buttonElement) {
      if (animateExtendedState) {
        doFadeAnimationForElements(
          { fadeInElement: greetingMessageRef.current, fadeInTime: 300 },
          () => {
            setAnimateExtendedState(false);
          },
        );
      } else {
        setShowGreetingMessage(true);
      }

      document.addEventListener("scroll", reduceLauncher);

      const handleTouchMove = (event: TouchEvent) => {
        checkIfUserSwipedRight(
          event.touches[0],
          touchStartRef.current,
          reduceLauncher,
        );
      };

      const handleTouchStart = (event: TouchEvent) => {
        const { clientX, clientY } = event.touches[0];
        const touchStart = touchStartRef.current;

        touchStart.touchStartX = clientX;
        touchStart.touchStartY = clientY;

        buttonRef.current?.addEventListener("touchmove", handleTouchMove);
      };

      buttonElement.addEventListener("touchstart", handleTouchStart);

      return () => {
        buttonElement.removeEventListener("touchmove", handleTouchMove);
        buttonElement.removeEventListener("touchstart", handleTouchStart);
        document.removeEventListener("scroll", reduceLauncher);
      };
    }

    if (shouldReduceExtendedLauncher && containerElement) {
      const reduceAnimationEndListener = () => {
        setLauncherStateAsReduced();
        setAnimateExtendedState(true);
        containerElement.removeEventListener(
          "animationend",
          reduceAnimationEndListener,
        );
      };

      containerElement.addEventListener(
        "animationend",
        reduceAnimationEndListener,
      );

      doFadeAnimationForElements({
        fadeOutElement: greetingMessageRef.current,
      });

      return () => {
        containerElement.removeEventListener(
          "animationend",
          reduceAnimationEndListener,
        );
      };
    }

    return undefined;
  }, [
    animateExtendedState,
    isExtended,
    reduceLauncher,
    setLauncherStateAsReduced,
    shouldReduceExtendedLauncher,
  ]);

  if (launcherRef.current) {
    launcherRef.current.launcherContainerElement = () =>
      extendedContainerRef.current ?? undefined;
  }

  return (
    <LauncherButton
      className="cds-aichat--launcher-extended__button"
      buttonRef={buttonRef}
      containerClassName={containerClassName}
      containerRef={extendedContainerRef}
      closedLabel={languagePack.launcher_isClosed}
      intl={intl}
      openLabel={languagePack.launcher_isOpen}
      launcherHidden={launcherHidden}
      onToggleOpen={handleToggleOpen}
      ref={launcherRef}
      showUnreadIndicator={showUnreadIndicator}
      unreadHumanAgentCount={unreadHumanAgentCount}
    >
      <div className="cds-aichat--launcher-extended__wrapper-container">
        <div className="cds-aichat--launcher-extended__wrapper">
          <div
            className="cds-aichat--launcher-extended__text-holder"
            ref={textHolderRef}
          >
            <div
              className={cx("cds-aichat--launcher-extended__greeting", {
                "cds-aichat--launcher-extended__element--hidden":
                  !showGreetingMessage,
              })}
              ref={greetingMessageRef}
            >
              <div
                className="cds-aichat--launcher-extended__greeting-text"
                aria-hidden={!isExtended}
              >
                {launcherGreetingMessage}
              </div>
            </div>
          </div>
          <div className="cds-aichat--launcher__icon-holder">
            {launcherAvatar}
          </div>
        </div>
      </div>
    </LauncherButton>
  );
}

export { LauncherMobileContainer };

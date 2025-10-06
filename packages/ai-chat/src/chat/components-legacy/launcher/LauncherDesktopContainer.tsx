/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Close16 from "@carbon/icons/es/close/16.js";
import AiLaunch24 from "@carbon/icons/es/ai-launch/24.js";
import ChatLaunch24 from "@carbon/icons/es/chat--launch/24.js";
import Tag from "../../components/carbon/Tag";
import cx from "classnames";
import React, {
  MutableRefObject,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useIntl } from "react-intl";
import { useSelector } from "../../hooks/useSelector";

import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useOnMount } from "../../hooks/useOnMount";
import { usePrevious } from "../../hooks/usePrevious";
import { useServiceManager } from "../../hooks/useServiceManager";
import actions from "../../store/actions";
import { AppState } from "../../../types/state/AppState";
import { BOUNCING_ANIMATION_TIMEOUTS } from "../../../types/config/LauncherConfig";
import { LauncherButton, LauncherHandle } from "./LauncherButton";
import { getLauncherContent } from "./launcherUtils";
import { PageObjectId } from "../../utils/PageObjectId";
import { carbonIconToReact } from "../../utils/carbonIcon";

// The amount of time it takes the desktop launcher to minimize.
const TIME_FOR_MINIMIZE_ANIMATION = 400;

// The amount of time it takes the launcher to bounce.
const TIME_FOR_BOUNCE_ANIMATION = 500;

const CloseIcon = carbonIconToReact(Close16);
const AiLaunch = carbonIconToReact(AiLaunch24);
const ChatLaunch = carbonIconToReact(ChatLaunch24);

function renderDesktopLauncherAvatar(
  useAITheme: boolean,
  avatarUrlOverride?: string,
): ReactNode {
  if (avatarUrlOverride) {
    return (
      <img
        className="cds-aichat--launcher__avatar"
        src={avatarUrlOverride}
        alt=""
        aria-hidden
      />
    );
  }

  if (useAITheme) {
    return <AiLaunch className="cds-aichat--launcher-svg" />;
  }

  return <ChatLaunch className="cds-aichat--launcher__svg" />;
}

interface LauncherDesktopContainerProps {
  onDoToggle: () => void;

  /**
   * Necessary to get access to the ref created within App.tsx.
   */
  launcherRef: MutableRefObject<LauncherHandle | null>;

  /**
   * If the main Carbon AI Chat window is open the launcher should be hidden.
   */
  launcherHidden: boolean;
  /**
   * Request focus back on the launcher after animation completes.
   */
  requestFocus: () => void;
}

const LauncherDesktopContainer = (props: LauncherDesktopContainerProps) => {
  const { launcherRef, onDoToggle, requestFocus, launcherHidden } = props;
  const serviceManager = useServiceManager();
  const languagePack = useLanguagePack();
  const intl = useIntl();

  const {
    desktopLauncherWasMinimized,
    desktopLauncherIsExpanded,
    bounceTurn,
    showUnreadIndicator,
    viewState,
  } = useSelector((state: AppState) => state.persistedToBrowserStorage);

  const launcherConfig = useSelector(
    (state: AppState) => state.config.derived.launcher,
  );
  const useAITheme = useSelector(
    (state: AppState) => state.config.derived.themeWithDefaults.aiEnabled,
  );
  const { timeToExpand } = launcherConfig.desktop;
  const isExpandedLauncherEnabled = launcherConfig.desktop.isOn;
  const unreadHumanAgentCount = useSelector(
    (state: AppState) => state.humanAgentState.numUnreadMessages,
  );
  const launcherAvatar = renderDesktopLauncherAvatar(
    useAITheme,
    launcherConfig.desktop.avatarUrlOverride,
  );
  const {
    launcher_desktopGreeting,
    launcher_closeButton,
    launcher_ariaIsExpanded,
    launcher_isClosed,
    launcher_isOpen,
  } = languagePack;
  const launcherContent = getLauncherContent(
    launcherConfig,
    launcher_desktopGreeting,
  );

  const [smallLauncherClassName, setSmallLauncherClassName] = useState("");
  const [complexLauncherClassName, setComplexLauncherClassName] = useState("");

  const launcherComplexRef = useRef<HTMLDivElement>();

  const launcherHiddenRef = useRef<boolean>();
  launcherHiddenRef.current = launcherHidden;

  const animateOnceVisible = useRef<boolean>(false);

  const bounceTurnRef = useRef<number>();
  bounceTurnRef.current = bounceTurn;

  const animationStartTimerRef = useRef<NodeJS.Timeout>();
  const animationFinishedTimerRef = useRef<NodeJS.Timeout>();

  const firstBounceAnimationStartTimerRef = useRef<NodeJS.Timeout>();
  const firstBounceAnimationFinishedTimerRef = useRef<NodeJS.Timeout>();
  const secondBounceAnimationStartTimerRef = useRef<NodeJS.Timeout>();
  const secondBounceAnimationFinishedTimerRef = useRef<NodeJS.Timeout>();

  /**
   * Measure the height of the complex launcher and set it as a css variable so that the expand animation can move the
   * greeting message the right distance.
   */
  const determineLauncherHeight = useCallback(() => {
    // In order to move the small launcher up a dynamic distance depending on the amount of content in the launcher we
    // need to measure the height of the launcher and use that as a variable within the launcher expanding animation.
    const expandedLauncherHeight = `${launcherComplexRef.current?.offsetHeight}px`;
    if (launcherComplexRef.current?.style?.setProperty) {
      launcherComplexRef.current.style.setProperty(
        "--cds-aichat-launcher-desktop-expanded-height",
        expandedLauncherHeight,
      );
    }
  }, []);

  /**
   * If the launcher isn't open then expand the launcher.
   */
  const startExpandLauncher = useCallback(() => {
    // Because these timeouts for the expand animation are triggered within useOnMount the value for launcherHidden will
    // be the same as its initial value when this component mounted and this useOnMount function was created. In order
    // to check against the up-to-date value we need to keep a ref up to date that stores the new value. This works
    // because the pointer to the ref existed when the useOnMount function was created, then the value of the
    // ref.current has been updated on each render to match the current value. If we tried to use an object to keep
    // track of the current value instead of a ref then a new object with a different pointer would be created each
    // render, and this useOnMount function would only be aware of the object that existed on the first render.

    // We are no longer checking if the launcher has been minimized here since our instance methods are supposed to
    // allow the user to pop up a new greeting message even if one has already been minimized.
    if (!launcherHiddenRef.current) {
      serviceManager.store.dispatch(
        actions.setLauncherProperty("desktopLauncherIsExpanded", true),
      );
      // Determine the height of the complex launcher.
      determineLauncherHeight();
      // Add the className for the intro animation.
      setComplexLauncherClassName(
        "cds-aichat--launcher-complex__container--intro-animation",
      );
    }
  }, [determineLauncherHeight, serviceManager.store]);

  /**
   * Set two timers, one to begin to expand animation on the launcher, the other to fire an event when the expand
   * animation finishes.
   */
  const setExpandAnimationTimers = useCallback(() => {
    // Timer to switch to launcherComplex which will trigger an expand animation and allow focus on the content button and
    // close button.
    animationStartTimerRef.current = setTimeout(() => {
      startExpandLauncher();
    }, timeToExpand);
  }, [timeToExpand, startExpandLauncher]);

  /**
   * Clear the existing expand animation timers.
   */
  const clearExpandAnimationTimers = useCallback(() => {
    clearTimeout(animationStartTimerRef.current);
    clearTimeout(animationFinishedTimerRef.current);
  }, []);

  /**
   * If the launcher isn't open then bounce the launcher.
   */
  const startBounceAnimation = useCallback(() => {
    if (!launcherHiddenRef.current) {
      // Add the bounce animation class to the launcher.
      setSmallLauncherClassName(
        "cds-aichat--launcher__button-container--bounce-animation",
      );
    }
  }, []);

  /**
   * Once the launcher has finished bouncing send an event and increment the bounce turn so the user doesn't see that
   * same bounce again on the next page change or reload.
   */
  const finishBounceAnimation = useCallback(() => {
    if (!launcherHiddenRef.current) {
      // Change the launcher animation class from bounce to noAnimation.
      setSmallLauncherClassName(
        "cds-aichat--launcher__button-container--no-animation",
      );
      // Increment the bounce turn counter, so we know where to pick up from if the page is reloaded/changed.
      bounceTurnRef.current++;
      serviceManager.store.dispatch(
        actions.setLauncherProperty("bounceTurn", bounceTurnRef.current),
      );
    }
  }, [serviceManager.store]);

  /**
   * Start the timers to show the bounce animation on the launcher and to send a track event when the animation
   * finishes. If the user hasn't seen any bounce animations yet then 4 timers are started, one set is responsible for a
   * bounce at 15s, the next set will be responsible for a bounce 60s later. If the user has already seen the bounce at
   * 15s, and this is the next page load, then timers are only needed for a bounce animation 60s from now.
   */
  const setBounceAnimationTimers = useCallback(() => {
    if (bounceTurnRef.current === 1) {
      // If there have not been any bounce animations yet then set a timer for 15s from now for the first bounce.
      firstBounceAnimationStartTimerRef.current = setTimeout(() => {
        startBounceAnimation();
      }, BOUNCING_ANIMATION_TIMEOUTS[0]);

      // After the first bounce is done remove the animation className and send a tracking event.
      firstBounceAnimationFinishedTimerRef.current = setTimeout(() => {
        finishBounceAnimation();
      }, BOUNCING_ANIMATION_TIMEOUTS[0] + TIME_FOR_BOUNCE_ANIMATION);

      // Set another timer for 60s after the first bounce has completed to show a second bounce.
      secondBounceAnimationStartTimerRef.current = setTimeout(() => {
        startBounceAnimation();
      }, BOUNCING_ANIMATION_TIMEOUTS[0] + BOUNCING_ANIMATION_TIMEOUTS[1]);

      // After the second bounce is done remove the animation className and send a tracking event.
      secondBounceAnimationFinishedTimerRef.current = setTimeout(
        () => {
          finishBounceAnimation();
        },
        BOUNCING_ANIMATION_TIMEOUTS[0] +
          BOUNCING_ANIMATION_TIMEOUTS[1] +
          TIME_FOR_BOUNCE_ANIMATION,
      );
    } else if (bounceTurnRef.current === 2) {
      // If there has already been a bounce animation then set a timer for 60s from now for the second bounce.
      secondBounceAnimationStartTimerRef.current = setTimeout(() => {
        startBounceAnimation();
      }, BOUNCING_ANIMATION_TIMEOUTS[1]);

      // After the second bounce is done remove the animation className and send a tracking event.
      secondBounceAnimationFinishedTimerRef.current = setTimeout(() => {
        finishBounceAnimation();
      }, BOUNCING_ANIMATION_TIMEOUTS[1] + TIME_FOR_BOUNCE_ANIMATION);
    }
  }, [finishBounceAnimation, startBounceAnimation]);

  /**
   * Clear the existing bounce animation timers.
   */
  const clearBounceAnimationTimers = useCallback(() => {
    clearTimeout(firstBounceAnimationStartTimerRef.current);
    clearTimeout(firstBounceAnimationFinishedTimerRef.current);
    clearTimeout(secondBounceAnimationStartTimerRef.current);
    clearTimeout(secondBounceAnimationFinishedTimerRef.current);
  }, []);

  /**
   * Clear the expand and bounce timers and set the launcher state to minimized and bounce turn 3. This way if the page
   * is reloaded the launcher will behave as if it has already been opened and won't try and show a greeting.
   */
  const setDefaultLauncherState = useCallback(() => {
    // Clear to expand timers and set the launcher to minimized so that it will stay minimized on page change/reload.
    clearExpandAnimationTimers();
    serviceManager.store.dispatch(actions.setLauncherMinimized());

    // Clear the bounce timers and set the bounce turn to 3 so that no more bounces will occur after page
    // change/reload.
    clearBounceAnimationTimers();
    serviceManager.store.dispatch(actions.setLauncherProperty("bounceTurn", 3));

    // If the launcher was planning on animating once visible then we should no longer do that.
    animateOnceVisible.current = false;

    setSmallLauncherClassName(
      "cds-aichat--launcher__button-container--no-animation",
    );
  }, [
    clearBounceAnimationTimers,
    clearExpandAnimationTimers,
    serviceManager.store,
  ]);

  useOnMount(() => {
    if (desktopLauncherIsExpanded) {
      // If the launcher is already expanded then it must have been expanded on a previous page load so a simpler
      // animation should be shown.

      // Because of the view change work all views now start hidden. If we try to run determineLauncherHeight while the
      // launcher is hidden we would get incorrect results since LauncherComplex changes it's height by adding and
      // removing classNames, when the launcher is visible, that effect the size of the text. We also need to wait to
      // add the animation class until the launcher is visible, otherwise the animation will start before the user can
      // see the launcher. For these reasons we simply set a ref to true that is used in combination with
      // viewState.launcher lower down to appropriately calculate the height and add the className once the launcher is
      // actually visible.
      animateOnceVisible.current = true;
    } else if (!desktopLauncherWasMinimized && isExpandedLauncherEnabled) {
      // If the launcher hasn't been minimized and isn't expanded then start the timers to expand the launcher.
      setExpandAnimationTimers();

      return () => {
        clearExpandAnimationTimers();
      };
    } else if (desktopLauncherWasMinimized && bounceTurn !== 3) {
      // If the launcher was previously minimized, and we haven't preformed the bounce animation twice then we want to
      // continue the bounce animations on whatever step we were on.
      setBounceAnimationTimers();

      return () => {
        clearBounceAnimationTimers();
      };
    }
    return undefined;
  });

  // If the launcher is now visible, and we intended to show a simple animation when the launcher mounted, now is the time
  // to do it since the user can now see the launcher. This will not run again until the page is reloaded since we
  // currently don't unmount the launcher when its not visible, instead we just hide it with css.
  useEffect(() => {
    if (viewState.launcher && animateOnceVisible.current) {
      // Determine the height of the complex launcher.
      determineLauncherHeight();
      // Add the className for the simple intro animation.
      setComplexLauncherClassName(
        "cds-aichat--launcher-complex__container--simple-animation",
      );
      animateOnceVisible.current = false;
    }
  }, [determineLauncherHeight, viewState.launcher]);

  // If the main window has been opened then clear all timers and set the launcher state as if it had been
  // clicked open. This is to protect against scenarios where the main window is opened using other methods
  // besides clicking on the launcher.
  useEffect(() => {
    if (viewState.mainWindow) {
      // Clear timers and update launcher state so that no more greeting messages or bounces occur.
      setDefaultLauncherState();
    }
  }, [viewState, setDefaultLauncherState]);

  // If the launcher title has changed then we need to recalculate the height and update the styles.
  const prevLauncherTitle = usePrevious(launcherConfig.desktop.title);
  useEffect(() => {
    // The check at the end that makes sure one of the two values is truthy has been added to stop this from running
    // when prevLauncherTitle was undefined and launcher.desktop.title was an empty string.
    if (
      prevLauncherTitle !== launcherConfig.desktop.title &&
      (launcherConfig.desktop.title || prevLauncherTitle)
    ) {
      determineLauncherHeight();
    }
  }, [determineLauncherHeight, launcherConfig, prevLauncherTitle]);

  const onMinimize = useCallback(() => {
    setComplexLauncherClassName(
      "cds-aichat--launcher-complex__container--close-animation",
    );
    // Wait for the minimize animation to finish before switching back to the original launcher.
    setTimeout(() => {
      // Remove the animation class from the small launcher so that it doesn't try and animate in when we make this
      // switch.
      setSmallLauncherClassName(
        "cds-aichat--launcher__button-container--no-animation",
      );
      serviceManager.store.dispatch(actions.setLauncherMinimized());
      // Let the component re-render before moving focus.
      setTimeout(requestFocus);
    }, TIME_FOR_MINIMIZE_ANIMATION);
  }, [requestFocus, serviceManager.store]);

  const handleTagKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onMinimize();
      }
    },
    [onMinimize],
  );

  const onOpen = useCallback(() => {
    // Clear timers and update launcher state so that no more greeting messages or bounces occur.
    setDefaultLauncherState();

    onDoToggle();
  }, [onDoToggle, setDefaultLauncherState]);

  let launcher;
  if (desktopLauncherIsExpanded) {
    launcher = (
      <div
        className={cx(
          "cds-aichat--launcher__button-container",
          "cds-aichat--launcher-complex__container",
          complexLauncherClassName,
          {
            "cds-aichat--launcher__button-container--hidden": launcherHidden,
          },
        )}
        ref={launcherComplexRef}
      >
        <button
          className="cds-aichat--launcher-complex__content-button"
          type="button"
          onClick={onOpen}
          disabled={!desktopLauncherIsExpanded}
        >
          <div
            className={cx("cds-aichat--widget__text-ellipsis", {
              "cds-aichat--launcher-complex__text": !launcherHidden,
            })}
          >
            {launcherContent}
          </div>
        </button>
        <LauncherButton
          containerClassName="cds-aichat--launcher-complex__small-launcher-container"
          dataTestId={PageObjectId.LAUNCHER}
          closedLabel={launcher_isClosed}
          intl={intl}
          openLabel={launcher_isOpen}
          launcherHidden={launcherHidden}
          onToggleOpen={onOpen}
          ref={launcherRef}
          showUnreadIndicator={showUnreadIndicator}
          unreadHumanAgentCount={unreadHumanAgentCount}
        >
          {launcherAvatar}
        </LauncherButton>
        <Tag
          className="cds-aichat--launcher__close-button"
          aria-label={launcher_ariaIsExpanded}
          onClick={onMinimize}
          onKeyDown={handleTagKeyDown}
          tabIndex={desktopLauncherIsExpanded ? 0 : -1}
        >
          <CloseIcon
            slot="icon"
            className="cds-aichat--launcher__close-button-icon"
          />
          {launcher_closeButton}
        </Tag>
      </div>
    );
  } else {
    launcher = (
      <LauncherButton
        containerClassName={smallLauncherClassName}
        dataTestId={PageObjectId.LAUNCHER}
        closedLabel={launcher_isClosed}
        intl={intl}
        openLabel={launcher_isOpen}
        launcherHidden={launcherHidden}
        onToggleOpen={onOpen}
        ref={launcherRef}
        showUnreadIndicator={showUnreadIndicator}
        unreadHumanAgentCount={unreadHumanAgentCount}
      >
        {launcherAvatar}
      </LauncherButton>
    );
  }
  return launcher;
};

export { LauncherDesktopContainer };

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import CDSButton from "@carbon/web-components/es/components/button/button.js";
import Button, {
  BUTTON_KIND,
  BUTTON_TYPE,
} from "../../components/carbon/Button";
import ChatLaunch24 from "@carbon/icons/es/chat--launch/24.js";
import { carbonIconToReact } from "../../utils/carbonIcon";
import cx from "classnames";
import React, {
  forwardRef,
  Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useIntl } from "react-intl";
import { useSelector } from "../../hooks/useSelector";

import { useAriaAnnouncer } from "../../hooks/useAriaAnnouncer";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { usePrevious } from "../../hooks/usePrevious";
import { AppState } from "../../../types/state/AppState";
import { HasClassName } from "../../../types/utilities/HasClassName";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { LauncherConfig } from "../../../types/config/LauncherConfig";
import { animateWithClass } from "../../utils/animationUtils";
import { IS_MOBILE, isBrowser } from "../../utils/browserUtils";
import { doFocusRef } from "../../utils/domUtils";
import { getLauncherButtonAriaLabel } from "./launcherUtils";

interface LauncherExtendedProps extends HasClassName {
  onToggleOpen: () => void;
  launcher: LauncherConfig;

  /**
   * Indicates if this launcher is being used on mobile.
   */
  isMobile?: boolean;

  /**
   * Indicates if the mobile launcher should be in the extended state.
   */
  isExtended: boolean;

  /**
   * Determines if the extended animation should be played when the launcher transitions to the extended state.
   */
  playExtendAnimation: boolean;

  /**
   * The number of unread messages from a human agent that should be displayed on the launcher. If this is 0, no
   * agent indicator will be shown unless showUnreadIndicator is set.
   */
  unreadHumanAgentCount: number;

  /**
   * Indicates if we should show an empty (no number) unread indicator on the launcher. This only applies the first time
   * in the session before the user has opened the Carbon AI Chat and is superseded by the agent unread indicator if there
   * is one.
   */
  showUnreadIndicator: boolean;

  /**
   * The callback function fired when the user swiped over the launcher.
   */
  onSwipeRight: () => void;

  /**
   * The callback function fired when the launcher has completed the reduced animation.
   */
  onReduceEnd: () => void;

  /**
   * If the main Carbon AI Chat window is open the launcher should be hidden.
   */
  launcherHidden: boolean;
}

/**
 * The fade animation object options to control which elements should fade out to animation another one in.
 */
interface ExtendedFadeAnimationOptions {
  /**
   * The element that should fade out to the top.
   */
  fadeOutElement?: HTMLElement;

  /**
   * The element that should fade in from the bottom.
   */
  fadeInElement?: HTMLElement;

  /**
   * The time in milliseconds to wait before we begin the fade in animation.
   */
  fadeInTime?: number;
}

interface LauncherExtendedFunctions extends HasRequestFocus {
  /**
   * Returns the launcher container element which holds the launcher button.
   */
  launcherContainerElement?: () => HTMLDivElement;
}

/**
 * An object which holds the x and y coordinates the user touches their screen.
 */
interface LauncherTouchStartCoordinates {
  touchStartX: number;
  touchStartY: number;
}

const MAX_EXTENDED_LAUNCHER_WIDTH = 400;

/**
 * A new mobile specific launcher experiment that extends its width to the left and transitions between home screen
 * starters with a fade animation.
 */
function LauncherExtended(
  props: LauncherExtendedProps,
  ref: Ref<LauncherExtendedFunctions>,
) {
  const {
    unreadHumanAgentCount,
    showUnreadIndicator,
    launcher,
    isMobile,
    isExtended,
    playExtendAnimation,
    onToggleOpen,
    onSwipeRight,
    onReduceEnd,
    className,
    launcherHidden,
  } = props;
  const ariaAnnouncer = useAriaAnnouncer();
  const languagePack = useLanguagePack();
  const intl = useIntl();
  const launcherAvatarURL = useSelector((state: AppState) =>
    state.config.derived.themeWithDefaults.aiEnabled
      ? undefined
      : state.config.derived.launcher.mobile.avatarUrlOverride,
  );
  const [animateExtendedState, setAnimateExtendedState] =
    useState(playExtendAnimation);
  const [showGreetingMessage, setShowGreetingMessage] = useState(false);
  const prevIsExtended = usePrevious(isExtended);
  const buttonRef = useRef<CDSButton>();
  const extendedContainerRef = useRef<HTMLDivElement>();
  const greetingMessageRef = useRef<HTMLDivElement>();
  const textHolderRef = useRef<HTMLDivElement>();
  // The touch coordinates captured when the user touched the launcher.
  const touchStartRef = useRef<LauncherTouchStartCoordinates>({
    touchStartX: null,
    touchStartY: null,
  });

  const shouldReduceExtendedLauncher = !isExtended && prevIsExtended;
  const extendWithAnimation = isExtended && animateExtendedState;
  const extendWithoutAnimation = isExtended && !animateExtendedState;
  const launcherGreetingMessage =
    launcher.mobile.title || languagePack.launcher_mobileGreeting;
  let ariaLabel = getLauncherButtonAriaLabel(languagePack, launcherHidden);

  if (unreadHumanAgentCount !== 0) {
    ariaLabel += `. ${intl.formatMessage(
      { id: "icon_ariaUnreadMessages" },
      { count: unreadHumanAgentCount },
    )}`;
  }

  const ChatLaunch = carbonIconToReact(ChatLaunch24);
  let launcherAvatar = <ChatLaunch className="cds-aichat--launcher__svg" />;

  if (launcherAvatarURL) {
    // eslint-disable-next-line jsx-a11y/alt-text
    launcherAvatar = (
      <img
        className="cds-aichat--launcher__avatar"
        src={launcherAvatarURL}
        aria-hidden
        alt=""
      />
    );
  }

  useImperativeHandle(ref, () => ({
    requestFocus: () => {
      doFocusRef(buttonRef);
    },
    launcherContainerElement: () => {
      return extendedContainerRef.current;
    },
  }));

  // This effect handles calculating the launcher's extended width. If the greeting message ends up changing, this
  // should also re-calculate it.
  useEffect(() => {
    const textHolderElement = textHolderRef.current;
    const greetingMessageElement = greetingMessageRef.current;
    const extendedContainerElement = extendedContainerRef.current;

    calculateAndSetMaxExtendedLauncherWidth(
      textHolderElement,
      greetingMessageElement,
      extendedContainerElement,
    );
  }, [ariaAnnouncer, extendWithoutAnimation, launcherGreetingMessage]);

  // This handles displaying the greeting message and setting up the touch event listeners to reduce the extended
  // launcher when in the extended state. If the launcher is reducing, the greeting message will be hidden and the
  // launcher state will be update in session storage to reflect the reduced state.
  useEffect(() => {
    if (isExtended) {
      // Fade in and announce the greeting message if the "extend" animation is played.
      if (animateExtendedState) {
        doFadeAnimationForElements(
          { fadeInElement: greetingMessageRef.current, fadeInTime: 300 },
          () => {
            setAnimateExtendedState(false);
          },
        );
      } else {
        // Only un-hide the greeting message.
        setShowGreetingMessage(true);
      }

      // If the launcher is prevented from reducing, there's no need to setup touch listeners.
      const buttonEl = buttonRef.current;
      // Calls a function that will fire a callback function when it detects the user has swiped right on the launcher.
      const handleTouchMove = (event: TouchEvent) => {
        checkIfUserSwipedRight(
          event.touches[0],
          touchStartRef.current,
          onSwipeRight,
        );
      };

      // Capture the coordinates the user has touched the launcher on and add a touchmove listener to determine if the
      // user swiped right on the launcher to close.
      const handleTouchStart = (event: TouchEvent) => {
        const { clientX, clientY } = event.touches[0];
        const touchStart = touchStartRef.current;

        touchStart.touchStartX = clientX;
        touchStart.touchStartY = clientY;

        buttonRef.current.addEventListener("touchmove", handleTouchMove);
      };

      buttonEl.addEventListener("touchstart", handleTouchStart);
      return () => {
        buttonEl.removeEventListener("touchmove", handleTouchMove);
        buttonEl.removeEventListener("touchstart", handleTouchStart);
      };
    } else if (shouldReduceExtendedLauncher) {
      // An animationend event handler that's called once the event reduce animation has ended.
      const reduceAnimationEndListener = () => {
        onReduceEnd();
        // Once the "reduce" animation has finished reset the extended state flag so that the fade up animation for the
        // text will play if another greeting message is triggered.
        setAnimateExtendedState(true);
        extendedContainerRef.current.removeEventListener(
          "animationend",
          reduceAnimationEndListener,
        );
      };

      // Update the extendLauncher flag to false so that the user doesn't see the launcher animation on the next page
      // load.
      extendedContainerRef.current.addEventListener(
        "animationend",
        reduceAnimationEndListener,
      );

      // Fade out the greeting message.
      doFadeAnimationForElements({
        fadeOutElement: greetingMessageRef.current,
      });
    }

    return undefined;
  }, [
    animateExtendedState,
    ariaAnnouncer,
    isExtended,
    launcherGreetingMessage,
    onReduceEnd,
    onSwipeRight,
    shouldReduceExtendedLauncher,
  ]);

  return (
    <div
      className={cx(
        "cds-aichat--launcher__button-container cds-aichat--launcher__button-container--round cds-aichat--launcher-extended__container",
        className,
        {
          "cds-aichat--launcher__button-container--mobile": isMobile,
          "cds-aichat--launcher__button-container--hidden": launcherHidden,
          "cds-aichat--launcher-extended__button--extended":
            extendWithoutAnimation,
          "cds-aichat--launcher-extended__button--extended-animation":
            extendWithAnimation,
          "cds-aichat--launcher-extended__button--reduced-animation":
            shouldReduceExtendedLauncher,
        },
      )}
      ref={extendedContainerRef}
    >
      <Button
        aria-label={ariaLabel}
        className="cds-aichat--launcher__button cds-aichat--launcher-extended__button"
        kind={BUTTON_KIND.PRIMARY}
        type={BUTTON_TYPE.BUTTON}
        ref={buttonRef}
        onClick={onToggleOpen}
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
        {(unreadHumanAgentCount !== 0 || showUnreadIndicator) && (
          <div className="cds-aichat--count-indicator">
            {unreadHumanAgentCount !== 0 ? unreadHumanAgentCount : ""}
          </div>
        )}
      </Button>
    </div>
  );
}

/**
 * This will do the math to determine the max-width in pixels the launcher is allowed to extend on a given device using
 * the provided elements and set the calculated width as a css variable.
 */
function calculateAndSetMaxExtendedLauncherWidth(
  textHolderEl: HTMLDivElement,
  greetingMessageEl: HTMLDivElement,
  extendedContainerEl: HTMLDivElement,
) {
  // The number in pixels that don't make up the space the launcher text can fill up.
  // 68px = 6px (left/right button border width) + 50px (launcher icon container) + 12px (text holder left padding)
  const nonTextSpace = 68;
  const maxLauncherExtendedWidth = getMaxLauncherExtendedWidth();

  // The max-width in pixels the launcher text can take up if the launcher were to fully extend the devices' width.
  // Add 12px to account for text holder container left padding.
  const maxTextHolderWidth = maxLauncherExtendedWidth - nonTextSpace + 12;

  // Set the text holder width and un-hide the greeting message element so that we can get the width of the greeting
  // message text to help calculate how far the launcher should extend to fit the text.
  textHolderEl.style.setProperty("width", `${maxTextHolderWidth}px`);
  // The width of the greeting message element is the max width minus the border width and left padding.
  greetingMessageEl.style.setProperty("width", `${maxTextHolderWidth - 12}px`);
  greetingMessageEl.style.setProperty("display", "flex");

  const { clientWidth } = greetingMessageEl.querySelector(
    ".cds-aichat--launcher-extended__greeting-text",
  );
  // We should add a pixel to compensate for lack of clientWidth precision. It's possible for 1 line of text to be
  // rendered as 2 lines because HTML may render text with a precise width of 219.266 pixels, but clientWidth will
  // return the floor value which would be just 219.
  let launcherExtendedWidth = clientWidth + nonTextSpace + 1;

  // Make sure the launcher width doesn't exceed the max width.
  if (launcherExtendedWidth > MAX_EXTENDED_LAUNCHER_WIDTH) {
    launcherExtendedWidth = MAX_EXTENDED_LAUNCHER_WIDTH;
  }

  // Remove temporary styles applied.
  greetingMessageEl.removeAttribute("style");
  textHolderEl.removeAttribute("style");

  // Reduce the wrapper's extended width by 6 pixels to account for the launcher button's border width.
  // setWrapperExtendedWidth(launcherExtendedWidth - 6);
  // Set the extended width property to animate to.
  extendedContainerEl.style.setProperty(
    "--cds-aichat--launcher-extended-width",
    `${launcherExtendedWidth}px`,
  );
}

/**
 * Performs the fade in/out animations on the provided elements.
 */
function doFadeAnimationForElements(
  {
    fadeOutElement,
    fadeInElement,
    fadeInTime = 600,
  }: ExtendedFadeAnimationOptions,
  callback?: () => void,
) {
  if (fadeOutElement) {
    fadeOutElement.classList.remove(
      "cds-aichat--launcher-extended__element--hidden",
    );
    animateWithClass(
      fadeOutElement,
      "cds-aichat--launcher-extended__element--fade-out",
      500,
      () => {
        fadeOutElement.classList.add(
          "cds-aichat--launcher-extended__element--hidden",
        );
        fadeOutElement.classList.remove(
          "cds-aichat--launcher-extended__element--fade-out",
        );
        // If there is no element provided to fade in, fire the callback function after the fade out animation is complete.
        if (!fadeInElement && callback) {
          callback();
        }
      },
    );
  }

  if (fadeInElement) {
    setTimeout(() => {
      fadeInElement.classList.remove(
        "cds-aichat--launcher-extended__element--hidden",
      );
      animateWithClass(
        fadeInElement,
        "cds-aichat--launcher-extended__element--fade-in",
        600,
        () => {
          fadeInElement.classList.remove(
            "cds-aichat--launcher-extended__element--fade-in",
          );
          // Fire the callback after the fade in animation has ended.
          if (callback) {
            callback();
          }
        },
      );
    }, fadeInTime);
  }
}

/**
 * Calculates if the user has swiped right on their screen over the extended launcher and fires a callback function if
 * this is the case.
 */
function checkIfUserSwipedRight(
  touchList: Touch,
  touchStartCoordinates: LauncherTouchStartCoordinates,
  callback: () => void,
) {
  const { touchStartX, touchStartY } = touchStartCoordinates;

  if (touchStartX === null || touchStartY === null) {
    return;
  }

  // Capture the coordinates the user moved to.
  const { clientX: touchEndX, clientY: touchEndY } = touchList;
  // Get the difference between when the user began swiping and where they ended.
  const differenceX = touchEndX - touchStartX;
  const differenceY = touchEndY - touchStartY;

  // If the absolute value of the X difference is greater than Y, this means the user swiped left or right on their
  // device more than they swiped up or down.
  if (Math.abs(differenceX) > Math.abs(differenceY)) {
    // If the difference is greater than 0, this means the user swiped right, and we should fire the callback function.
    if (differenceX > 0) {
      callback();
    }
  }

  // Reset the starting coordinates
  touchStartCoordinates.touchStartX = null;
  touchStartCoordinates.touchStartY = null;
}

/**
 * Returns the max width the launcher should animate to which is determined by using the lowest value between the
 * screen height or width for mobile devices. If the user is on a tablet, we don't want the launcher to extend
 * unnecessarily far, so we should cap at it 400px.
 */
function getMaxLauncherExtendedWidth() {
  const launcherPosition = IS_MOBILE ? 32 : 64;
  if (!isBrowser) {
    return MAX_EXTENDED_LAUNCHER_WIDTH;
  }
  const { width, height } = window.screen;
  const lowestValue = Math.min(height, width);
  const extendedWidth = lowestValue - launcherPosition;
  return Math.min(extendedWidth, MAX_EXTENDED_LAUNCHER_WIDTH);
}

const LauncherExtendedExport = React.memo(forwardRef(LauncherExtended));

export {
  LauncherExtendedExport as LauncherExtended,
  LauncherExtendedFunctions,
};

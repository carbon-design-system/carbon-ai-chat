/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import CDSButton from "@carbon/web-components/es/components/button/button.js";
import AiLaunch24 from "@carbon/icons/es/ai-launch/24.js";
import ChatLaunch24 from "@carbon/icons/es/chat--launch/24.js";
import Close16 from "@carbon/icons/es/close/16.js";
import { carbonIconToReact } from "../../utils/carbonIcon";
import cx from "classnames";
import React, {
  RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { usePrevious } from "../../hooks/usePrevious";
import Button, {
  BUTTON_KIND,
  BUTTON_SIZE,
  BUTTON_TOOLTIP_POSITION,
  BUTTON_TYPE,
} from "../../components/carbon/Button";
import { doFocusRef } from "../../utils/domUtils";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import {
  calculateAndSetMaxExtendedLauncherWidth,
  checkIfUserSwipedRight,
  doFadeAnimationForElements,
} from "./launcherUtils";
import type { LauncherTouchStartCoordinates } from "./launcherUtils";

const AiLaunch = carbonIconToReact(AiLaunch24);
const ChatLaunch = carbonIconToReact(ChatLaunch24);
const CloseIcon = carbonIconToReact(Close16);
const CLOSE_BUTTON_ALIGNMENT_OFFSET = 32;

type LauncherHandle = HasRequestFocus & {
  buttonElement: () => CDSButton | undefined;
  containerElement: () => HTMLDivElement | undefined;
  launcherContainerElement?: () => HTMLDivElement | undefined;
};

interface LauncherProps {
  /**
   * Necessary to get access to the ref created within App.tsx.
   */
  launcherRef: RefObject<LauncherHandle | null>;
  onToggleOpen: () => void;
  onClose: () => void;
  launcherHidden: boolean;
  extended: boolean;
  showUnreadIndicator: boolean;
  unreadMessageCount: number;
  mainWindowOpen: boolean;
  launcherGreetingMessage: string;
  launcherAvatarUrl?: string;
  showCloseButton: boolean;
  closeButtonLabel: string;
  closedLabel: string;
  openLabel: string;
  aiEnabled: boolean;
  formatUnreadMessageLabel?: ({ count }: { count: number }) => string;
  dataTestId?: string;
}

function Launcher(props: LauncherProps) {
  const {
    launcherRef,
    onToggleOpen,
    onClose,
    launcherHidden,
    extended,
    showUnreadIndicator,
    unreadMessageCount,
    mainWindowOpen,
    launcherGreetingMessage,
    launcherAvatarUrl,
    showCloseButton,
    closeButtonLabel,
    closedLabel,
    openLabel,
    aiEnabled,
    formatUnreadMessageLabel,
    dataTestId,
  } = props;

  const [animateExtendedState, setAnimateExtendedState] = useState(false);
  const [showGreetingMessage, setShowGreetingMessage] = useState(false);
  const [launcherExtendedWidth, setLauncherExtendedWidth] = useState<
    string | undefined
  >(undefined);
  const [closeButtonInlineOffset, setCloseButtonInlineOffset] = useState<
    string | undefined
  >(undefined);
  const prevExtended = usePrevious(extended);

  const textHolderRef = useRef<HTMLDivElement>(undefined);
  const greetingMessageRef = useRef<HTMLDivElement>(undefined);
  const extendedContainerRef = useRef<HTMLDivElement>(undefined);
  const buttonRef = useRef<CDSButton>(undefined);
  const outerContainerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<LauncherTouchStartCoordinates>({
    touchStartX: null,
    touchStartY: null,
  });

  const shouldReduceExtendedLauncher = !extended && prevExtended;
  const extendWithAnimation = extended && animateExtendedState;
  const extendWithoutAnimation = extended && !animateExtendedState;
  const launcherAvatar = launcherAvatarUrl ? (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      className="cds-aichat--launcher__avatar"
      src={launcherAvatarUrl}
      aria-hidden
      alt=""
    />
  ) : aiEnabled ? (
    <AiLaunch className="cds-aichat--launcher__svg" />
  ) : (
    <ChatLaunch className="cds-aichat--launcher__svg" />
  );

  const reduceLauncher = useCallback(() => {
    if (extended) {
      onClose();
    }
  }, [extended, onClose]);

  const setDefaultLauncherState = useCallback(() => {
    reduceLauncher();
  }, [reduceLauncher]);

  // If the main window has been opened then clear all timers and set the launcher state as if it had been
  // clicked open. This is to protect against scenarios where the main window is opened using other methods besides
  // clicking on the launcher.
  useEffect(() => {
    if (mainWindowOpen) {
      // Clear timers and update launcher state so that no more greeting messages are queued.
      setDefaultLauncherState();
    }
  }, [mainWindowOpen, setDefaultLauncherState]);

  const handleToggleOpen = useCallback(() => {
    setDefaultLauncherState();
    onToggleOpen();
  }, [onToggleOpen, setDefaultLauncherState]);

  const handleDismiss = useCallback(() => {
    reduceLauncher();
  }, [reduceLauncher]);

  const buttonContainerClassName = cx(
    "cds-aichat--launcher__button-container",
    "cds-aichat--launcher__button-container--round",
    "cds-aichat--launcher-extended__container",
    {
      "cds-aichat--launcher-extended__button--extended": extendWithoutAnimation,
      "cds-aichat--launcher-extended__button--extended-animation":
        extendWithAnimation,
      "cds-aichat--launcher-extended__button--reduced-animation":
        shouldReduceExtendedLauncher,
      "cds-aichat--launcher__button-container--hidden": launcherHidden,
    },
  );

  const buttonClassName = cx(
    "cds-aichat--launcher__button",
    "cds-aichat--launcher-extended__button",
  );

  const handleButtonRef = useCallback((element: CDSButton | null) => {
    buttonRef.current = element ?? undefined;
  }, []);

  const handleContainerRef = useCallback((element: HTMLDivElement | null) => {
    extendedContainerRef.current = element ?? undefined;
  }, []);

  const ariaLabelSuffix =
    unreadMessageCount !== 0
      ? formatUnreadMessageLabel?.({ count: unreadMessageCount })
      : undefined;
  const launcherAriaLabel = [
    launcherHidden ? openLabel : closedLabel,
    ariaLabelSuffix,
  ]
    .filter(Boolean)
    .join(". ");
  const buttonTabIndex = launcherHidden ? -1 : undefined;

  useImperativeHandle(launcherRef, () => ({
    requestFocus: () => {
      doFocusRef(buttonRef);
    },
    buttonElement: () => buttonRef.current,
    containerElement: () => extendedContainerRef.current,
    launcherContainerElement: () => extendedContainerRef.current ?? undefined,
  }));
  useEffect(() => {
    const textHolderElement = textHolderRef.current;
    const greetingMessageElement = greetingMessageRef.current;
    const extendedContainerElement = extendedContainerRef.current;

    if (
      !textHolderElement ||
      !greetingMessageElement ||
      !extendedContainerElement
    ) {
      setLauncherExtendedWidth((prev) =>
        prev === undefined ? prev : undefined,
      );
      setCloseButtonInlineOffset((prev) =>
        prev === undefined ? prev : undefined,
      );
      return;
    }

    const computedWidth = calculateAndSetMaxExtendedLauncherWidth(
      textHolderElement,
      greetingMessageElement,
      extendedContainerElement,
    );

    const widthValue = computedWidth ? `${computedWidth}px` : undefined;
    setLauncherExtendedWidth((prev) => {
      if (prev === widthValue) {
        return prev;
      }

      return widthValue;
    });

    const containerInlineSize =
      extendedContainerElement.getBoundingClientRect()?.width;
    const closeOffsetValue =
      containerInlineSize && containerInlineSize > 0
        ? `${Math.max(
            containerInlineSize - CLOSE_BUTTON_ALIGNMENT_OFFSET,
            0,
          )}px`
        : undefined;
    setCloseButtonInlineOffset((prev) =>
      prev === closeOffsetValue ? prev : closeOffsetValue,
    );
  }, [extendWithoutAnimation, launcherGreetingMessage]);

  useEffect(() => {
    if (!extended) {
      setLauncherExtendedWidth((prev) =>
        prev === undefined ? prev : undefined,
      );
      setCloseButtonInlineOffset((prev) =>
        prev === undefined ? prev : undefined,
      );
    }
  }, [extended]);

  useEffect(() => {
    const outerContainerElement = outerContainerRef.current;

    if (!outerContainerElement) {
      return;
    }

    if (launcherExtendedWidth) {
      outerContainerElement.style.setProperty(
        "--cds-aichat--launcher-extended-width",
        launcherExtendedWidth,
      );
    } else {
      outerContainerElement.style.removeProperty(
        "--cds-aichat--launcher-extended-width",
      );
    }
  }, [launcherExtendedWidth]);

  useEffect(() => {
    const outerContainerElement = outerContainerRef.current;

    if (!outerContainerElement) {
      return;
    }

    if (closeButtonInlineOffset) {
      outerContainerElement.style.setProperty(
        "--cds-aichat--launcher-close-offset-inline",
        closeButtonInlineOffset,
      );
    } else {
      outerContainerElement.style.removeProperty(
        "--cds-aichat--launcher-close-offset-inline",
      );
    }
  }, [closeButtonInlineOffset]);

  useEffect(() => {
    const buttonElement = buttonRef.current;
    const containerElement = extendedContainerRef.current;

    if (extended && buttonElement) {
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
    extended,
    reduceLauncher,
    shouldReduceExtendedLauncher,
  ]);

  return (
    <div
      className={cx({
        "cds-aichat--launcher-extended__outer-container": extended,
      })}
      ref={outerContainerRef}
    >
      <Button
        className={cx("cds-aichat--launcher-extended__close-button", {
          "cds-aichat--launcher-extended__close-button--hidden":
            !extended || !showCloseButton,
        })}
        kind={BUTTON_KIND.SECONDARY}
        size={BUTTON_SIZE.EXTRA_SMALL}
        onClick={handleDismiss}
        tooltipPosition={
          document.dir === "rtl"
            ? BUTTON_TOOLTIP_POSITION.RIGHT
            : BUTTON_TOOLTIP_POSITION.LEFT
        }
        tabIndex={extended && showCloseButton ? 0 : -1}
        disabled={!extended || !showCloseButton}
        tooltipText={closeButtonLabel}
      >
        <CloseIcon
          aria-label={closeButtonLabel}
          slot="icon"
          className="cds-aichat--launcher-extended__close-button-icon"
        />
      </Button>
      <div className={buttonContainerClassName} ref={handleContainerRef}>
        <Button
          aria-label={launcherAriaLabel}
          className={buttonClassName}
          data-testid={dataTestId}
          kind={BUTTON_KIND.PRIMARY}
          onClick={handleToggleOpen}
          ref={handleButtonRef}
          tabIndex={buttonTabIndex}
          type={BUTTON_TYPE.BUTTON}
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
                    aria-hidden={!extended}
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
          {(unreadMessageCount !== 0 || showUnreadIndicator) && (
            <div className="cds-aichat--count-indicator">
              {unreadMessageCount !== 0 ? unreadMessageCount : ""}
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}

export type { LauncherHandle };
export { Launcher };

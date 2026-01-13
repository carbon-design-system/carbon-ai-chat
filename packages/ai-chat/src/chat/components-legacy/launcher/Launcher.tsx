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
import { AnnounceOnMountComponent } from "../util/AnnounceOnMountComponent";
import { uuid } from "../../utils/lang/uuid";

const AiLaunch = carbonIconToReact(AiLaunch24);
const ChatLaunch = carbonIconToReact(ChatLaunch24);
const CloseIcon = carbonIconToReact(Close16);

export enum LauncherOpenState {
  Opening = "opening",
  Open = "open",
  Closing = "closing",
  Closed = "closed",
}

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
  closeButtonLabel: string;
  closedLabel: string;
  openLabel: string;
  aiEnabled: boolean;
  formatUnreadMessageLabel?: ({ count }: { count: number }) => string;
  dataTestId?: string;
}

// Stable id for focus target of the skip link
const launcherButtonId = `cds-aichat-launcher-button-${uuid()}`;

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
    closeButtonLabel,
    closedLabel,
    openLabel,
    aiEnabled,
    formatUnreadMessageLabel,
    dataTestId,
  } = props;

  const prevExtended = usePrevious(extended);

  const [callToActionOpenState, setCallToActionOpenState] =
    useState<LauncherOpenState>(() =>
      extended ? LauncherOpenState.Open : LauncherOpenState.Closed,
    );

  const textHolderRef = useRef<HTMLDivElement | null>(null);
  const greetingMessageRef = useRef<HTMLDivElement | null>(null);
  const extendedContainerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<CDSButton | null>(null);

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

  const launcherAvatar = launcherAvatarUrl ? (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      className="cds-aichat--launcher__avatar"
      src={launcherAvatarUrl}
      aria-hidden
      alt=""
    />
  ) : aiEnabled ? (
    <AiLaunch
      className="cds-aichat--launcher__svg"
      aria-label={launcherAriaLabel}
      role="img"
    />
  ) : (
    <ChatLaunch
      className="cds-aichat--launcher__svg"
      aria-label={launcherAriaLabel}
      role="img"
    />
  );

  const reduceLauncher = useCallback(() => {
    if (extended) {
      onClose();
    }
  }, [extended, onClose]);

  // If the main window has been opened then clear all timers and set the launcher state as if it had been
  // clicked open. This is to protect against scenarios where the main window is opened using other methods besides
  // clicking on the launcher.
  useEffect(() => {
    if (mainWindowOpen) {
      // Clear timers and update launcher state so that no more greeting messages are queued.
      reduceLauncher();
    }
  }, [mainWindowOpen, reduceLauncher]);

  const handleToggleOpen = useCallback(() => {
    reduceLauncher();
    onToggleOpen();
  }, [onToggleOpen, reduceLauncher]);

  const handleDismiss = useCallback(() => {
    reduceLauncher();
  }, [reduceLauncher]);

  const handleButtonRef = useCallback((element: CDSButton | null) => {
    buttonRef.current = element ?? null;
  }, []);

  const buttonTabIndex = launcherHidden ? -1 : undefined;

  useImperativeHandle(launcherRef, () => ({
    requestFocus: () => {
      doFocusRef(buttonRef);
    },
    buttonElement: () => buttonRef.current ?? undefined,
    containerElement: () => extendedContainerRef.current ?? undefined,
    launcherContainerElement: () => extendedContainerRef.current ?? undefined,
  }));

  // React to changes in the "extended" prop: trigger opening/closing transitions.
  useEffect(() => {
    // Skip first render if usePrevious returns undefined initially
    if (prevExtended !== undefined) {
      if (!prevExtended && extended) {
        setCallToActionOpenState(LauncherOpenState.Opening);
      } else if (prevExtended && !extended) {
        setCallToActionOpenState(LauncherOpenState.Closing);
      }
    }
  }, [extended, prevExtended]);

  // When opening animation on greeting completes, transition Opening -> Open
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (callToActionOpenState === LauncherOpenState.Opening) {
      const element = greetingMessageRef.current;

      if (!element) {
        // Fail-safe: if no element, just snap to open
        setCallToActionOpenState(LauncherOpenState.Open);
      } else {
        const handleAnimationEnd = (event: AnimationEvent) => {
          if (event.target === element) {
            setCallToActionOpenState(LauncherOpenState.Open);
          }
        };

        element.addEventListener("animationend", handleAnimationEnd);
        element.addEventListener("animationcancel", handleAnimationEnd);

        cleanup = () => {
          element.removeEventListener("animationend", handleAnimationEnd);
          element.removeEventListener("animationcancel", handleAnimationEnd);
        };
      }
    }

    return cleanup;
  }, [callToActionOpenState]);

  // When closing animation on text holder completes, transition Closing -> Closed
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (callToActionOpenState === LauncherOpenState.Closing) {
      const element = textHolderRef.current;

      if (!element) {
        // Fail-safe: if no element, just snap to closed
        setCallToActionOpenState(LauncherOpenState.Closed);
      } else {
        const handleAnimationEnd = (event: AnimationEvent) => {
          if (event.target === element) {
            setCallToActionOpenState(LauncherOpenState.Closed);
          }
        };

        element.addEventListener("animationend", handleAnimationEnd);
        element.addEventListener("animationcancel", handleAnimationEnd);

        cleanup = () => {
          element.removeEventListener("animationend", handleAnimationEnd);
          element.removeEventListener("animationcancel", handleAnimationEnd);
        };
      }
    }

    return cleanup;
  }, [callToActionOpenState]);

  const shouldShowGreeting =
    callToActionOpenState === LauncherOpenState.Opening ||
    callToActionOpenState === LauncherOpenState.Open;

  return (
    <div
      ref={extendedContainerRef}
      className={cx("cds-aichat--launcher__button-container", {
        "cds-aichat--launcher__button-container--opening":
          callToActionOpenState === LauncherOpenState.Opening,
        "cds-aichat--launcher__button-container--open":
          callToActionOpenState === LauncherOpenState.Open,
        "cds-aichat--launcher__button-container--closing":
          callToActionOpenState === LauncherOpenState.Closing,
        "cds-aichat--launcher__button-container--closed":
          callToActionOpenState === LauncherOpenState.Closed,
        "cds-aichat--launcher__button-container--hidden": launcherHidden,
      })}
    >
      <Button
        className="cds-aichat--launcher-extended__close-button"
        kind={BUTTON_KIND.SECONDARY}
        size={BUTTON_SIZE.EXTRA_SMALL}
        aria-label={closeButtonLabel}
        onClick={handleDismiss}
        tooltipPosition={
          document.dir === "rtl"
            ? BUTTON_TOOLTIP_POSITION.RIGHT
            : BUTTON_TOOLTIP_POSITION.LEFT
        }
        tooltip-text={closeButtonLabel}
      >
        <CloseIcon aria-label={closeButtonLabel} slot="icon" />
      </Button>
      <Button
        // minor note: role="complementary" is usually for containers/regions,
        // but leaving as-is since you didn't ask to change semantics
        role="complementary"
        id={launcherButtonId}
        aria-label={launcherAriaLabel}
        tooltip-text={launcherAriaLabel}
        className="cds-aichat--launcher__button"
        data-testid={dataTestId}
        kind={BUTTON_KIND.PRIMARY}
        onClick={handleToggleOpen}
        ref={handleButtonRef}
        tabIndex={buttonTabIndex}
        type={BUTTON_TYPE.BUTTON}
      >
        <div className="cds-aichat--launcher__wrapper">
          <div
            className="cds-aichat--launcher-extended__text-holder"
            ref={textHolderRef}
          >
            <div
              className="cds-aichat--launcher-extended__greeting"
              ref={greetingMessageRef}
            >
              {shouldShowGreeting && (
                <AnnounceOnMountComponent
                  announceOnce={launcherGreetingMessage}
                >
                  {/* Skip link announced together with the CTA message */}
                  <a
                    href={`#${launcherButtonId}`}
                    className="cds-aichat--launcher__skip-link"
                  >
                    Jump to chat launcher
                  </a>
                  <div className="cds-aichat--launcher-extended__greeting-text">
                    {launcherGreetingMessage}
                  </div>
                </AnnounceOnMountComponent>
              )}
            </div>
          </div>
          <div className="cds-aichat--launcher__icon-holder">
            {launcherAvatar}
          </div>
        </div>
        {(unreadMessageCount !== 0 || showUnreadIndicator) && (
          <div className="cds-aichat--count-indicator">
            {unreadMessageCount !== 0 ? unreadMessageCount : ""}
          </div>
        )}
      </Button>
    </div>
  );
}

export type { LauncherHandle };
export { Launcher };

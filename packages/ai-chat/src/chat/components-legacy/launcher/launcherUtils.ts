/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LauncherConfig } from "../../../types/config/LauncherConfig";
import { animateWithClass } from "../../utils/animationUtils";
import { IS_MOBILE, isBrowser } from "../../utils/browserUtils";

const MAX_EXTENDED_LAUNCHER_WIDTH = 400;

interface ExtendedFadeAnimationOptions {
  fadeOutElement?: HTMLElement;
  fadeInElement?: HTMLElement;
  fadeInTime?: number;
}

interface LauncherTouchStartCoordinates {
  touchStartX: number;
  touchStartY: number;
}

/**
 * Returns the aria-label string from the provided language pack for the launcher button based on the open and view
 * state.
 */
function calculateAndSetMaxExtendedLauncherWidth(
  textHolderEl: HTMLDivElement,
  greetingMessageEl: HTMLDivElement,
  extendedContainerEl: HTMLDivElement,
) {
  const nonTextSpace = 68;
  const maxLauncherExtendedWidth = getMaxLauncherExtendedWidth();
  const maxTextHolderWidth = maxLauncherExtendedWidth - nonTextSpace + 12;

  textHolderEl.style.setProperty("width", `${maxTextHolderWidth}px`);
  greetingMessageEl.style.setProperty("width", `${maxTextHolderWidth - 12}px`);
  greetingMessageEl.style.setProperty("display", "flex");

  const greetingTextElement = greetingMessageEl.querySelector(
    ".cds-aichat--launcher-extended__greeting-text",
  ) as HTMLElement;

  if (!greetingTextElement) {
    return;
  }

  let launcherExtendedWidth =
    greetingTextElement.clientWidth + nonTextSpace + 1;

  if (launcherExtendedWidth > MAX_EXTENDED_LAUNCHER_WIDTH) {
    launcherExtendedWidth = MAX_EXTENDED_LAUNCHER_WIDTH;
  }

  greetingMessageEl.removeAttribute("style");
  textHolderEl.removeAttribute("style");

  extendedContainerEl.style.setProperty(
    "--cds-aichat--launcher-extended-width",
    `${launcherExtendedWidth}px`,
  );
}

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
          if (callback) {
            callback();
          }
        },
      );
    }, fadeInTime);
  }
}

function checkIfUserSwipedRight(
  touchList: Touch,
  touchStartCoordinates: LauncherTouchStartCoordinates,
  callback: () => void,
) {
  const { touchStartX, touchStartY } = touchStartCoordinates;

  if (touchStartX === null || touchStartY === null) {
    return;
  }

  const { clientX: touchEndX, clientY: touchEndY } = touchList;
  const differenceX = touchEndX - touchStartX;
  const differenceY = touchEndY - touchStartY;

  if (Math.abs(differenceX) > Math.abs(differenceY) && differenceX > 0) {
    callback();
  }

  touchStartCoordinates.touchStartX = null;
  touchStartCoordinates.touchStartY = null;
}

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

function getLauncherContent(
  launcherConfig: LauncherConfig,
  defaultGreeting: string,
) {
  if (launcherConfig.desktop.title) {
    return launcherConfig.desktop.title;
  }

  return defaultGreeting;
}

export {
  calculateAndSetMaxExtendedLauncherWidth,
  checkIfUserSwipedRight,
  doFadeAnimationForElements,
  getLauncherContent,
  getMaxLauncherExtendedWidth,
  MAX_EXTENDED_LAUNCHER_WIDTH,
};

export type { ExtendedFadeAnimationOptions, LauncherTouchStartCoordinates };

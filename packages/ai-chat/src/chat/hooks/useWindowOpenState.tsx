/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrevious } from "./usePrevious";
import { prefersReducedMotion } from "../utils/prefersReducedMotion";

interface UseWindowOpenStateProps {
  viewStateMainWindow: boolean;
  isHydrated: boolean;
  useCustomHostElement: boolean;
  requestFocus: () => void;
}

interface UseWindowOpenStateReturn {
  open: boolean;
  closing: boolean;
  isHydrationAnimationComplete: boolean;
  setIsHydrationAnimationComplete: (value: boolean) => void;
  widgetContainerRef: React.MutableRefObject<HTMLElement | null>;
}

// Upper bound for the widget close animation (`$duration-fast-02` = 110ms) plus
// a generous buffer. Used as a safety net in case `animationend` never fires —
// e.g. when the browser reports `prefers-reduced-motion: reduce` and the CSS
// `animation` is never declared, or if the element is re-parented mid-animation.
const CLOSE_ANIMATION_TIMEOUT_MS = 500;

/**
 * Custom hook to manage window open/close state and animations
 */
export function useWindowOpenState({
  viewStateMainWindow,
  isHydrated,
  useCustomHostElement,
  requestFocus,
}: UseWindowOpenStateProps): UseWindowOpenStateReturn {
  const [open, setOpen] = useState(viewStateMainWindow);
  const [closing, setClosing] = useState(false);
  const [isHydrationAnimationComplete, setIsHydrationAnimationComplete] =
    useState(isHydrated);
  const widgetContainerRef = useRef<HTMLElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsHydrated = usePrevious(isHydrated);
  const prevViewState = usePrevious({ mainWindow: viewStateMainWindow });

  const removeChatFromDom = useCallback(() => {
    const widgetEl = widgetContainerRef.current;
    if (widgetEl) {
      widgetEl.removeEventListener("animationend", removeChatFromDom);
    }
    if (closeTimeoutRef.current !== null) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpen(false);
    setClosing(false);
  }, []);

  // Handle hydration completion
  useEffect(() => {
    if (!prevIsHydrated && isHydrated) {
      setIsHydrationAnimationComplete(true);
      requestAnimationFrame(() => {
        requestFocus();
      });
    }
  }, [isHydrated, prevIsHydrated, requestFocus]);

  // Handle window open/close state changes
  useEffect(() => {
    const previouslyOpen = prevViewState?.mainWindow ?? open;
    if (viewStateMainWindow && (!previouslyOpen || !open)) {
      setOpen(true);
      requestFocus();
    } else if (!viewStateMainWindow && previouslyOpen && open) {
      setClosing(true);
      const widgetEl = widgetContainerRef.current;
      // When the user's OS has reduced motion enabled, the SCSS close animation
      // is gated behind `prefers-reduced-motion: no-preference` and never
      // declares an `animation`. That means `animationend` will never fire, so
      // fall back to an immediate snap. Mirrors the custom-host-element path.
      if (useCustomHostElement || prefersReducedMotion() || !widgetEl) {
        removeChatFromDom();
      } else {
        widgetEl.addEventListener("animationend", removeChatFromDom);
        closeTimeoutRef.current = setTimeout(
          removeChatFromDom,
          CLOSE_ANIMATION_TIMEOUT_MS,
        );
        requestFocus();
      }
    }
  }, [
    open,
    prevViewState,
    removeChatFromDom,
    requestFocus,
    useCustomHostElement,
    viewStateMainWindow,
  ]);

  return {
    open,
    closing,
    isHydrationAnimationComplete,
    setIsHydrationAnimationComplete,
    widgetContainerRef,
  };
}

// Made with Bob

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
  const prevIsHydrated = usePrevious(isHydrated);
  const prevViewState = usePrevious({ mainWindow: viewStateMainWindow });

  const removeChatFromDom = useCallback(() => {
    const widgetEl = widgetContainerRef.current;
    if (widgetEl) {
      widgetEl.removeEventListener("animationend", removeChatFromDom);
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
      if (useCustomHostElement) {
        removeChatFromDom();
      } else {
        widgetContainerRef.current?.addEventListener(
          "animationend",
          removeChatFromDom,
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

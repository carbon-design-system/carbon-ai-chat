/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect, useMemo, useRef, useState } from "react";

interface VisualViewportMetrics {
  width: number;
  height: number;
  offsetTop: number;
}

interface UseMobileViewportLayoutArgs {
  /**
   * Whether mobile-specific enhancements (like dvh + scroll locking) are enabled.
   */
  enabled: boolean;
  /**
   * Whether the chat window is currently open; scroll locking only applies when true.
   */
  isOpen: boolean;
  /**
   * Optional padding (in px) to subtract from width/height when setting CSS vars.
   */
  margin?: number;
}

interface MobileViewportLayoutResult {
  style: React.CSSProperties;
}

/**
 * This hook handles two behaviors needed on mobile Safari:
 * 1) Sizing the chat to the live visual viewport via custom properties.
 * 2) Locking body/html scroll while the chat is open to prevent background pulling.
 */
function useMobileViewportLayout({
  enabled,
  isOpen,
  margin = 4,
}: UseMobileViewportLayoutArgs): MobileViewportLayoutResult {
  const [visualViewportMetrics, setVisualViewportMetrics] =
    useState<VisualViewportMetrics | null>(null);
  const previousBodyStyles = useRef<{
    bodyOverflow: string;
    bodyPosition: string;
    bodyTop: string;
    bodyWidth: string;
    bodyHeight: string;
    bodyOverscrollBehavior: string;
    bodyTouchAction: string;
    htmlOverflow: string;
    htmlPosition: string;
    htmlWidth: string;
    htmlHeight: string;
    htmlOverscrollBehavior: string;
    htmlTouchAction: string;
    scrollY: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setVisualViewportMetrics(null);
      return undefined;
    }

    const visualViewport = window.visualViewport;

    if (!visualViewport) {
      setVisualViewportMetrics(null);
      return undefined;
    }

    const updateVisualViewportMetrics = () => {
      setVisualViewportMetrics({
        width: visualViewport.width,
        height: visualViewport.height,
        offsetTop: visualViewport.offsetTop ?? 0,
      });
    };

    updateVisualViewportMetrics();

    visualViewport.addEventListener("resize", updateVisualViewportMetrics);
    visualViewport.addEventListener("scroll", updateVisualViewportMetrics);

    return () => {
      visualViewport.removeEventListener("resize", updateVisualViewportMetrics);
      visualViewport.removeEventListener("scroll", updateVisualViewportMetrics);
    };
  }, [enabled]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return () => {};
    }

    const shouldLock = enabled && isOpen;
    const body = document.body;
    const html = document.documentElement;

    if (shouldLock) {
      if (previousBodyStyles.current === null) {
        previousBodyStyles.current = {
          bodyOverflow: body.style.overflow || "",
          bodyPosition: body.style.position || "",
          bodyTop: body.style.top || "",
          bodyWidth: body.style.width || "",
          bodyHeight: body.style.height || "",
          bodyOverscrollBehavior: (body.style as any).overscrollBehavior || "",
          bodyTouchAction: (body.style as any).touchAction || "",
          htmlOverflow: html.style.overflow || "",
          htmlPosition: html.style.position || "",
          htmlWidth: html.style.width || "",
          htmlHeight: html.style.height || "",
          htmlOverscrollBehavior: (html.style as any).overscrollBehavior || "",
          htmlTouchAction: (html.style as any).touchAction || "",
          scrollY: window.scrollY,
        };
      }

      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${previousBodyStyles.current.scrollY}px`;
      body.style.width = "100%";
      body.style.height = "100%";
      (body.style as any).overscrollBehavior = "contain";
      (body.style as any).touchAction = "none";

      html.style.overflow = "hidden";
      html.style.position = "fixed";
      html.style.width = "100%";
      html.style.height = "100%";
      (html.style as any).overscrollBehavior = "contain";
      (html.style as any).touchAction = "none";
    } else if (previousBodyStyles.current !== null) {
      body.style.overflow = previousBodyStyles.current.bodyOverflow;
      body.style.position = previousBodyStyles.current.bodyPosition;
      body.style.top = previousBodyStyles.current.bodyTop;
      body.style.width = previousBodyStyles.current.bodyWidth;
      body.style.height = previousBodyStyles.current.bodyHeight;
      (body.style as any).overscrollBehavior =
        previousBodyStyles.current.bodyOverscrollBehavior;
      (body.style as any).touchAction =
        previousBodyStyles.current.bodyTouchAction;

      html.style.overflow = previousBodyStyles.current.htmlOverflow;
      html.style.position = previousBodyStyles.current.htmlPosition;
      html.style.width = previousBodyStyles.current.htmlWidth;
      html.style.height = previousBodyStyles.current.htmlHeight;
      (html.style as any).overscrollBehavior =
        previousBodyStyles.current.htmlOverscrollBehavior;
      (html.style as any).touchAction =
        previousBodyStyles.current.htmlTouchAction;
      window.scrollTo(0, previousBodyStyles.current.scrollY);
      previousBodyStyles.current = null;
    }

    return () => {
      if (previousBodyStyles.current !== null) {
        body.style.overflow = previousBodyStyles.current.bodyOverflow;
        body.style.position = previousBodyStyles.current.bodyPosition;
        body.style.top = previousBodyStyles.current.bodyTop;
        body.style.width = previousBodyStyles.current.bodyWidth;
        body.style.height = previousBodyStyles.current.bodyHeight;
        (body.style as any).overscrollBehavior =
          previousBodyStyles.current.bodyOverscrollBehavior;
        (body.style as any).touchAction =
          previousBodyStyles.current.bodyTouchAction;

        html.style.overflow = previousBodyStyles.current.htmlOverflow;
        html.style.position = previousBodyStyles.current.htmlPosition;
        html.style.width = previousBodyStyles.current.htmlWidth;
        html.style.height = previousBodyStyles.current.htmlHeight;
        (html.style as any).overscrollBehavior =
          previousBodyStyles.current.htmlOverscrollBehavior;
        (html.style as any).touchAction =
          previousBodyStyles.current.htmlTouchAction;
        window.scrollTo(0, previousBodyStyles.current.scrollY);
        previousBodyStyles.current = null;
      }
    };
  }, [enabled, isOpen]);

  const style = useMemo<React.CSSProperties>(() => {
    if (!enabled || !visualViewportMetrics) {
      return {};
    }

    const styleOverrides: React.CSSProperties = {};

    if (visualViewportMetrics.height) {
      (styleOverrides as any)["--cds-aichat-height"] =
        `calc(${visualViewportMetrics.height}px - ${margin}px)`;
    }
    if (visualViewportMetrics.width) {
      (styleOverrides as any)["--cds-aichat-width"] =
        `calc(${visualViewportMetrics.width}px - ${margin}px)`;
    }
    if (visualViewportMetrics.offsetTop) {
      (styleOverrides as any)["--cds-aichat-top-position"] =
        `${visualViewportMetrics.offsetTop}px`;
    }

    return styleOverrides;
  }, [enabled, margin, visualViewportMetrics]);

  return { style };
}

export { useMobileViewportLayout };

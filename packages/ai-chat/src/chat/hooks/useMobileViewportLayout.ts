/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect, useState } from "react";
import type React from "react";
import {
  adoptOnRoot,
  setVarsForSelector,
  clearSelector,
} from "@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js";

interface VisualViewportMetrics {
  width: number;
  height: number;
  offsetTop: number;
}

interface UseMobileViewportLayoutArgs {
  /**
   * Whether mobile-specific enhancements (visual-viewport sizing) are
   * enabled. Typically `IS_PHONE && !disableCustomElementMobileEnhancements`.
   */
  enabled: boolean;
  /**
   * The container element the chat renders into. Used to discover the root
   * (document or shadow root) on which the dynamic stylesheet must be
   * adopted so the CSS variables reach `.cds-aichat--container--render`.
   */
  containerRef: React.RefObject<HTMLElement>;
  /**
   * Optional padding (in px) to subtract from width/height when setting
   * CSS variables.
   */
  margin?: number;
}

const VIEWPORT_SELECTOR = ".cds-aichat--container--render";

/**
 * Sizes the chat to the live visual viewport on mobile Safari by writing
 * `--cds-aichat-{height,width,top-position}` to the chat container via the
 * shared dynamic stylesheet. CSP-safe: no inline-style writes, so a strict
 * CSP can drop `style-src-attr 'unsafe-inline'`.
 *
 * Note: an earlier version of this hook also locked `document.body` and
 * `document.documentElement` scrolling while the chat was open. That was
 * removed because the chat is embedded on third-party host pages and
 * mutating host body styles is brittle (it had to save/restore prior inline
 * styles, which trampled host intent on restore). The chat panel is now
 * responsible for trapping its own scroll/touch via panel-local CSS
 * (overscroll-behavior, touch-action). On iOS Safari edge cases the host
 * page may still scroll behind the chat — accepted in exchange for never
 * touching host body/html state.
 */
function useMobileViewportLayout({
  enabled,
  containerRef,
  margin = 4,
}: UseMobileViewportLayoutArgs): void {
  const [metrics, setMetrics] = useState<VisualViewportMetrics | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setMetrics(null);
      return undefined;
    }

    const visualViewport = window.visualViewport;
    if (!visualViewport) {
      setMetrics(null);
      return undefined;
    }

    const update = () => {
      setMetrics({
        width: visualViewport.width,
        height: visualViewport.height,
        offsetTop: visualViewport.offsetTop ?? 0,
      });
    };

    update();
    visualViewport.addEventListener("resize", update);
    visualViewport.addEventListener("scroll", update);

    return () => {
      visualViewport.removeEventListener("resize", update);
      visualViewport.removeEventListener("scroll", update);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !metrics) {
      clearSelector(VIEWPORT_SELECTOR);
      return undefined;
    }
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    const root = container.getRootNode();
    if (root instanceof Document || root instanceof ShadowRoot) {
      adoptOnRoot(root);
    }

    const vars: Record<string, string> = {};
    if (metrics.height) {
      vars["--cds-aichat-height"] = `calc(${metrics.height}px - ${margin}px)`;
    }
    if (metrics.width) {
      vars["--cds-aichat-width"] = `calc(${metrics.width}px - ${margin}px)`;
    }
    if (metrics.offsetTop) {
      vars["--cds-aichat-top-position"] = `${metrics.offsetTop}px`;
    }
    if (Object.keys(vars).length === 0) {
      clearSelector(VIEWPORT_SELECTOR);
      return undefined;
    }
    setVarsForSelector(VIEWPORT_SELECTOR, vars);

    return () => {
      clearSelector(VIEWPORT_SELECTOR);
    };
  }, [enabled, metrics, margin, containerRef]);
}

export { useMobileViewportLayout };

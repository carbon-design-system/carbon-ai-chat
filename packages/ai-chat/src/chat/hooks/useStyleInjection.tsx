/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect } from "react";
import type React from "react";
import { setVarsForSelector } from "@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js";

let hostFillRuleInstalled = false;

/**
 * Install the "fill the host element" rule on the shared dynamic stylesheet
 * so a strict CSP can drop style-src-attr 'unsafe-inline'.
 */
function ensureHostFillRule(): void {
  if (hostFillRuleInstalled) {
    return;
  }
  setVarsForSelector(".cds-aichat--container-host-fill", {
    height: "100% !important",
    width: "100% !important",
  });
  hostFillRuleInstalled = true;
}

interface UseStyleInjectionProps {
  containerRef: React.RefObject<HTMLDivElement>;
  hostElement?: Element;
  cssVariableOverrideString: string;
  appStyles: string;
  applicationStylesheet: CSSStyleSheet | null;
  cssVariableOverrideStylesheet: CSSStyleSheet | null;
}

/**
 * Custom hook to inject styles into the container, handling both ShadowRoot
 * and regular DOM. Visual-viewport sizing has moved to
 * `useMobileViewportLayout`, which writes directly to the shared dynamic
 * stylesheet.
 */
export function useStyleInjection({
  containerRef,
  hostElement,
  cssVariableOverrideString,
  appStyles,
  applicationStylesheet,
  cssVariableOverrideStylesheet,
}: UseStyleInjectionProps): void {
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Set container dimensions for custom host elements via class + shared
    // dynamic stylesheet so a strict CSP can drop style-src-attr 'unsafe-inline'.
    if (hostElement) {
      ensureHostFillRule();
      containerRef.current.classList.add("cds-aichat--container-host-fill");
    } else {
      containerRef.current.classList.remove("cds-aichat--container-host-fill");
    }

    const rootNode = containerRef.current.getRootNode();
    const cssVariableStyles = cssVariableOverrideString || "";

    if (rootNode instanceof ShadowRoot) {
      // Use Constructable Stylesheets if available
      if (
        applicationStylesheet &&
        "replaceSync" in applicationStylesheet &&
        cssVariableOverrideStylesheet
      ) {
        applicationStylesheet.replaceSync(appStyles);
        cssVariableOverrideStylesheet.replaceSync(cssVariableStyles);
        // Preserve any other sheets already adopted on this root (e.g. the
        // shared dynamic-css-var-sheet used by avatars, iframes, grid cells,
        // etc.). Filter out our own two so re-running this effect doesn't
        // accumulate duplicates.
        const otherSheets = Array.from(rootNode.adoptedStyleSheets).filter(
          (s) =>
            s !== applicationStylesheet && s !== cssVariableOverrideStylesheet,
        );
        rootNode.adoptedStyleSheets = [
          ...otherSheets,
          applicationStylesheet,
          cssVariableOverrideStylesheet,
        ];
      } else {
        // Fallback to style elements
        if (!rootNode.querySelector("style[data-base-styles]")) {
          const baseStyles = document.createElement("style");
          baseStyles.dataset.appStyles = "true";
          baseStyles.textContent = appStyles;
          rootNode.appendChild(baseStyles);
        }
        if (!rootNode.querySelector("style[data-variables-custom]")) {
          const variableCustomStyles = document.createElement("style");
          variableCustomStyles.dataset.overrideStyles = "true";
          variableCustomStyles.textContent = cssVariableStyles;
          rootNode.appendChild(variableCustomStyles);
        }
      }
    }
  }, [
    containerRef,
    hostElement,
    cssVariableOverrideString,
    appStyles,
    applicationStylesheet,
    cssVariableOverrideStylesheet,
  ]);
}

// Made with Bob

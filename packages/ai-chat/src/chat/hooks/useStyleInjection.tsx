/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect } from "react";
import type React from "react";

interface UseStyleInjectionProps {
  containerRef: React.RefObject<HTMLDivElement>;
  hostElement?: Element;
  cssVariableOverrideString: string;
  visualViewportStyles:
    | Record<string, string | number>
    | React.CSSProperties
    | null;
  appStyles: string;
  applicationStylesheet: CSSStyleSheet | null;
  cssVariableOverrideStylesheet: CSSStyleSheet | null;
  visualViewportStylesheet: CSSStyleSheet | null;
}

/**
 * Custom hook to inject styles into the container, handling both ShadowRoot and regular DOM
 */
export function useStyleInjection({
  containerRef,
  hostElement,
  cssVariableOverrideString,
  visualViewportStyles,
  appStyles,
  applicationStylesheet,
  cssVariableOverrideStylesheet,
  visualViewportStylesheet,
}: UseStyleInjectionProps): void {
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Set container dimensions for custom host elements
    if (hostElement) {
      containerRef.current.style.setProperty("height", "100%", "important");
      containerRef.current.style.setProperty("width", "100%", "important");
    }

    const rootNode = containerRef.current.getRootNode();
    const cssVariableStyles = cssVariableOverrideString || "";
    const visualViewportCSS = Object.keys(visualViewportStyles || {}).length
      ? `.cds-aichat--container--render { ${Object.entries(
          visualViewportStyles || {},
        )
          .map(([key, value]) => `${key}: ${value};`)
          .join(" ")} }`
      : "";

    if (rootNode instanceof ShadowRoot) {
      // Use Constructable Stylesheets if available
      if (
        applicationStylesheet &&
        "replaceSync" in applicationStylesheet &&
        cssVariableOverrideStylesheet &&
        visualViewportStylesheet
      ) {
        applicationStylesheet.replaceSync(appStyles);
        cssVariableOverrideStylesheet.replaceSync(cssVariableStyles);
        visualViewportStylesheet.replaceSync(visualViewportCSS);
        rootNode.adoptedStyleSheets = [
          applicationStylesheet,
          cssVariableOverrideStylesheet,
          visualViewportStylesheet,
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
        const viewportStyle = rootNode.querySelector(
          "style[data-visual-viewport-styles]",
        );
        if (viewportStyle) {
          viewportStyle.textContent = visualViewportCSS;
        } else {
          const visualViewportStyle = document.createElement("style");
          visualViewportStyle.dataset.visualViewportStyles = "true";
          visualViewportStyle.textContent = visualViewportCSS;
          rootNode.appendChild(visualViewportStyle);
        }
      }
    } else if (
      visualViewportStyles &&
      Object.keys(visualViewportStyles).length &&
      containerRef.current
    ) {
      // Apply styles directly to the render element in regular DOM
      const renderEl = containerRef.current.querySelector<HTMLElement>(
        ".cds-aichat--container--render",
      );
      if (renderEl) {
        Object.entries(visualViewportStyles).forEach(([key, value]) => {
          renderEl.style.setProperty(key, String(value));
        });
      }
    }
  }, [
    containerRef,
    hostElement,
    cssVariableOverrideString,
    visualViewportStyles,
    appStyles,
    applicationStylesheet,
    cssVariableOverrideStylesheet,
    visualViewportStylesheet,
  ]);
}

// Made with Bob

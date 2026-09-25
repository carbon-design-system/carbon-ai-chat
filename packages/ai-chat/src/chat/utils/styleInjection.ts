/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { setVarsForSelector } from '@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js';

let hostFillRuleInstalled = false;

/**
 * Install the "fill the host element" rule on the shared dynamic stylesheet
 * so a strict CSP can drop style-src-attr 'unsafe-inline'.
 */
function ensureHostFillRule(): void {
  if (hostFillRuleInstalled) {
    return;
  }
  setVarsForSelector('.cds-aichat--container-host-fill', {
    height: '100% !important',
    width: '100% !important',
  });
  hostFillRuleInstalled = true;
}

export interface StyleInjectionOptions {
  container: HTMLElement | null;
  hostElement?: Element;
  cssVariableOverrideString: string;
  appStyles: string;
  applicationStylesheet: CSSStyleSheet | null;
  cssVariableOverrideStylesheet: CSSStyleSheet | null;
}

export function injectStyles({
  container,
  hostElement,
  cssVariableOverrideString,
  appStyles,
  applicationStylesheet,
  cssVariableOverrideStylesheet,
}: StyleInjectionOptions): void {
  if (!container) {
    return;
  }

  // Set container dimensions for custom host elements via class + shared
  // dynamic stylesheet so a strict CSP can drop style-src-attr 'unsafe-inline'.
  if (hostElement) {
    ensureHostFillRule();
    container.classList.add('cds-aichat--container-host-fill');
  } else {
    container.classList.remove('cds-aichat--container-host-fill');
  }

  const rootNode = container.getRootNode();
  const cssVariableStyles = cssVariableOverrideString || '';

  if (rootNode instanceof ShadowRoot) {
    // Use Constructable Stylesheets if available
    if (
      applicationStylesheet &&
      'replaceSync' in applicationStylesheet &&
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
          s !== applicationStylesheet && s !== cssVariableOverrideStylesheet
      );
      rootNode.adoptedStyleSheets = [
        ...otherSheets,
        applicationStylesheet,
        cssVariableOverrideStylesheet,
      ];
    } else {
      // Fallback to style elements
      let baseStyles = rootNode.querySelector<HTMLStyleElement>(
        'style[data-app-styles]'
      );
      if (!baseStyles) {
        baseStyles = document.createElement('style');
        baseStyles.dataset.appStyles = 'true';
        rootNode.appendChild(baseStyles);
      }
      baseStyles.textContent = appStyles;
      let variableCustomStyles = rootNode.querySelector<HTMLStyleElement>(
        'style[data-override-styles]'
      );
      if (!variableCustomStyles) {
        variableCustomStyles = document.createElement('style');
        variableCustomStyles.dataset.overrideStyles = 'true';
        rootNode.appendChild(variableCustomStyles);
      }
      variableCustomStyles.textContent = cssVariableStyles;
    }
  }
}

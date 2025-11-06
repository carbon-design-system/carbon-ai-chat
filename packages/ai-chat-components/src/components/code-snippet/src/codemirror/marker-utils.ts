/*
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @license
 */

import { EditorView } from "@codemirror/view";
import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";
import { getAttributes } from "@carbon/icon-helpers";

/**
 * Configuration options for the Carbon fold marker
 */
export interface CarbonFoldMarkerOptions {
  /**
   * Accessibility label for the collapse action (when block is expanded)
   * @default "Collapse code block"
   */
  collapseLabel?: string;

  /**
   * Accessibility label for the expand action (when block is collapsed)
   * @default "Expand code block"
   */
  expandLabel?: string;
}

/**
 * Creates a Carbon Design System styled fold marker for CodeMirror's foldGutter.
 *
 * This function returns a `markerDOM` function that can be used with CodeMirror's
 * `foldGutter()` extension to display Carbon's chevron icon as fold indicators.
 * The markers include proper accessibility attributes and keyboard support.
 *
 * **Note:** This function only provides the fold marker DOM. You must also include
 * `createCarbonTheme()` to get the proper styling (icon size, rotation, focus states).
 *
 * @example Basic usage
 * ```typescript
 * import { EditorView } from 'codemirror';
 * import { foldGutter } from '@codemirror/view';
 * import { createCarbonTheme } from '@carbon/ai-chat-components/es/globals/codemirror/theme';
 * import { createCarbonFoldMarker } from '@carbon/ai-chat-components/es/globals/codemirror/marker-utils';
 * import { javascript } from '@codemirror/lang-javascript';
 *
 * const editor = new EditorView({
 *   parent: document.body,
 *   extensions: [
 *     createCarbonTheme(),           // Required for styling the fold markers
 *     foldGutter({
 *       markerDOM: createCarbonFoldMarker()
 *     }),
 *     javascript(),
 *   ],
 * });
 * ```
 *
 * @example Custom accessibility labels
 * ```typescript
 * import { foldGutter } from '@codemirror/view';
 * import { createCarbonFoldMarker } from '@carbon/ai-chat-components/es/globals/codemirror/marker-utils';
 *
 * foldGutter({
 *   markerDOM: createCarbonFoldMarker({
 *     collapseLabel: 'Collapse this section',
 *     expandLabel: 'Expand this section',
 *   })
 * })
 * ```
 *
 * @example Keyboard accessibility
 * The fold markers are keyboard accessible by default:
 * - Tab to focus the marker
 * - Enter or Space to toggle fold/unfold
 * - Visual focus indicator matches Carbon Design System
 *
 * To enable keyboard support, you also need to add the keyboard event handler
 * using the `carbonFoldMarkerKeyHandler()` utility:
 * ```typescript
 * import { EditorView } from 'codemirror';
 * import { carbonFoldMarkerKeyHandler } from '@carbon/ai-chat-components/es/globals/codemirror/marker-utils';
 *
 * const editor = new EditorView({
 *   parent: document.body,
 *   extensions: [
 *     // ... other extensions
 *     carbonFoldMarkerKeyHandler(),
 *   ],
 * });
 * ```
 *
 * @param options - Configuration options for labels
 * @returns A markerDOM function for use with foldGutter()
 */
export function createCarbonFoldMarker(
  options: CarbonFoldMarkerOptions = {},
): (open: boolean) => HTMLElement {
  const {
    collapseLabel = "Collapse code block",
    expandLabel = "Expand code block",
  } = options;

  return (open: boolean) => {
    // Manually create SVG to avoid toSVG's attribute issues
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const attrs = getAttributes(ChevronDown16.attrs);

    // Only set attributes that have valid values
    Object.entries(attrs).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== "undefined" &&
        value !== null &&
        String(value) !== "undefined"
      ) {
        svg.setAttribute(key, String(value));
      }
    });

    // Add the path element
    ChevronDown16.content.forEach((item: any) => {
      if (item.elem === "path") {
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        Object.entries(item.attrs).forEach(([key, value]) => {
          path.setAttribute(key, String(value));
        });
        svg.appendChild(path);
      }
    });

    // Accessibility attributes - all styling is in theme.ts for CSP compliance
    svg.setAttribute("role", "button");
    svg.setAttribute("aria-label", open ? collapseLabel : expandLabel);
    svg.setAttribute("aria-expanded", String(open));
    svg.setAttribute("tabindex", "0");

    return svg as unknown as HTMLElement;
  };
}

/**
 * Creates a keyboard event handler for Carbon fold markers.
 *
 * This extension enables keyboard accessibility for fold markers created with
 * `createCarbonFoldMarker()`. It allows users to toggle code folding by pressing
 * Enter or Space when a fold marker is focused.
 *
 * @example Complete setup with keyboard support
 * ```typescript
 * import { EditorView } from 'codemirror';
 * import { foldGutter, lineNumbers } from '@codemirror/view';
 * import { createCarbonTheme } from '@carbon/ai-chat-components/es/globals/codemirror/theme';
 * import {
 *   createCarbonFoldMarker,
 *   carbonFoldMarkerKeyHandler
 * } from '@carbon/ai-chat-components/es/globals/codemirror/marker-utils';
 * import { javascript } from '@codemirror/lang-javascript';
 *
 * const editor = new EditorView({
 *   parent: document.body,
 *   extensions: [
 *     createCarbonTheme(),
 *     lineNumbers(),
 *     foldGutter({
 *       markerDOM: createCarbonFoldMarker()
 *     }),
 *     carbonFoldMarkerKeyHandler(),  // Enable keyboard support
 *     javascript(),
 *   ],
 * });
 * ```
 *
 * @example Keyboard interaction
 * - **Tab**: Focus the fold marker
 * - **Enter** or **Space**: Toggle fold/unfold
 * - **Tab** again: Move to next focusable element
 *
 * @returns CodeMirror extension for keyboard event handling
 */
export function carbonFoldMarkerKeyHandler() {
  return EditorView.domEventHandlers({
    keydown(event, _view) {
      const target = event.target as HTMLElement;
      // Check if the target is a fold gutter marker
      if (
        target.tagName === "svg" &&
        target.getAttribute("role") === "button" &&
        target.hasAttribute("aria-expanded") &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        // Trigger a mouse event to activate CodeMirror's fold handler
        const mouseEvent = new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
        });
        target.dispatchEvent(mouseEvent);
        return true;
      }
      return false;
    },
  });
}

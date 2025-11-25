/*
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @license
 */

import { lineNumbers, drawSelection, keymap } from "@codemirror/view";
import {
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  foldKeymap,
} from "@codemirror/language";
import { defaultKeymap } from "@codemirror/commands";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { Extension } from "@codemirror/state";
import {
  createCarbonFoldMarker,
  carbonFoldMarkerKeyHandler,
} from "./marker-utils.js";
import { createCarbonHighlightStyle } from "./theme.js";

export interface BaseCodeMirrorSetupOptions {
  foldCollapseLabel?: string;
  foldExpandLabel?: string;
}

/**
 * Minimal editor affordances for snippets:
 *  - keep the layout oriented (gutters, folding)
 *  - preserve indentation and basic syntax cues
 *  - avoid heavier behaviors like search, autocomplete, multi-caret history
 */
export function baseCodeMirrorSetup(
  options: BaseCodeMirrorSetupOptions = {},
): Extension {
  const {
    foldCollapseLabel = "Collapse code block",
    foldExpandLabel = "Expand code block",
  } = options;

  return [
    // Line number column for navigation and copy context
    lineNumbers(),
    // Event handler for keyboard accessibility on fold markers
    carbonFoldMarkerKeyHandler(),
    // Folding gutter affordances with Carbon chevron icon
    foldGutter({
      markerDOM: createCarbonFoldMarker({
        collapseLabel: foldCollapseLabel,
        expandLabel: foldExpandLabel,
      }),
    }),
    // Selection rendering that respects multiple carets
    drawSelection(),
    // Maintain indentation on new lines
    indentOnInput(),
    // Fallback syntax highlight style when no language-specific theme exists
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    // Add in Carbon theme
    createCarbonHighlightStyle(),
    // Auto-insert closing brackets and quotes
    closeBrackets(),
    // Bundle the keymaps we still rely on
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...foldKeymap,
      ...lintKeymap,
    ]),
  ];
}

/*
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @license
 */

import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  keymap,
} from "@codemirror/view";
import {
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldKeymap,
} from "@codemirror/language";
import { defaultKeymap } from "@codemirror/commands";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { Extension } from "@codemirror/state";

/**
 * Minimal editor affordances for snippets:
 *  - keep the layout oriented (gutters, folding)
 *  - preserve indentation and basic syntax cues
 *  - avoid heavier behaviors like search, autocomplete, multi-caret history
 */
export const baseSetupWithoutSearch: Extension = [
  // Line number column for navigation and copy context
  lineNumbers(),
  // Subtle gutter highlight for the line that owns the caret
  highlightActiveLineGutter(),
  // Visualize invisible characters (tabs, trailing spaces, etc.)
  highlightSpecialChars(),
  // Folding gutter affordances
  foldGutter(),
  // Selection rendering that respects multiple carets
  drawSelection(),
  // Maintain indentation on new lines
  indentOnInput(),
  // Fallback syntax highlight style when no language-specific theme exists
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  // Highlight matching brackets and braces
  bracketMatching(),
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

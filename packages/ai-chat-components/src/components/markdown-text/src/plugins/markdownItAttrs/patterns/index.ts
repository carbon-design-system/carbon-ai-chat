/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { MarkdownItAttrsOptions, CurlyAttrsPattern } from "../types.js";
import { createFencedCodeBlockPattern } from "./code.js";
import {
  createInlineNesting0Pattern,
  createInlineAttributesPattern,
  createSoftbreakCurlyPattern,
  createEndOfBlockPattern,
} from "./inline.js";
import {
  createTablePattern,
  createTableTheadMetadataPattern,
  createTableTbodyCalculatePattern,
} from "./tables.js";
import {
  createListSoftbreakPattern,
  createListDoubleSoftbreakPattern,
  createListItemEndPattern,
} from "./lists.js";
import { createHorizontalRulePattern } from "./blocks.js";

/**
 * Creates an array of patterns used to detect and transform markdown tokens with attribute syntax.
 */
export function createPatterns(
  options: Required<MarkdownItAttrsOptions>,
): CurlyAttrsPattern[] {
  return [
    // Fenced code blocks: ```js {.highlight}
    createFencedCodeBlockPattern(options),

    // Inline elements with nesting 0: ![alt](img.jpg){.class} or `code`{.class}
    createInlineNesting0Pattern(options),

    // Tables with attributes
    createTablePattern(options),

    // Table header metadata calculation (used for colspan/rowspan)
    createTableTheadMetadataPattern(),

    // Table body calculation for handling colspan/rowspan
    createTableTbodyCalculatePattern(),

    // Inline attributes on emphasized/strong text: **bold**{.class}
    createInlineAttributesPattern(options),

    // List items with attributes after softbreak
    createListSoftbreakPattern(options),

    // Lists with double softbreak before attributes
    createListDoubleSoftbreakPattern(options),

    // List items with attributes at the end
    createListItemEndPattern(options),

    // Softbreak followed by attributes at start of line
    createSoftbreakCurlyPattern(options),

    // Horizontal rules with attributes: --- {.class}
    createHorizontalRulePattern(options),

    // Attributes at the end of a block
    createEndOfBlockPattern(options),
  ];
}

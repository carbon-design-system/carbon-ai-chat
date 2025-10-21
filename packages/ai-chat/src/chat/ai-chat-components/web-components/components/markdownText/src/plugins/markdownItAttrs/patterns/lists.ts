/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { MarkdownItAttrsOptions, CurlyAttrsPattern } from "../types.js";
import {
  getAttrs,
  addAttrs,
  hasDelimiters,
  getMatchingOpeningToken,
} from "../core.js";
import { last } from "../utils.js";

/**
 * Pattern for list items with attributes after softbreak.
 */
export function createListSoftbreakPattern(
  options: Required<MarkdownItAttrsOptions>,
): CurlyAttrsPattern {
  return {
    name: "list softbreak",
    tests: [
      {
        shift: -2,
        type: "list_item_open",
      },
      {
        shift: 0,
        type: "inline",
        children: [
          {
            position: -2,
            type: "softbreak",
          },
          {
            position: -1,
            type: "text",
            content: hasDelimiters("only", options),
          },
        ],
      },
    ],
    transform: (tokens, tokenIndex, childIndex) => {
      if (
        childIndex === null ||
        childIndex === undefined ||
        !tokens[tokenIndex].children
      ) {
        return;
      }
      const children = tokens[tokenIndex].children;
      const token = children[childIndex];
      const content = token.content;
      const attrs = getAttrs(content, 0, options);
      // Find the list open token by walking backwards
      let listOpenIndex = tokenIndex - 2;
      while (
        tokens[listOpenIndex - 1] &&
        tokens[listOpenIndex - 1].type !== "ordered_list_open" &&
        tokens[listOpenIndex - 1].type !== "bullet_list_open"
      ) {
        listOpenIndex--;
      }
      // Apply attributes to the list
      addAttrs(attrs, tokens[listOpenIndex - 1]);
      tokens[tokenIndex].children = children.slice(0, -2);
    },
  };
}

/**
 * Pattern for lists with double softbreak before attributes.
 */
export function createListDoubleSoftbreakPattern(
  options: Required<MarkdownItAttrsOptions>,
): CurlyAttrsPattern {
  return {
    name: "list double softbreak",
    tests: [
      {
        shift: 0,
        type: (str: string) =>
          str === "bullet_list_close" || str === "ordered_list_close",
      },
      {
        shift: 1,
        type: "paragraph_open",
      },
      {
        shift: 2,
        type: "inline",
        content: hasDelimiters("only", options),
        children: (arr: unknown[]) => arr.length === 1,
      },
      {
        shift: 3,
        type: "paragraph_close",
      },
    ],
    transform: (tokens, tokenIndex) => {
      const token = tokens[tokenIndex + 2];
      const content = token.content;
      const attrs = getAttrs(content, 0, options);
      // Find the matching list open token
      const openingToken = getMatchingOpeningToken(tokens, tokenIndex);
      if (!openingToken) {
        return;
      }
      addAttrs(attrs, openingToken);
      // Remove the paragraph containing the attributes
      tokens.splice(tokenIndex + 1, 3);
    },
  };
}

/**
 * Pattern for list items with attributes at the end.
 */
export function createListItemEndPattern(
  options: Required<MarkdownItAttrsOptions>,
): CurlyAttrsPattern {
  return {
    name: "list item end",
    tests: [
      {
        shift: -2,
        type: "list_item_open",
      },
      {
        shift: 0,
        type: "inline",
        children: [
          {
            position: -1,
            type: "text",
            content: hasDelimiters("end", options),
          },
        ],
      },
    ],
    transform: (tokens, tokenIndex, childIndex) => {
      if (
        childIndex === null ||
        childIndex === undefined ||
        !tokens[tokenIndex].children
      ) {
        return;
      }
      const children = tokens[tokenIndex].children;
      const token = children[childIndex];
      const content = token.content;
      // Extract attributes from the end of the content
      const attrs = getAttrs(
        content,
        content.lastIndexOf(options.leftDelimiter),
        options,
      );
      // Apply to list item
      addAttrs(attrs, tokens[tokenIndex - 2]);
      // Remove attributes from content, trimming trailing space if present
      const trimmed = content.slice(
        0,
        content.lastIndexOf(options.leftDelimiter),
      );
      const trimmedChars = trimmed.split("");
      token.content =
        last(trimmedChars) !== " " ? trimmed : trimmed.slice(0, -1);
    },
  };
}

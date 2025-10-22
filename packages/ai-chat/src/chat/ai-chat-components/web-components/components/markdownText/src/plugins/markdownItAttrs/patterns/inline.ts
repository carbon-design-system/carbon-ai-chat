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
 * Pattern for inline elements with nesting level 0 (images, inline code).
 * Example: ![alt](img.jpg){.class} or `code`{.class}
 */
export function createInlineNesting0Pattern(
  options: Required<MarkdownItAttrsOptions>,
): CurlyAttrsPattern {
  return {
    name: "inline nesting 0",
    tests: [
      {
        shift: 0,
        type: "inline",
        children: [
          {
            shift: -1,
            type: (str: string) => str === "image" || str === "code_inline",
          },
          {
            shift: 0,
            type: "text",
            content: hasDelimiters("start", options),
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
      const endChar = token.content.indexOf(options.rightDelimiter);
      const attrToken = children[childIndex - 1];
      const attrs = getAttrs(token.content, 0, options);
      addAttrs(attrs, attrToken);
      if (token.content.length === endChar + options.rightDelimiter.length) {
        children.splice(childIndex, 1);
      } else {
        token.content = token.content.slice(
          endChar + options.rightDelimiter.length,
        );
      }
    },
  };
}

/**
 * Pattern for inline attributes on emphasized/strong text.
 * Example: **bold**{.class}
 */
export function createInlineAttributesPattern(
  options: Required<MarkdownItAttrsOptions>,
): CurlyAttrsPattern {
  return {
    name: "inline attributes",
    tests: [
      {
        shift: 0,
        type: "inline",
        children: [
          {
            shift: -1,
            nesting: -1,
          },
          {
            shift: 0,
            type: "text",
            content: hasDelimiters("start", options),
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
      const openingToken = getMatchingOpeningToken(children, childIndex - 1);
      if (!openingToken) {
        return;
      }
      addAttrs(attrs, openingToken);
      token.content = content.slice(
        content.indexOf(options.rightDelimiter) + options.rightDelimiter.length,
      );
    },
  };
}

/**
 * Pattern for softbreak followed by attributes at start of line.
 */
export function createSoftbreakCurlyPattern(
  options: Required<MarkdownItAttrsOptions>,
): CurlyAttrsPattern {
  return {
    name: "\n{.a} softbreak then curly in start",
    tests: [
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
      const attrs = getAttrs(token.content, 0, options);
      // Find the next closing token
      let closingTokenIndex = tokenIndex + 1;
      while (
        tokens[closingTokenIndex + 1] &&
        tokens[closingTokenIndex + 1].nesting === -1
      ) {
        closingTokenIndex++;
      }
      // Find its matching opening token and apply attributes
      const openingToken = getMatchingOpeningToken(tokens, closingTokenIndex);
      if (!openingToken) {
        return;
      }
      addAttrs(attrs, openingToken);
      // Remove the softbreak and attributes from children
      tokens[tokenIndex].children = children.slice(0, -2);
    },
  };
}

/**
 * Pattern for attributes at the end of a block.
 */
export function createEndOfBlockPattern(
  options: Required<MarkdownItAttrsOptions>,
): CurlyAttrsPattern {
  return {
    name: "end of block",
    tests: [
      {
        shift: 0,
        type: "inline",
        children: [
          {
            position: -1,
            content: hasDelimiters("end", options),
            type: (t: string) => t !== "code_inline" && t !== "math_inline",
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
      // Extract attributes from the end of content
      const attrs = getAttrs(
        content,
        content.lastIndexOf(options.leftDelimiter),
        options,
      );
      // Find the next closing token
      let closingTokenIndex = tokenIndex + 1;
      do {
        if (
          tokens[closingTokenIndex] &&
          tokens[closingTokenIndex].nesting === -1
        ) {
          break;
        }
      } while (closingTokenIndex++ < tokens.length);
      // Find its matching opening token
      const openingToken = getMatchingOpeningToken(tokens, closingTokenIndex);
      if (!openingToken) {
        return;
      }
      addAttrs(attrs, openingToken);
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

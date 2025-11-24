/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/*
 *  This file is based on markdown-it-attrs by Arve Seljebu
 *  Original repository: https://github.com/arve0/markdown-it-attrs
 *
 *  The MIT License (MIT)
 *
 *  Copyright (c) Arve Seljebu <arve.seljebu@gmail.com> (arve0.github.io)
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in all
 *  copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *  SOFTWARE.
 *
 *  ---
 *
 *  This file has been rewritten to be fully ESM-compliant and TypeScript-compatible
 *  for use in Carbon AI Chat.
 */

import type MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import type { MarkdownItAttrsOptions } from "./markdownItAttrs/types.js";
import { test } from "./markdownItAttrs/core.js";
import { createPatterns } from "./markdownItAttrs/patterns/index.js";

const defaultOptions: Required<MarkdownItAttrsOptions> = {
  leftDelimiter: "{",
  rightDelimiter: "}",
  allowedAttributes: [],
};

/**
 * Markdown-it plugin that adds support for applying attributes to markdown elements using curly brace syntax.
 */
export function markdownItAttrs(
  md: MarkdownIt,
  options_?: MarkdownItAttrsOptions,
): void {
  const options: Required<MarkdownItAttrsOptions> = Object.assign(
    {},
    defaultOptions,
    options_,
  );

  // Create an array of pattern matchers that detect and transform different markdown
  // elements with attribute syntax (e.g., {.class #id key=val}). Each pattern defines
  // rules for matching specific token sequences and transforming them by extracting
  // and applying the attributes. Different patterns are needed because attributes appear
  // in different positions for different elements:
  //   - Links: attributes after closing: [text](url){target="_blank"}
  //   - Inline elements: attributes after closing: **bold**{.class}
  //   - Code blocks: attributes at end of info string: ```js{.highlight}
  //   - Tables: attributes in paragraph after table_close
  //   - Lists: attributes on softbreak or at item end
  // Each pattern knows where to look for attributes and which token to apply them to.
  const patterns = createPatterns(options);

  /**
   * Core processing function that walks through all tokens in the markdown document
   * and applies attribute transformations when patterns match.
   */
  function curlyAttrs(state: StateCore): void {
    const tokens = state.tokens;

    // Iterate through each token in the document
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
      // Test each pattern against the current token position
      for (
        let patternIndex = 0;
        patternIndex < patterns.length;
        patternIndex++
      ) {
        const pattern = patterns[patternIndex];
        let childIndex: number | null = null;

        // Check if all tests in the pattern match
        const patternMatches = pattern.tests.every((rule) => {
          const result = test(tokens, tokenIndex, rule);
          if (result.j !== null) {
            childIndex = result.j; // Store child token index if matched within children
          }
          return result.match;
        });

        // If pattern matched, apply the transformation
        if (patternMatches) {
          try {
            pattern.transform(tokens, tokenIndex, childIndex ?? undefined);

            // For inline patterns, re-check the same position since tokens may have changed
            if (
              pattern.name === "inline attributes" ||
              pattern.name === "inline nesting 0"
            ) {
              patternIndex--;
            }
          } catch (error) {
            console.error(
              `markdown-it-attrs: Error in pattern '${pattern.name}': ${(error as Error).message}`,
            );
            console.error((error as Error).stack);
          }
        }
      }
    }
  }

  // Register the curlyAttrs function to run before linkify in the markdown-it processing pipeline
  md.core.ruler.before("linkify", "curly_attributes", curlyAttrs);
}

export default markdownItAttrs;

/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { test } from './markdownItAttrs/core.js';
import { createPatterns } from './markdownItAttrs/patterns/index.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const defaultOptions = {
    leftDelimiter: "{",
    rightDelimiter: "}",
    allowedAttributes: [],
};
/**
 * Markdown-it plugin that adds support for applying attributes to markdown elements using curly brace syntax.
 */
function markdownItAttrs(md, options_) {
    const options = Object.assign({}, defaultOptions, options_);
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
    function curlyAttrs(state) {
        const tokens = state.tokens;
        // Iterate through each token in the document
        for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
            // Test each pattern against the current token position
            for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
                const pattern = patterns[patternIndex];
                let childIndex = null;
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
                        if (pattern.name === "inline attributes" ||
                            pattern.name === "inline nesting 0") {
                            patternIndex--;
                        }
                    }
                    catch (error) {
                        console.error(`markdown-it-attrs: Error in pattern '${pattern.name}': ${error.message}`);
                        console.error(error.stack);
                    }
                }
            }
        }
    }
    // Register the curlyAttrs function to run before linkify in the markdown-it processing pipeline
    md.core.ruler.before("linkify", "curly_attributes", curlyAttrs);
}

export { markdownItAttrs as default, markdownItAttrs };
//# sourceMappingURL=markdown-it-attrs.js.map

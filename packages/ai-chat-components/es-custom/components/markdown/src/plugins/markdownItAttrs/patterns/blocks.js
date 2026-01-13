/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { getAttrs, addAttrs } from '../core.js';
import { escapeRegExp } from '../utils.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
/**
 * Pattern for horizontal rules with attributes.
 * Example: --- {.class}
 */
function createHorizontalRulePattern(options) {
    const __hr = new RegExp("^ {0,3}[-*_]{3,} ?" +
        escapeRegExp(options.leftDelimiter) +
        "[^" +
        escapeRegExp(options.rightDelimiter) +
        "]");
    return {
        name: "horizontal rule",
        tests: [
            {
                shift: 0,
                type: "paragraph_open",
            },
            {
                shift: 1,
                type: "inline",
                children: (arr) => arr.length === 1,
                content: (str) => str.match(__hr) !== null,
            },
            {
                shift: 2,
                type: "paragraph_close",
            },
        ],
        transform: (tokens, tokenIndex) => {
            const token = tokens[tokenIndex];
            token.type = "hr";
            token.tag = "hr";
            token.nesting = 0;
            const content = tokens[tokenIndex + 1].content;
            const attrStart = content.lastIndexOf(options.leftDelimiter);
            const attrs = getAttrs(content, attrStart, options);
            addAttrs(attrs, token);
            token.markup = content;
            tokens.splice(tokenIndex + 1, 2);
        },
    };
}

export { createHorizontalRulePattern };
//# sourceMappingURL=blocks.js.map

/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { hasDelimiters, getAttrs, addAttrs, removeDelimiter } from '../core.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
/**
 * Pattern for fenced code blocks with attributes.
 * Example: ```js {.highlight}
 */
function createFencedCodeBlockPattern(options) {
    return {
        name: "fenced code blocks",
        tests: [
            {
                shift: 0,
                block: true,
                info: hasDelimiters("end", options),
            },
        ],
        transform: (tokens, tokenIndex) => {
            const token = tokens[tokenIndex];
            const attrStart = token.info.lastIndexOf(options.leftDelimiter);
            const attrs = getAttrs(token.info, attrStart, options);
            addAttrs(attrs, token);
            token.info = removeDelimiter(token.info, options);
        },
    };
}

export { createFencedCodeBlockPattern };
//# sourceMappingURL=code.js.map

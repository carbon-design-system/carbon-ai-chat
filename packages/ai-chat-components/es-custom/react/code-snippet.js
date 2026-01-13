/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CDSAIChatCodeSnippet from '../components/code-snippet/src/code-snippet.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const CodeSnippet = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-code-snippet",
    elementClass: CDSAIChatCodeSnippet,
    react: React,
    events: {
        onChange: "content-change",
    },
}));

export { CodeSnippet as default };
//# sourceMappingURL=code-snippet.js.map

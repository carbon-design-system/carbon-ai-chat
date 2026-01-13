/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CDSAIChatCodeSnippetCard from '../components/code-snippet/src/code-snippet-card.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const CodeSnippetCard = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-code-snippet-card",
    elementClass: CDSAIChatCodeSnippetCard,
    react: React,
    events: {
        onChange: "content-change",
    },
}));

export { CodeSnippetCard as default };
//# sourceMappingURL=code-snippet-card.js.map

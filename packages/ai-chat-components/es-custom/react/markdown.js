/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CDSAIChatMarkdown from '../components/markdown/src/markdown.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const Markdown = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-markdown",
    elementClass: CDSAIChatMarkdown,
    react: React,
}));

export { Markdown as default };
//# sourceMappingURL=markdown.js.map

/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import { CDSAIChatToolCallData } from '../components/chain-of-thought/src/tool-call-data.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const ToolCallData = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-tool-call-data",
    elementClass: CDSAIChatToolCallData,
    react: React,
}));

export { ToolCallData as default };
//# sourceMappingURL=tool-call-data.js.map

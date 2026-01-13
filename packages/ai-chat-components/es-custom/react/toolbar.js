/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CDSAIChatToolbar from '../components/toolbar/src/toolbar.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const Toolbar = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-toolbar",
    elementClass: CDSAIChatToolbar,
    react: React,
}));

export { Toolbar as default };
//# sourceMappingURL=toolbar.js.map

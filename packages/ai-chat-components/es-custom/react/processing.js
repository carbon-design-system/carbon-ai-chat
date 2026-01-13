/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CDSAIChatProcessing from '../components/processing/src/processing.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const Processing = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-processing",
    elementClass: CDSAIChatProcessing,
    react: React,
}));

export { Processing as default };
//# sourceMappingURL=processing.js.map

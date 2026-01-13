/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CDSAIChatReasoningSteps from '../components/reasoning-steps/src/reasoning-steps.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const ReasoningSteps = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-reasoning-steps",
    elementClass: CDSAIChatReasoningSteps,
    react: React,
}));

export { ReasoningSteps as default };
//# sourceMappingURL=reasoning-steps.js.map

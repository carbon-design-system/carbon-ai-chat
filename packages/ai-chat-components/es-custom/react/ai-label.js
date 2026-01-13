/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CarbonAILabelElement from '@carbon/web-components/es-custom/components/ai-label/ai-label.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const AILabel = withWebComponentBridge(createComponent({
    tagName: "cds-custom-ai-label",
    elementClass: CarbonAILabelElement,
    react: React,
}));

export { AILabel as default };
//# sourceMappingURL=ai-label.js.map

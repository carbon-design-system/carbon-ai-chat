/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CarbonTagElement from '@carbon/web-components/es-custom/components/tag/tag.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const Tag = withWebComponentBridge(createComponent({
    tagName: "cds-custom-tag",
    elementClass: CarbonTagElement,
    react: React,
}));

export { Tag as default };
//# sourceMappingURL=tag.js.map

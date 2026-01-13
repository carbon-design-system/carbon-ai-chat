/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CarbonIconButtonElement from '@carbon/web-components/es-custom/components/icon-button/icon-button.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const IconButton = withWebComponentBridge(createComponent({
    tagName: "cds-custom-icon-button",
    elementClass: CarbonIconButtonElement,
    react: React,
}));

export { IconButton as default };
//# sourceMappingURL=icon-button.js.map

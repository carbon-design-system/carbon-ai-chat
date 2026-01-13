/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CDSIcon from '@carbon/web-components/es-custom/components/icon/icon.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const Icon = withWebComponentBridge(createComponent({
    tagName: "cds-custom-icon",
    elementClass: CDSIcon,
    react: React,
}));

export { Icon as default };
//# sourceMappingURL=icon.js.map

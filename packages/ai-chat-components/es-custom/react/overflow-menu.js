/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CarbonOverflowMenuElement from '@carbon/web-components/es-custom/components/overflow-menu/overflow-menu.js';
import CarbonOverflowMenuBodyElement from '@carbon/web-components/es-custom/components/overflow-menu/overflow-menu-body.js';
import CarbonOverflowMenuItemElement from '@carbon/web-components/es-custom/components/overflow-menu/overflow-menu-item.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const OverflowMenu = withWebComponentBridge(createComponent({
    tagName: "cds-custom-overflow-menu",
    elementClass: CarbonOverflowMenuElement,
    react: React,
}));
const OverflowMenuBody = withWebComponentBridge(createComponent({
    tagName: "cds-custom-overflow-menu-body",
    elementClass: CarbonOverflowMenuBodyElement,
    react: React,
}));
const OverflowMenuItem = withWebComponentBridge(createComponent({
    tagName: "cds-custom-overflow-menu-item",
    elementClass: CarbonOverflowMenuItemElement,
    react: React,
}));

export { OverflowMenu, OverflowMenuBody, OverflowMenuItem, OverflowMenu as default };
//# sourceMappingURL=overflow-menu.js.map

/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CarbonContentSwitcherElement from '@carbon/web-components/es-custom/components/content-switcher/content-switcher.js';
import CarbonContentSwitcherItemElement from '@carbon/web-components/es-custom/components/content-switcher/content-switcher-item.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const ContentSwitcher = withWebComponentBridge(createComponent({
    tagName: "cds-custom-content-switcher",
    elementClass: CarbonContentSwitcherElement,
    react: React,
    events: {
        onSelected: "cds-custom-content-switcher-selected",
    },
}));
const ContentSwitcherItem = withWebComponentBridge(createComponent({
    tagName: "cds-custom-content-switcher-item",
    elementClass: CarbonContentSwitcherItemElement,
    react: React,
}));

export { ContentSwitcher, ContentSwitcherItem, ContentSwitcher as default };
//# sourceMappingURL=content-switcher.js.map

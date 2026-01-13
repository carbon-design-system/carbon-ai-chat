/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CarbonInlineNotificationElement from '@carbon/web-components/es-custom/components/notification/inline-notification.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const InlineNotification = withWebComponentBridge(createComponent({
    tagName: "cds-custom-inline-notification",
    elementClass: CarbonInlineNotificationElement,
    react: React,
}));

export { InlineNotification as default };
//# sourceMappingURL=inline-notification.js.map

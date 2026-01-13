/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CDSAIChatFeedbackButtons from '../components/feedback/src/feedback-buttons.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const FeedbackButtons = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-feedback-buttons",
    elementClass: CDSAIChatFeedbackButtons,
    react: React,
    events: {
        onClick: "feedback-buttons-click",
    },
}));

export { FeedbackButtons as default };
//# sourceMappingURL=feedback-buttons.js.map

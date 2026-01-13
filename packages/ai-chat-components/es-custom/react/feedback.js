/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CDSAIChatFeedbackElement from '../components/feedback/src/feedback.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const Feedback = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-feedback",
    elementClass: CDSAIChatFeedbackElement,
    react: React,
    events: {
        onClose: "feedback-close",
        onSubmit: "feedback-submit",
    },
}));

export { Feedback as default };
//# sourceMappingURL=feedback.js.map

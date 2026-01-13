/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import CDSAIChatCard from '../components/card/src/card.js';
import CDSAIChatCardFooter from '../components/card/src/card-footer.js';
import CDSAIChatCardSteps from '../components/card/src/card-steps.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const Card = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-card",
    elementClass: CDSAIChatCard,
    react: React,
}));
const CardFooter = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-card-footer",
    elementClass: CDSAIChatCardFooter,
    react: React,
    events: {
        onFooterAction: "cds-aichat-card-footer-action",
    },
}));
const CardSteps = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-card-steps",
    elementClass: CDSAIChatCardSteps,
    react: React,
}));

export { Card, CardFooter, CardSteps, Card as default };
//# sourceMappingURL=card.js.map

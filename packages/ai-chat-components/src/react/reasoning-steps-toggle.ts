/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from '@lit/react';
import React from 'react';

import { CDSAIChatReasoningStepsToggle } from '../components/aichat-reasoning-steps/index.js';
import { type ReasoningStepsToggleEventDetail } from '../components/aichat-reasoning-steps/aichat-reasoning-steps-toggle.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const ReasoningStepsToggle = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatReasoningStepsToggle.is,
    elementClass: CDSAIChatReasoningStepsToggle,
    react: React,
    events: {
      onToggle: 'reasoning-steps-toggle',
    },
  })
);

export type { ReasoningStepsToggleEventDetail };
export default ReasoningStepsToggle;

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent, type EventName } from '@lit/react';
import React from 'react';

import { CDSAIChatReasoningSteps } from '../components/aichat-reasoning-steps/index.js';
import type { ReasoningStepsToggleEventDetail } from '../components/aichat-reasoning-steps/index.js';

const ReasoningSteps = createComponent({
  tagName: CDSAIChatReasoningSteps.is,
  elementClass: CDSAIChatReasoningSteps,
  react: React,
  events: {
    onAnimationStart: 'reasoning-animation-start' as EventName<
      CustomEvent<ReasoningStepsToggleEventDetail>
    >,
    onAnimationEnd: 'reasoning-animation-end' as EventName<
      CustomEvent<ReasoningStepsToggleEventDetail>
    >,
  },
});

export default ReasoningSteps;

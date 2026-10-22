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

import { CDSAIChatReasoningStep } from '../components/aichat-reasoning-steps/index.js';
import type { ReasoningStepToggleEventDetail } from '../components/aichat-reasoning-steps/index.js';

const ReasoningStep = createComponent({
  tagName: CDSAIChatReasoningStep.is,
  elementClass: CDSAIChatReasoningStep,
  react: React,
  events: {
    onBeforeToggle: 'reasoning-step-beingtoggled' as EventName<
      CustomEvent<ReasoningStepToggleEventDetail>
    >,
    onToggle: 'reasoning-step-toggled' as EventName<
      CustomEvent<ReasoningStepToggleEventDetail>
    >,
    onAnimationEnd: 'reasoning-animation-end' as EventName<
      CustomEvent<ReasoningStepToggleEventDetail>
    >,
  },
});

export default ReasoningStep;

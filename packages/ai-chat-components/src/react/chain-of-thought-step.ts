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

import { CDSAIChatChainOfThoughtStep } from '../components/aichat-chain-of-thought/index.js';
import type { ChainOfThoughtStepToggleEventDetail } from '../components/aichat-chain-of-thought/index.js';

const ChainOfThoughtStep = createComponent({
  tagName: CDSAIChatChainOfThoughtStep.is,
  elementClass: CDSAIChatChainOfThoughtStep,
  react: React,
  events: {
    onBeforeToggle: 'chain-of-thought-step-beingtoggled' as EventName<
      CustomEvent<ChainOfThoughtStepToggleEventDetail>
    >,
    onToggle: 'chain-of-thought-step-toggled' as EventName<
      CustomEvent<ChainOfThoughtStepToggleEventDetail>
    >,
  },
});

export default ChainOfThoughtStep;

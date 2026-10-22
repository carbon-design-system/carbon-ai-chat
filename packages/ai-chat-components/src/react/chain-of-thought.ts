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

import { CDSAIChatChainOfThought } from '../components/aichat-chain-of-thought/index.js';
import {
  type ChainOfThoughtOnToggle,
  ChainOfThoughtStepStatus,
  type ChainOfThoughtStepToggleEventDetail,
  type ChainOfThoughtToggleEventDetail,
} from '../components/aichat-chain-of-thought/defs.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const ChainOfThought = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatChainOfThought.is,
    elementClass: CDSAIChatChainOfThought,
    react: React,
    events: {
      onToggle: 'chain-of-thought-toggled',
      onStepToggle: 'chain-of-thought-step-toggled',
    },
  })
);

export type {
  ChainOfThoughtOnToggle,
  ChainOfThoughtStepToggleEventDetail,
  ChainOfThoughtToggleEventDetail,
};
export { ChainOfThoughtStepStatus };
export default ChainOfThought;

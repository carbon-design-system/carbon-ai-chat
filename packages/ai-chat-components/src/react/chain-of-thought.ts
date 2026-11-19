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

import { CDSAIChatChainOfThought } from '../components/aichat-chain-of-thought/index.js';
import {
  type ChainOfThoughtOnToggle,
  ChainOfThoughtStepStatus,
  type ChainOfThoughtStepToggleEventDetail,
  type ChainOfThoughtToggleEventDetail,
} from '../components/aichat-chain-of-thought/defs.js';

const BaseChainOfThought = createComponent({
  tagName: CDSAIChatChainOfThought.is,
  elementClass: CDSAIChatChainOfThought,
  react: React,
  events: {
    onToggle: 'chain-of-thought-toggled' as EventName<
      CustomEvent<ChainOfThoughtToggleEventDetail>
    >,
    onStepToggle: 'chain-of-thought-step-toggled' as EventName<
      CustomEvent<ChainOfThoughtStepToggleEventDetail>
    >,
  },
});

export interface ChainOfThoughtProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseChainOfThought>,
  'onToggle' | 'onStepToggle'
> {
  onToggle?: (event: CustomEvent<ChainOfThoughtToggleEventDetail>) => void;
  onStepToggle?: (
    event: CustomEvent<ChainOfThoughtStepToggleEventDetail>
  ) => void;
}

// Lit 1.0.8 intersects event callbacks with same-named element properties.
// Its runtime event map takes precedence; only these two prop types need repair.
const ChainOfThought = BaseChainOfThought as React.ForwardRefExoticComponent<
  ChainOfThoughtProps & React.RefAttributes<CDSAIChatChainOfThought>
>;

export type {
  ChainOfThoughtOnToggle,
  ChainOfThoughtStepToggleEventDetail,
  ChainOfThoughtToggleEventDetail,
};
export { ChainOfThoughtStepStatus };
export default ChainOfThought;

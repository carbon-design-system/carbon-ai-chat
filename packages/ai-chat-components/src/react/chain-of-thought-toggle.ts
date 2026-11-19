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

import { CDSAIChatChainOfThoughtToggle } from '../components/aichat-chain-of-thought/index.js';
import { type ChainOfThoughtToggleEventDetail } from '../components/aichat-chain-of-thought/defs.js';

const ChainOfThoughtToggle = createComponent({
  tagName: CDSAIChatChainOfThoughtToggle.is,
  elementClass: CDSAIChatChainOfThoughtToggle,
  react: React,
  events: {
    onToggle: 'chain-of-thought-toggle' as EventName<
      CustomEvent<ChainOfThoughtToggleEventDetail>
    >,
  },
});

export type { ChainOfThoughtToggleEventDetail };
export default ChainOfThoughtToggle;

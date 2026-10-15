/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineCustomElement } from '../../globals/register.js';
import CDSAIChatChainOfThoughtStep from './aichat-chain-of-thought-step.js';
import CDSAIChatChainOfThoughtToggle from './aichat-chain-of-thought-toggle.js';
import CDSAIChatChainOfThought from './aichat-chain-of-thought.js';
import CDSAIChatToolCallData from './aichat-tool-call-data.js';

export { default } from './aichat-chain-of-thought.js';
export { CDSAIChatChainOfThought } from './aichat-chain-of-thought.js';
export { CDSAIChatChainOfThoughtToggle } from './aichat-chain-of-thought-toggle.js';
export {
  type ChainOfThoughtOnToggle,
  ChainOfThoughtStepStatus,
  type ChainOfThoughtStepToggleEventDetail,
  type ChainOfThoughtToggleEventDetail,
} from './defs.js';
export { CDSAIChatChainOfThoughtStep } from './aichat-chain-of-thought-step.js';
export { CDSAIChatToolCallData } from './aichat-tool-call-data.js';

defineCustomElement(CDSAIChatChainOfThoughtStep);
defineCustomElement(CDSAIChatChainOfThoughtToggle);
defineCustomElement(CDSAIChatChainOfThought);
defineCustomElement(CDSAIChatToolCallData);

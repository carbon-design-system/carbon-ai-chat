/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineCustomElement } from '../../globals/register.js';
import CDSAIChatReasoningStepsToggle from './aichat-reasoning-steps-toggle.js';
import CDSAIChatReasoningSteps from './aichat-reasoning-steps.js';
import CDSAIChatReasoningStep from './aichat-reasoning-step.js';

export {
  CDSAIChatReasoningStepsToggle,
  type ReasoningStepsToggleEventDetail,
} from './aichat-reasoning-steps-toggle.js';

export { CDSAIChatReasoningSteps, CDSAIChatReasoningStep };

defineCustomElement(CDSAIChatReasoningStepsToggle);
defineCustomElement(CDSAIChatReasoningSteps);
defineCustomElement(CDSAIChatReasoningStep);

export type { ReasoningStepToggleEventDetail } from './aichat-reasoning-step.js';

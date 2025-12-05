/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { carbonElement } from "../../../globals/decorators/index.js";
import { reasoningStepsToggleTemplate } from "./reasoning-steps-toggle.template.js";
import { ReasoningStepsToggleElement } from "./reasoning-steps-toggle.js";

const REASONING_STEPS_TOGGLE_COMPONENT_TAG_NAME =
  "cds-aichat-reasoning-steps-toggle";

/**
 * Toggle control for expanding or collapsing reasoning steps.
 */
@carbonElement("cds-aichat-reasoning-steps-toggle")
class CDSAIChatReasoningStepsToggle extends ReasoningStepsToggleElement {
  render() {
    return reasoningStepsToggleTemplate(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [REASONING_STEPS_TOGGLE_COMPONENT_TAG_NAME]: CDSAIChatReasoningStepsToggle;
  }
}

export { REASONING_STEPS_TOGGLE_COMPONENT_TAG_NAME };
export default CDSAIChatReasoningStepsToggle;

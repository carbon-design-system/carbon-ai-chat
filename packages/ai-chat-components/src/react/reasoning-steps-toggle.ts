/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";

import CDSAIChatReasoningStepsToggle from "../components/reasoning-steps/src/reasoning-steps-toggle.js";
import { type ReasoningStepsToggleEventDetail } from "../components/reasoning-steps/src/reasoning-steps-toggle.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const ReasoningStepsToggle = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-reasoning-steps-toggle",
    elementClass: CDSAIChatReasoningStepsToggle,
    react: React,
    events: {
      onToggle: "reasoning-steps-toggle",
    },
  }),
);

export type { ReasoningStepsToggleEventDetail };
export default ReasoningStepsToggle;

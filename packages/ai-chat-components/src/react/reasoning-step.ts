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

import CDSAIChatReasoningStep from "../components/reasoning-steps/src/reasoning-step.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const ReasoningStep = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-reasoning-step",
    elementClass: CDSAIChatReasoningStep,
    react: React,
    events: {
      onBeforeToggle: "cds-aichat-reasoning-step-beingtoggled",
      onToggle: "cds-aichat-reasoning-step-toggled",
    },
  }),
);

export default ReasoningStep;

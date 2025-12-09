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

import CDSAIChatChainOfThought from "../components/chain-of-thought/src/chain-of-thought.js";
import {
  type ChainOfThoughtOnToggle,
  ChainOfThoughtStepStatus,
  type ChainOfThoughtStepToggleEventDetail,
  type ChainOfThoughtToggleEventDetail,
} from "../components/chain-of-thought/defs.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const ChainOfThought = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-chain-of-thought",
    elementClass: CDSAIChatChainOfThought,
    react: React,
    events: {
      onToggle: "chain-of-thought-toggled",
      onStepToggle: "chain-of-thought-step-toggled",
    },
  }),
);

export type {
  ChainOfThoughtOnToggle,
  ChainOfThoughtStepToggleEventDetail,
  ChainOfThoughtToggleEventDetail,
};
export { ChainOfThoughtStepStatus };
export default ChainOfThought;

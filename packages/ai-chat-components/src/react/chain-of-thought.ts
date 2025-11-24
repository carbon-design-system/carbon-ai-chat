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

import CDSChatChainOfThoughtElement from "../components/chain-of-thought/src/cds-aichat-chain-of-thought.js";
import {
  type ChainOfThoughtOnToggle,
  type ChainOfThoughtStep,
  ChainOfThoughtStepStatus,
} from "../components/chain-of-thought/src/types.js";

const ChainOfThought = createComponent({
  tagName: "cds-aichat-chain-of-thought",
  elementClass: CDSChatChainOfThoughtElement,
  react: React,
});

export type { ChainOfThoughtOnToggle, ChainOfThoughtStep };
export { ChainOfThoughtStepStatus };
export default ChainOfThought;

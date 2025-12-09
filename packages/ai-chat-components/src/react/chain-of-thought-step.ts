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

import { CDSAIChatChainOfThoughtStep } from "../components/chain-of-thought/src/chain-of-thought-step.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const ChainOfThoughtStep = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-chain-of-thought-step",
    elementClass: CDSAIChatChainOfThoughtStep,
    react: React,
    events: {
      onBeforeToggle: "chain-of-thought-step-beingtoggled",
      onToggle: "chain-of-thought-step-toggled",
    },
  }),
);

export default ChainOfThoughtStep;

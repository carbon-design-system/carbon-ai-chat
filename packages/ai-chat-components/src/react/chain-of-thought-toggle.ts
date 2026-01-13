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

import CDSAIChatChainOfThoughtToggle from "../components/chain-of-thought/src/chain-of-thought-toggle.js";
import { type ChainOfThoughtToggleEventDetail } from "../components/chain-of-thought/defs.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const ChainOfThoughtToggle = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-chain-of-thought-toggle",
    elementClass: CDSAIChatChainOfThoughtToggle,
    react: React,
    events: {
      onToggle: "chain-of-thought-toggle",
    },
  }),
);

export type { ChainOfThoughtToggleEventDetail };
export default ChainOfThoughtToggle;

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

import CDSChatChainOfThoughtElement, {
  CHAIN_OF_THOUGHT_COMPONENT_TAG_NAME,
} from "../../../web-components/components/chainOfThought/cds-aichat-chain-of-thought";

const ChainOfThought = createComponent({
  tagName: CHAIN_OF_THOUGHT_COMPONENT_TAG_NAME,
  elementClass: CDSChatChainOfThoughtElement,
  react: React,
});

export { ChainOfThought };

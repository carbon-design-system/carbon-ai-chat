/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { carbonElement } from "../../../globals/decorators/index.js";
import { ChainOfThoughtElement } from "./chain-of-thought.js";
import { chainOfThoughtElementTemplate } from "./chain-of-thought.template.js";

const CHAIN_OF_THOUGHT_COMPONENT_TAG_NAME = "cds-aichat-chain-of-thought";

/**
 * Custom element wrapper that wires the template to the base element implementation.
 */
@carbonElement(CHAIN_OF_THOUGHT_COMPONENT_TAG_NAME)
class CDSChatChainOfThoughtElement extends ChainOfThoughtElement {
  render() {
    return chainOfThoughtElementTemplate(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [CHAIN_OF_THOUGHT_COMPONENT_TAG_NAME]: CDSChatChainOfThoughtElement;
  }
}

export { CHAIN_OF_THOUGHT_COMPONENT_TAG_NAME };
export default CDSChatChainOfThoughtElement;

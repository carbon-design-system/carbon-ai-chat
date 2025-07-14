/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { carbonElement } from "../../decorators/customElement";
import { ChainOfThoughtElement } from "./src/ChainOfThoughtElement";
import { chainOfThoughtElementTemplate } from "./src/chainOfThoughtElement.template";

const CHAIN_OF_THOUGHT_COMPONENT_TAG_NAME = `cds-aichat-chain-of-thought`;

/**
 * This class is used to display two feedback buttons (thumbs up and thumbs down).
 */
@carbonElement(CHAIN_OF_THOUGHT_COMPONENT_TAG_NAME)
class CDSChatChainOfThoughtElement extends ChainOfThoughtElement {
  /**
   * Renders the template while passing in class functionality.
   */
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

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { carbonElement } from "@carbon/ai-chat-components/es/globals/decorators/index.js";
import { stopStreamingButtonTemplate } from "./src/stopStreamingButton.template";
import { StopStreamingButtonElement } from "./src/StopStreamingButtonElement";

/**
 * Constructed class functionality for the stop streaming button.
 */
@carbonElement("cds-aichat-stop-streaming-button")
class CDSAIChatStopStreamingButtonElement extends StopStreamingButtonElement {
  render() {
    return stopStreamingButtonTemplate(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-stop-streaming-button": CDSAIChatStopStreamingButtonElement;
  }
}

export default CDSAIChatStopStreamingButtonElement;

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

const STOP_STREAMING_BUTTON_TAG_NAME = "cds-aichat-stop-streaming-button";

/**
 * Constructed class functionality for the stop streaming button.
 */
@carbonElement(STOP_STREAMING_BUTTON_TAG_NAME)
class CDSChatStopStreamingButtonElement extends StopStreamingButtonElement {
  render() {
    return stopStreamingButtonTemplate(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-stop-streaming-button": CDSChatStopStreamingButtonElement;
  }
}

export default CDSChatStopStreamingButtonElement;

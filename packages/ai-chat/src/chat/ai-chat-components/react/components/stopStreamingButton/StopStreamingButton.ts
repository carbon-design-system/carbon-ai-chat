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

import CDSChatStopStreamingButtonElement from "../../../web-components/components/stopStreamingButton/cds-aichat-stop-streaming-button";

const StopStreamingButton = createComponent({
  tagName: "cds-aichat-stop-streaming-button",
  elementClass: CDSChatStopStreamingButtonElement,
  react: React,
});

export { StopStreamingButton };

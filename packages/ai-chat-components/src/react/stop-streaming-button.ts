/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from "@lit/react";
import React from "react";
import StopStreamingButton from "../components/input/src/stop-streaming-button.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const CDSAIChatStopStreamingButton = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-stop-streaming-button",
    elementClass: StopStreamingButton,
    react: React,
  }),
);

export default CDSAIChatStopStreamingButton;

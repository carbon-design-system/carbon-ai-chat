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
import InputSendControlElement from "../components/input/src/send-control.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const CDSAIChatInputSendControl = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-input-send-control",
    elementClass: InputSendControlElement,
    react: React,
    events: {
      onSend: "cds-aichat-input-send",
      onStopStreaming: "cds-aichat-input-stop-streaming",
    },
  }),
);

export default CDSAIChatInputSendControl;

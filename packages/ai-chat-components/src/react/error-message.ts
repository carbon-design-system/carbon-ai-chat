/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from "@lit/react";
import React from "react";
import ErrorMessage from "../components/input/src/error-message.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const CDSAIChatErrorMessage = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-error-message",
    elementClass: ErrorMessage,
    react: React,
  }),
);

export default CDSAIChatErrorMessage;

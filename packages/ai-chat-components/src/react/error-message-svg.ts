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

import CDSAIChatErrorMessageSVG from "../components/error-message-svg/src/error-message-svg.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const ErrorMessageSVG = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-error-message-svg",
    elementClass: CDSAIChatErrorMessageSVG,
    react: React,
  }),
);

export default ErrorMessageSVG;

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

import CDSChatFeedbackButtonsElement from "../components/feedback-buttons/src/cds-aichat-feedback-buttons.js";

const FeedbackButtons = createComponent({
  tagName: "cds-aichat-feedback-buttons",
  elementClass: CDSChatFeedbackButtonsElement,
  react: React,
});

export default FeedbackButtons;

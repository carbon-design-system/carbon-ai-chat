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

import CDSChatFeedbackElement from "../components/feedback/src/cds-aichat-feedback.js";
import {
  type FeedbackInitialValues,
  type FeedbackSubmitDetails,
} from "../components/feedback/src/FeedbackElement.js";

const Feedback = createComponent({
  tagName: "cds-aichat-feedback",
  elementClass: CDSChatFeedbackElement,
  react: React,
});

export type { FeedbackInitialValues, FeedbackSubmitDetails };
export default Feedback;

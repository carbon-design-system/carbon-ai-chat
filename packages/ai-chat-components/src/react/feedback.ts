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

import CDSAIChatFeedbackElement from "../components/feedback/src/feedback.js";
import {
  type FeedbackInitialValues,
  type FeedbackSubmitDetails,
} from "../components/feedback/src/feedback.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge";

const Feedback = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-feedback",
    elementClass: CDSAIChatFeedbackElement,
    react: React,
    events: {
      onClose: "feedback-close",
      onSubmit: "feedback-submit",
    },
  }),
);

export type { FeedbackInitialValues, FeedbackSubmitDetails };
export default Feedback;

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

import CDSChatFeedbackElement, {
  FEEDBACK_COMPONENT_TAG_NAME,
} from "../../../web-components/components/feedbackElement/cds-aichat-feedback";
import { FeedbackSubmitDetails } from "../../../web-components/components/feedbackElement/src/FeedbackElement";

const FeedbackComponent = createComponent({
  tagName: FEEDBACK_COMPONENT_TAG_NAME,
  elementClass: CDSChatFeedbackElement,
  react: React,
});

export { FeedbackComponent, FeedbackSubmitDetails };

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

import CDSChatFeedbackButtonsElement, {
  FEEDBACK_BUTTONS_COMPONENT_TAG_NAME,
} from "../../../web-components/components/feedbackButtonsElement/cds-aichat-feedback-buttons";

const FeedbackButtonsComponent = createComponent({
  tagName: FEEDBACK_BUTTONS_COMPONENT_TAG_NAME,
  elementClass: CDSChatFeedbackButtonsElement,
  react: React,
});

export { FeedbackButtonsComponent };

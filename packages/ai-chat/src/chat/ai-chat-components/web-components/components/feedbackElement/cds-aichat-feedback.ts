/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../tagListElement/cds-aichat-tag-list";
import "../roundedButton/cds-aichat-rounded-button";

import { carbonElement } from "@carbon/ai-chat-components/es/globals/decorators/index.js";
import { FeedbackElement } from "./src/FeedbackElement";
import { feedbackElementTemplate } from "./src/feedbackElement.template";

const FEEDBACK_COMPONENT_TAG_NAME = `cds-aichat-feedback`;

/**
 * Constructed class functionality for the test input custom element
 */
@carbonElement(FEEDBACK_COMPONENT_TAG_NAME)
class CDSChatFeedbackElement extends FeedbackElement {
  /**
   * Renders the template while passing in class functionality.
   */
  render() {
    return feedbackElementTemplate(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-feedback": CDSChatFeedbackElement;
  }
}

export { FEEDBACK_COMPONENT_TAG_NAME };
export default CDSChatFeedbackElement;

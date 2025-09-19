/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { carbonElement } from "../../decorators/customElement";
import { FeedbackButtonsElement } from "./src/FeedbackButtonsElement";
import { feedbackButtonsElementTemplate } from "./src/feedbackButtonsElement.template";

const FEEDBACK_BUTTONS_COMPONENT_TAG_NAME = `cds-aichat-feedback-buttons`;

/**
 * This class is used to display two feedback buttons (thumbs up and thumbs down).
 */
@carbonElement(FEEDBACK_BUTTONS_COMPONENT_TAG_NAME)
class CDSChatFeedbackButtonsElement extends FeedbackButtonsElement {
  /**
   * Renders the template while passing in class functionality.
   */
  render() {
    return feedbackButtonsElementTemplate(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-feedback-buttons": CDSChatFeedbackButtonsElement;
  }
}

export { FEEDBACK_BUTTONS_COMPONENT_TAG_NAME };
export default CDSChatFeedbackButtonsElement;

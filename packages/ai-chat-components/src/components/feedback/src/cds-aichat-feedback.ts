/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { carbonElement } from "../../../globals/decorators/index.js";
import { FeedbackElement } from "./feedback.js";
import { feedbackElementTemplate } from "./feedback.template.js";

const FEEDBACK_COMPONENT_TAG_NAME = "cds-aichat-feedback";

/**
 * Custom element for rendering the feedback surface.
 */
@carbonElement(FEEDBACK_COMPONENT_TAG_NAME)
class CDSChatFeedbackElement extends FeedbackElement {
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

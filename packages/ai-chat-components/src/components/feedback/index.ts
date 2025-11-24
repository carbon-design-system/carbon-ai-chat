/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./src/cds-aichat-feedback.js";
import "./src/cds-aichat-feedback-buttons.js";

export { default } from "./src/cds-aichat-feedback.js";
export {
  FEEDBACK_COMPONENT_TAG_NAME,
  default as CDSChatFeedbackElement,
} from "./src/cds-aichat-feedback.js";
export {
  default as CDSChatFeedbackButtonsElement,
  FEEDBACK_BUTTONS_COMPONENT_TAG_NAME,
} from "./src/cds-aichat-feedback-buttons.js";
export {
  FeedbackElement,
  type FeedbackInitialValues,
  type FeedbackSubmitDetails,
} from "./src/feedback.js";
export {
  FeedbackButtonsElement,
  type FeedbackButtonsClickEventDetail,
} from "./src/feedback-buttons.js";

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineCustomElement } from '../../globals/register.js';
import '../aichat-markdown/index.js';
import CDSAIChatFeedback from './aichat-feedback.js';
import CDSAIChatFeedbackButtons from './aichat-feedback-buttons.js';

export {
  CDSAIChatFeedback,
  type FeedbackInitialValues,
  type FeedbackSubmitDetails,
} from './aichat-feedback.js';
export {
  CDSAIChatFeedbackButtons,
  type FeedbackButtonsClickEventDetail,
} from './aichat-feedback-buttons.js';

defineCustomElement(CDSAIChatFeedback);
defineCustomElement(CDSAIChatFeedbackButtons);

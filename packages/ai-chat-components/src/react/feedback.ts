/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from '@lit/react';
import React from 'react';

import { CDSAIChatFeedback as CDSAIChatFeedbackElement } from '../components/aichat-feedback/index.js';
import {
  type FeedbackInitialValues,
  type FeedbackSubmitDetails,
} from '../components/aichat-feedback/aichat-feedback.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const Feedback = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatFeedbackElement.is,
    elementClass: CDSAIChatFeedbackElement,
    react: React,
    events: {
      onClose: 'feedback-close',
      onSubmit: 'feedback-submit',
    },
  })
);

export type { FeedbackInitialValues, FeedbackSubmitDetails };
export default Feedback;

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent, type EventName } from '@lit/react';
import React from 'react';

import { CDSAIChatFeedbackButtons } from '../components/aichat-feedback/index.js';
import type { FeedbackButtonsClickEventDetail } from '../components/aichat-feedback/index.js';

const FeedbackButtons = createComponent({
  tagName: CDSAIChatFeedbackButtons.is,
  elementClass: CDSAIChatFeedbackButtons,
  react: React,
  events: {
    onClick: 'feedback-buttons-click' as EventName<
      CustomEvent<FeedbackButtonsClickEventDetail>
    >,
  },
});

export default FeedbackButtons;

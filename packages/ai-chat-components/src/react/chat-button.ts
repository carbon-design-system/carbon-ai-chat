/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';

import { CDSAIChatButton as AIChatButton } from '../components/aichat-button/index.js';
import {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_TYPE,
  CHAT_BUTTON_SIZE,
  CHAT_BUTTON_TOOLTIP_ALIGNMENT,
  CHAT_BUTTON_TOOLTIP_POSITION,
} from '../components/aichat-button/aichat-button.js';

const ChatButton = createComponent({
  tagName: AIChatButton.is,
  elementClass: AIChatButton,
  react: React,
});

export default ChatButton;
export {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_TYPE,
  CHAT_BUTTON_SIZE,
  CHAT_BUTTON_TOOLTIP_ALIGNMENT,
  CHAT_BUTTON_TOOLTIP_POSITION,
};

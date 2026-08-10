/**
 * @license
 *
 * Copyright IBM Corp. 2026, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';
import CDSAIChatButtonSkeleton from '../components/chat-button/src/chat-button-skeleton.js';
import { CHAT_BUTTON_SIZE } from '../components/chat-button/src/chat-button.js';

const ChatButtonSkeleton = withWebComponentBridge(
  createComponent({
    tagName: 'cds-aichat-button-skeleton',
    elementClass: CDSAIChatButtonSkeleton,
    react: React,
  })
);

export default ChatButtonSkeleton;
export { CHAT_BUTTON_SIZE };

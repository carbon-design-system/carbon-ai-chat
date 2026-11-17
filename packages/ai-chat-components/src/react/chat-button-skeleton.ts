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
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';
import { CDSAIChatButtonSkeleton } from '../components/aichat-button/index.js';

const ChatButtonSkeleton = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatButtonSkeleton.is,
    elementClass: CDSAIChatButtonSkeleton,
    react: React,
  })
);

export default ChatButtonSkeleton;

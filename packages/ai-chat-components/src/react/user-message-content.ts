/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from '@lit/react';
import React from 'react';
import prefix from '../globals/settings.js';
import CDSAIChatUserMessageContent from '../components/user-message-content/src/user-message-content.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const UserMessageContent = withWebComponentBridge(
  createComponent({
    tagName: `${prefix}-user-message-content`,
    elementClass: CDSAIChatUserMessageContent,
    react: React,
  })
);

export default UserMessageContent;

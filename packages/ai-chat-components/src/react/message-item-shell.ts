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
import CDSAIChatMessageItemShell from '../components/message-item-shell/src/message-item-shell.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const MessageItemShell = withWebComponentBridge(
  createComponent({
    tagName: `${prefix}-message-item-shell`,
    elementClass: CDSAIChatMessageItemShell,
    react: React,
    events: {},
  })
);

export default MessageItemShell;

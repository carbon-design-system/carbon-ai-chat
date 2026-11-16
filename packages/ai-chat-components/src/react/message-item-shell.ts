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
import { CDSAIChatMessageItemShell } from '../components/aichat-message-item-shell/index.js';

const MessageItemShell = createComponent({
  tagName: CDSAIChatMessageItemShell.is,
  elementClass: CDSAIChatMessageItemShell,
  react: React,
  events: {},
});

export default MessageItemShell;

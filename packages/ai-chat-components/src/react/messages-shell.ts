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
import CDSAIChatMessagesShell from '../components/messages-shell/src/messages-shell.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const MessagesShell = withWebComponentBridge(
  createComponent({
    tagName: 'cds-aichat-messages-shell',
    elementClass: CDSAIChatMessagesShell,
    react: React,
    events: {
      onScroll: 'cds-aichat-messages-shell-scroll',
    },
  })
);

export default MessagesShell;
